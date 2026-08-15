const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// All product routes require authentication
router.use(requireAuth);

// Normalize DB row to JS product object
function formatProduct(row) {
  return {
    id: String(row.id),
    name: row.name,
    barcode: row.barcode,
    category: row.category || 'General',
    size: row.size || '',
    color: row.color || '',
    image: row.image || '',
    purchasePrice: Number(row.purchase_price || 0),
    sellingPrice: Number(row.selling_price || 0),
    price: Number(row.selling_price || 0),
    stock: Number(row.stock_quantity || 0),
    stockQuantity: Number(row.stock_quantity || 0),
    lowStockThreshold: Number(row.low_stock_threshold || 5),
    description: row.description || '',
    totalSold: Number(row.total_sold || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// SQL query helper with total_sold subquery
const SELECT_PRODUCTS_WITH_SOLD = `
  SELECT 
    p.*,
    COALESCE((SELECT SUM(quantity) FROM sale_items WHERE product_id = p.id), 0) AS total_sold
  FROM products p
`;

// GET /api/products/search?q=
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      const [rows] = await pool.query(`${SELECT_PRODUCTS_WITH_SOLD} ORDER BY p.id DESC`);
      return res.json({ success: true, data: rows.map(formatProduct) });
    }

    const searchTerm = `%${q}%`;
    const [rows] = await pool.query(
      `${SELECT_PRODUCTS_WITH_SOLD} WHERE p.name LIKE ? OR p.barcode LIKE ? OR p.category LIKE ? OR p.size LIKE ? OR p.color LIKE ? ORDER BY p.id DESC`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );

    res.json({ success: true, data: rows.map(formatProduct) });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/barcode/:barcode
router.get('/barcode/:barcode', async (req, res, next) => {
  try {
    const barcode = req.params.barcode.trim();
    const [rows] = await pool.query(`${SELECT_PRODUCTS_WITH_SOLD} WHERE p.barcode = ? LIMIT 1`, [barcode]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: formatProduct(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${SELECT_PRODUCTS_WITH_SOLD} ORDER BY p.id DESC`);
    res.json({ success: true, data: rows.map(formatProduct) });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`${SELECT_PRODUCTS_WITH_SOLD} WHERE p.id = ?`, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: formatProduct(rows[0]) });
  } catch (error) {
    next(error);
  }
});

// POST /api/products (Manager Only)
router.post('/', requireRole('manager'), async (req, res, next) => {
  try {
    const {
      name,
      barcode,
      category,
      size,
      color,
      image,
      purchase_price,
      purchasePrice,
      selling_price,
      sellingPrice,
      price,
      stock_quantity,
      stockQuantity,
      stock,
      low_stock_threshold,
      lowStockThreshold,
      description,
    } = req.body;

    const trimmedName = (name || '').trim();
    const trimmedBarcode = (barcode || '').trim();

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }
    if (!trimmedBarcode) {
      return res.status(400).json({ success: false, message: 'Barcode is required' });
    }

    const finalSellingPrice = Number(selling_price ?? sellingPrice ?? price ?? 0);
    const finalPurchasePrice = Number(purchase_price ?? purchasePrice ?? 0);
    const finalStock = Number(stock_quantity ?? stockQuantity ?? stock ?? 0);
    const finalThreshold = Number(low_stock_threshold ?? lowStockThreshold ?? 5);

    if (finalSellingPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Selling price must be greater than 0' });
    }
    if (finalStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock quantity cannot be negative' });
    }

    // Check duplicate barcode
    const [existing] = await pool.query('SELECT id FROM products WHERE barcode = ?', [trimmedBarcode]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Barcode already exists' });
    }

    const [result] = await pool.query(
      `INSERT INTO products 
       (name, barcode, category, size, color, image, purchase_price, selling_price, stock_quantity, low_stock_threshold, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trimmedName,
        trimmedBarcode,
        (category || 'General').trim(),
        (size || '').trim(),
        (color || '').trim(),
        (image || '').trim(),
        finalPurchasePrice,
        finalSellingPrice,
        finalStock,
        finalThreshold,
        (description || '').trim(),
      ]
    );

    const newId = result.insertId;

    // Log stock history if initial stock > 0
    if (finalStock > 0) {
      await pool.query(
        `INSERT INTO stock_history 
         (product_id, change_type, quantity, previous_stock, new_stock, reference_id) 
         VALUES (?, 'INITIAL', ?, 0, ?, NULL)`,
        [newId, finalStock, finalStock]
      );
    }

    const [newRows] = await pool.query(`${SELECT_PRODUCTS_WITH_SOLD} WHERE p.id = ?`, [newId]);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: formatProduct(newRows[0]),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id/history
router.get('/:id/history', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM stock_history WHERE product_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/products/:id/restock (Manager Only)
router.post('/:id/restock', requireRole('manager'), async (req, res, next) => {
  try {
    const { addQuantity, reason } = req.body;
    const qtyToAdd = Number(addQuantity || 0);

    if (qtyToAdd <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
    }

    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = rows[0];
    const prevStock = Number(product.stock_quantity || 0);
    const newStock = prevStock + qtyToAdd;

    await pool.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, product.id]);

    await pool.query(
      `INSERT INTO stock_history 
       (product_id, change_type, quantity, previous_stock, new_stock, reference_id) 
       VALUES (?, 'RESTOCK', ?, ?, ?, NULL)`,
      [product.id, qtyToAdd, prevStock, newStock]
    );

    const [updatedRows] = await pool.query(`${SELECT_PRODUCTS_WITH_SOLD} WHERE p.id = ?`, [product.id]);
    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: formatProduct(updatedRows[0]),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id (Manager Only)
router.put('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    const {
      name,
      category,
      size,
      color,
      image,
      purchase_price,
      purchasePrice,
      selling_price,
      sellingPrice,
      price,
      stock_quantity,
      stockQuantity,
      stock,
      low_stock_threshold,
      lowStockThreshold,
      description,
    } = req.body;

    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const current = rows[0];
    const finalSellingPrice = Number(selling_price ?? sellingPrice ?? price ?? current.selling_price);
    const finalPurchasePrice = Number(purchase_price ?? purchasePrice ?? current.purchase_price);
    const finalThreshold = Number(low_stock_threshold ?? lowStockThreshold ?? current.low_stock_threshold);
    const updatedStock = Number(stock_quantity ?? stockQuantity ?? stock ?? current.stock_quantity);

    if (finalSellingPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Selling price must be greater than 0' });
    }
    if (updatedStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock cannot be negative' });
    }

    // Log stock history if manual stock adjustment occurred
    if (updatedStock !== Number(current.stock_quantity)) {
      const diff = updatedStock - Number(current.stock_quantity);
      await pool.query(
        `INSERT INTO stock_history 
         (product_id, change_type, quantity, previous_stock, new_stock, reference_id) 
         VALUES (?, 'ADJUSTMENT', ?, ?, ?, NULL)`,
        [current.id, diff, current.stock_quantity, updatedStock]
      );
    }

    await pool.query(
      `UPDATE products 
       SET name = ?, category = ?, size = ?, color = ?, image = ?, purchase_price = ?, selling_price = ?, stock_quantity = ?, low_stock_threshold = ?, description = ? 
       WHERE id = ?`,
      [
        (name || current.name).trim(),
        (category || current.category).trim(),
        (size !== undefined ? size : (current.size || '')).trim(),
        (color !== undefined ? color : (current.color || '')).trim(),
        (image !== undefined ? image : (current.image || '')).trim(),
        finalPurchasePrice,
        finalSellingPrice,
        updatedStock,
        finalThreshold,
        (description ?? current.description ?? '').trim(),
        current.id,
      ]
    );

    const [updatedRows] = await pool.query(`${SELECT_PRODUCTS_WITH_SOLD} WHERE p.id = ?`, [current.id]);
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: formatProduct(updatedRows[0]),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id (Manager Only)
router.delete('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
