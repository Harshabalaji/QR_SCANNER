const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// All sales routes require authentication
router.use(requireAuth);

/**
 * Generate unique invoice number (e.g. INV-000001)
 */
async function generateInvoiceNumber(connection) {
  const [rows] = await connection.query('SELECT COUNT(*) as count FROM sales');
  const count = Number(rows[0].count || 0) + 1;
  return `INV-${String(count).padStart(6, '0')}`;
}

// POST /api/sales — Create Sale with ACID Transaction
router.post('/', async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { items, cart, paymentMethod, payment_method, discount, tax, cashReceived, cash_received } = req.body;
    const rawItems = items || cart || [];

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const selectedPaymentMethod = (paymentMethod || payment_method || 'CASH').toUpperCase();
    if (!['CASH', 'UPI', 'CARD'].includes(selectedPaymentMethod)) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Invalid payment method. Allowed: CASH, UPI, CARD' });
    }

    const discountAmount = Math.max(0, Number(discount || 0));
    const taxAmount = Math.max(0, Number(tax || 0));

    // CRITICAL SECURITY RULE: Cashier identity MUST be taken from the authenticated session (req.user), NOT trusted from client!
    const cashierId = req.user.id;
    const cashierName = req.user.name;

    // Start Transaction
    await connection.beginTransaction();

    let computedSubtotal = 0;
    const validatedItems = [];

    // Step 1: Lock product rows & validate stock
    for (const item of rawItems) {
      const prodId = item.productId || item.product_id || item.id;
      const requestedQty = Number(item.quantity || item.qty || 0);

      if (!prodId || requestedQty <= 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Invalid item product ID or quantity',
        });
      }

      // SELECT FOR UPDATE to lock row against concurrent sales
      const [productRows] = await connection.query(
        'SELECT * FROM products WHERE id = ? FOR UPDATE',
        [prodId]
      );

      if (productRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: `Product ID ${prodId} not found in inventory`,
        });
      }

      const product = productRows[0];
      const currentStock = Number(product.stock_quantity || 0);

      if (requestedQty > currentStock) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Requested: ${requestedQty}, Available: ${currentStock}`,
          available: currentStock,
          productName: product.name,
        });
      }

      // Authoritative DB price
      const unitPrice = Number(product.selling_price || 0);
      const itemTotal = unitPrice * requestedQty;
      computedSubtotal += itemTotal;

      validatedItems.push({
        product,
        size: item.size || product.size || '',
        color: item.color || product.color || '',
        quantity: requestedQty,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    const totalAmount = Math.max(0, computedSubtotal - discountAmount + taxAmount);
    const invoiceNumber = await generateInvoiceNumber(connection);

    let cashReceivedVal = null;
    let changeAmountVal = null;

    if (selectedPaymentMethod === 'CASH') {
      cashReceivedVal = Number(cashReceived ?? cash_received ?? 0);
      if (cashReceivedVal < totalAmount) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Insufficient cash received. Total: ₹${totalAmount.toLocaleString('en-IN')}, Received: ₹${cashReceivedVal.toLocaleString('en-IN')}`,
        });
      }
      changeAmountVal = cashReceivedVal - totalAmount;
    }

    // Step 2: Insert into sales
    const [saleResult] = await connection.query(
      `INSERT INTO sales 
       (invoice_number, cashier_id, cashier_name, subtotal, discount, tax, total_amount, payment_method, payment_status, cash_received, change_amount) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [
        invoiceNumber,
        cashierId,
        cashierName,
        computedSubtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        selectedPaymentMethod,
        cashReceivedVal,
        changeAmountVal,
      ]
    );

    const saleId = saleResult.insertId;

    // Step 3: Insert sale_items & Update products stock
    for (const vItem of validatedItems) {
      const p = vItem.product;

      await connection.query(
        `INSERT INTO sale_items 
         (sale_id, product_id, product_name, barcode, size, color, quantity, unit_price, total_price) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          p.id,
          p.name,
          p.barcode,
          vItem.size,
          vItem.color,
          vItem.quantity,
          vItem.unitPrice,
          vItem.totalPrice,
        ]
      );

      const prevStock = Number(p.stock_quantity || 0);
      const newStock = prevStock - vItem.quantity;

      // Update product stock
      await connection.query(
        `UPDATE products SET stock_quantity = ? WHERE id = ?`,
        [newStock, p.id]
      );

      // Record in stock_history (reference_id is INT saleId)
      await connection.query(
        `INSERT INTO stock_history 
         (product_id, change_type, quantity, previous_stock, new_stock, reference_id) 
         VALUES (?, 'SALE', ?, ?, ?, ?)`,
        [p.id, -vItem.quantity, prevStock, newStock, saleId]
      );
    }

    // Step 4: Commit Transaction
    await connection.commit();
    connection.release();

    // Fetch newly created sale details
    const [newSaleRows] = await pool.query('SELECT * FROM sales WHERE id = ?', [saleId]);
    const [newSaleItems] = await pool.query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

    const formattedSale = {
      id: String(newSaleRows[0].id),
      invoiceNumber: newSaleRows[0].invoice_number,
      cashierId: newSaleRows[0].cashier_id,
      cashierName: newSaleRows[0].cashier_name || 'Staff',
      subtotal: Number(newSaleRows[0].subtotal || 0),
      discount: Number(newSaleRows[0].discount || 0),
      tax: Number(newSaleRows[0].tax || 0),
      totalAmount: Number(newSaleRows[0].total_amount || 0),
      paymentMethod: newSaleRows[0].payment_method,
      paymentStatus: newSaleRows[0].payment_status || 'paid',
      cashReceived: newSaleRows[0].cash_received != null ? Number(newSaleRows[0].cash_received) : null,
      changeAmount: newSaleRows[0].change_amount != null ? Number(newSaleRows[0].change_amount) : null,
      createdAt: newSaleRows[0].created_at,
      items: newSaleItems.map(item => ({
        id: String(item.id),
        productId: String(item.product_id),
        productName: item.product_name,
        barcode: item.barcode,
        size: item.size || '',
        color: item.color || '',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
      })),
    };

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: formattedSale,
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    next(error);
  }
});

// GET /api/sales — Get all sales (supports cashier_id, payment_method, startDate, endDate filters)
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, cashier_id, payment_method, limit = 100 } = req.query;

    let sql = 'SELECT * FROM sales WHERE 1=1';
    const params = [];

    if (cashier_id) {
      sql += ' AND cashier_id = ?';
      params.push(cashier_id);
    }
    if (payment_method) {
      sql += ' AND UPPER(payment_method) = ?';
      params.push(String(payment_method).toUpperCase());
    }
    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(`${endDate} 23:59:59`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [salesRows] = await pool.query(sql, params);

    const formattedSales = [];
    for (const sale of salesRows) {
      const [items] = await pool.query('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
      formattedSales.push({
        id: String(sale.id),
        invoiceNumber: sale.invoice_number,
        cashierId: sale.cashier_id,
        cashierName: sale.cashier_name || 'Staff',
        subtotal: Number(sale.subtotal || 0),
        discount: Number(sale.discount || 0),
        tax: Number(sale.tax || 0),
        totalAmount: Number(sale.total_amount || 0),
        paymentMethod: sale.payment_method,
        paymentStatus: sale.payment_status || 'paid',
        cashReceived: sale.cash_received != null ? Number(sale.cash_received) : null,
        changeAmount: sale.change_amount != null ? Number(sale.change_amount) : null,
        createdAt: sale.created_at,
        items: items.map(i => ({
          id: String(i.id),
          productId: String(i.product_id),
          productName: i.product_name,
          barcode: i.barcode,
          size: i.size || '',
          color: i.color || '',
          quantity: Number(i.quantity),
          unitPrice: Number(i.unit_price),
          totalPrice: Number(i.total_price),
        })),
      });
    }

    res.json({ success: true, data: formattedSales });
  } catch (error) {
    next(error);
  }
});

// GET /api/sales/:id — Get sale invoice detail
router.get('/:id', async (req, res, next) => {
  try {
    const [salesRows] = await pool.query('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    if (salesRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    const sale = salesRows[0];
    const [items] = await pool.query('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);

    res.json({
      success: true,
      data: {
        id: String(sale.id),
        invoiceNumber: sale.invoice_number,
        cashierId: sale.cashier_id,
        cashierName: sale.cashier_name || 'Staff',
        subtotal: Number(sale.subtotal || 0),
        discount: Number(sale.discount || 0),
        tax: Number(sale.tax || 0),
        totalAmount: Number(sale.total_amount || 0),
        paymentMethod: sale.payment_method,
        paymentStatus: sale.payment_status || 'paid',
        cashReceived: sale.cash_received != null ? Number(sale.cash_received) : null,
        changeAmount: sale.change_amount != null ? Number(sale.change_amount) : null,
        createdAt: sale.created_at,
        items: items.map(i => ({
          id: String(i.id),
          productId: String(i.product_id),
          productName: i.product_name,
          barcode: i.barcode,
          size: i.size || '',
          color: i.color || '',
          quantity: Number(i.quantity),
          unitPrice: Number(i.unit_price),
          totalPrice: Number(i.total_price),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
