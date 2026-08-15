const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// Dashboard endpoints are strictly for Manager role
router.use(requireAuth, requireRole('manager'));

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    // 1. Products metrics
    const [prodStats] = await pool.query(`
      SELECT 
        COUNT(*) AS totalProducts,
        SUM(CASE WHEN stock_quantity <= low_stock_threshold AND stock_quantity > 0 THEN 1 ELSE 0 END) AS lowStockProducts,
        SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) AS outOfStockProducts,
        COALESCE(SUM(stock_quantity * selling_price), 0) AS totalInventoryValue
      FROM products
    `);

    // 2. Sales metrics (lifetime)
    const [salesStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS totalSales
      FROM sales
    `);

    // 3. Products sold (lifetime)
    const [soldStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(quantity), 0) AS totalProductsSold
      FROM sale_items
    `);

    // 4. Today's metrics (using CURDATE() or UTC/Local date range)
    const todayStr = new Date().toISOString().split('T')[0];

    const [todaySales] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS todaysSales FROM sales WHERE DATE(created_at) = CURDATE() OR created_at >= ?`,
      [`${todayStr} 00:00:00`]
    );

    const [todaySold] = await pool.query(
      `SELECT COALESCE(SUM(si.quantity), 0) AS todaysProductsSold 
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) = CURDATE() OR s.created_at >= ?`,
      [`${todayStr} 00:00:00`]
    );

    const data = {
      totalProducts: Number(prodStats[0].totalProducts || 0),
      lowStockProducts: Number(prodStats[0].lowStockProducts || 0),
      outOfStockProducts: Number(prodStats[0].outOfStockProducts || 0),
      totalInventoryValue: Number(prodStats[0].totalInventoryValue || 0),
      totalSales: Number(salesStats[0].totalSales || 0),
      totalProductsSold: Number(soldStats[0].totalProductsSold || 0),
      todaysSales: Number(todaySales[0].todaysSales || 0),
      todaysProductsSold: Number(todaySold[0].todaysProductsSold || 0),
    };

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/sales-overview — Sales period breakdown
router.get('/sales-overview', async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Today
    const [todayRows] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales WHERE DATE(created_at) = ?`,
      [todayStr]
    );

    // This week (last 7 days)
    const [weekRows] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    // This month (last 30 days)
    const [monthRows] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    res.json({
      success: true,
      data: {
        today: Number(todayRows[0].total || 0),
        thisWeek: Number(weekRows[0].total || 0),
        thisMonth: Number(monthRows[0].total || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/top-products — Top selling products
router.get('/top-products', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        product_id AS productId,
        product_name AS productName,
        barcode,
        SUM(quantity) AS totalSold,
        SUM(total_price) AS totalRevenue
      FROM sale_items
      GROUP BY product_id, product_name, barcode
      ORDER BY totalSold DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: rows.map(r => ({
        productId: String(r.productId),
        productName: r.productName,
        barcode: r.barcode,
        totalSold: Number(r.totalSold || 0),
        totalRevenue: Number(r.totalRevenue || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/cashier-stats — Today's Sales breakdown by Cashier
router.get('/cashier-stats', async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const [rows] = await pool.query(
      `SELECT 
         COALESCE(cashier_name, 'Staff') AS cashierName,
         COUNT(*) AS saleCount,
         COALESCE(SUM(total_amount), 0) AS totalRevenue
       FROM sales
       WHERE DATE(created_at) = CURDATE() OR created_at >= ?
       GROUP BY cashier_name
       ORDER BY totalRevenue DESC`,
      [`${todayStr} 00:00:00`]
    );

    res.json({
      success: true,
      data: rows.map(r => ({
        cashierName: r.cashierName,
        saleCount: Number(r.saleCount || 0),
        totalRevenue: Number(r.totalRevenue || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/payment-stats — Today's Payment Breakdown by Method (CASH, UPI, CARD)
router.get('/payment-stats', async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const [rows] = await pool.query(
      `SELECT 
         UPPER(payment_method) AS method,
         COALESCE(SUM(total_amount), 0) AS totalAmount,
         COUNT(*) AS count
       FROM sales
       WHERE DATE(created_at) = CURDATE() OR created_at >= ?
       GROUP BY UPPER(payment_method)`,
      [`${todayStr} 00:00:00`]
    );

    let cash = 0;
    let upi = 0;
    let card = 0;

    for (const r of rows) {
      if (r.method === 'CASH') cash += Number(r.totalAmount || 0);
      else if (r.method === 'UPI') upi += Number(r.totalAmount || 0);
      else if (r.method === 'CARD') card += Number(r.totalAmount || 0);
    }

    const total = cash + upi + card;

    res.json({
      success: true,
      data: {
        cash,
        upi,
        card,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
