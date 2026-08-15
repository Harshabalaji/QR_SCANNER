import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  TrendingUp,
  CircleAlert,
  ShoppingBag,
  RefreshCw,
  ArrowUpRight,
  Package,
  IndianRupee,
} from 'lucide-react-native';
import { useStore, Product } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius, shadows } from '../theme/theme';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import ReceiptModal from '../components/ReceiptModal';
import { api } from '../services/api';

export default function Dashboard() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isWide = width >= 600;
  const {
    isDarkMode,
    user,
    getDashboardStats,
    inventory,
    sales,
    refreshProducts,
    refreshSales,
    fetchDashboardStats,
  } = useStore();
  const theme = isDarkMode ? darkColors : colors;
  const stats = getDashboardStats();

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [cashierStats, setCashierStats] = useState<any[]>([]);
  const [paymentStats, setPaymentStats] = useState<{ cash: number; upi: number; card: number; total: number }>({ cash: 0, upi: 0, card: 0, total: 0 });
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Quick Restock State
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [restockLoading, setRestockLoading] = useState(false);

  useEffect(() => {
    fetchTopProducts();
    fetchCashierStats();
    fetchPaymentStats();
  }, []);

  const fetchTopProducts = async () => {
    const res = await api.getTopProducts();
    if (res.success && res.data) setTopProducts(res.data);
  };

  const fetchCashierStats = async () => {
    const res = await api.getCashierStats();
    if (res.success && res.data) setCashierStats(res.data);
  };

  const fetchPaymentStats = async () => {
    const res = await api.getPaymentStats();
    if (res.success && res.data) setPaymentStats(res.data);
  };

  const handleRefresh = async () => {
    await refreshProducts();
    await refreshSales();
    await fetchDashboardStats();
    await fetchTopProducts();
    await fetchCashierStats();
    await fetchPaymentStats();
  };

  const handleQuickRestock = async () => {
    if (!restockProduct) return;
    const addQty = Number(restockQty || 0);
    if (addQty <= 0) return;
    setRestockLoading(true);
    await api.restockProduct(restockProduct.id, addQty, 'QUICK_DASHBOARD_RESTOCK');
    await handleRefresh();
    setRestockLoading(false);
    setRestockProduct(null);
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const todayDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const lowStockItems   = inventory.filter((p) => p.stock <= (p.lowStockThreshold ?? 5));
  const recentSalesList = sales.slice(0, 5);

  const acc = theme.accent; // dusty rose

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Header ── */}
      <View style={[styles.heroHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.heroLeft}>
          <Text style={[styles.heroEyebrow, { color: acc }]}>
            NP_BRANDING
          </Text>
          <Text style={[styles.heroTitle, { color: theme.primary }]}>
            STORE{'\n'}OVERVIEW
          </Text>
          <Text style={[styles.heroDate, { color: theme.textSecondary }]}>
            {todayDateStr}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { borderColor: theme.border }]}
          onPress={handleRefresh}
        >
          <RefreshCw color={theme.textSecondary} size={16} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      {/* ── KPI Grid ── */}
      <View style={styles.kpiGrid}>
        {/* Hero Revenue Card */}
        <TouchableOpacity
          style={[styles.kpiHero, { backgroundColor: theme.primary }, shadows.medium]}
          onPress={() => navigation.navigate('HistoryTabs')}
          activeOpacity={0.88}
        >
          <View style={styles.kpiHeroTop}>
            <Text style={styles.kpiHeroLabel}>TODAY'S REVENUE</Text>
            <View style={styles.trendPill}>
              <ArrowUpRight color="#FFFFFF" size={12} strokeWidth={2} />
              <Text style={styles.trendText}>+8.4%</Text>
            </View>
          </View>
          <Text style={styles.kpiHeroValue}>{formatCurrency(stats.todaysSales)}</Text>
          <Text style={styles.kpiHeroSub}>
            {stats.todaysItemsSold} {stats.todaysItemsSold === 1 ? 'unit' : 'units'} sold today
          </Text>
          {/* Dusty rose accent line at bottom */}
          <View style={styles.kpiHeroAccentLine} />
        </TouchableOpacity>

        {/* Secondary KPI row */}
        <View style={[styles.kpiRow, isWide && styles.kpiRowWide]}>
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate('HistoryTabs')}
          >
            <Text style={[styles.kpiCardLabel, { color: theme.textSecondary }]}>
              UNITS SOLD
            </Text>
            <Text style={[styles.kpiCardValue, { color: theme.primary }]}>
              {stats.totalSold}
            </Text>
            <Package color={theme.textSecondary} size={16} strokeWidth={1.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.navigate('Inventory')}
          >
            <Text style={[styles.kpiCardLabel, { color: theme.textSecondary }]}>
              PRODUCTS
            </Text>
            <Text style={[styles.kpiCardValue, { color: theme.primary }]}>
              {stats.totalProducts}
            </Text>
            <ShoppingBag color={theme.textSecondary} size={16} strokeWidth={1.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.kpiCard,
              {
                backgroundColor: theme.surface,
                borderColor:
                  stats.lowStockCount > 0 ? theme.warning + '60' : theme.border,
              },
            ]}
            onPress={() => navigation.navigate('Inventory')}
          >
            <Text style={[styles.kpiCardLabel, { color: theme.textSecondary }]}>
              LOW STOCK
            </Text>
            <Text
              style={[
                styles.kpiCardValue,
                { color: stats.lowStockCount > 0 ? theme.warning : theme.primary },
              ]}
            >
              {stats.lowStockCount}
            </Text>
            <CircleAlert
              color={stats.lowStockCount > 0 ? theme.warning : theme.textSecondary}
              size={16}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sales Performance ── */}
      <View style={[styles.section, { borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: acc }]}>ANALYTICS</Text>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Sales Performance</Text>
          </View>
          {/* Period tabs */}
          <View style={[styles.periodTabs, { borderColor: theme.border }]}>
            {(['today', 'week', 'month'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodTab,
                  period === p && { backgroundColor: theme.primary },
                ]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    {
                      color:
                        period === p
                          ? isDarkMode
                            ? '#0D0D0D'
                            : '#FFFFFF'
                          : theme.textSecondary,
                    },
                  ]}
                >
                  {p === 'today' ? 'TODAY' : p === 'week' ? '7 DAYS' : '30 DAYS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Revenue</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {formatCurrency(period === 'today' ? stats.todaysSales : stats.totalSalesRevenue)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Items Sold</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {period === 'today' ? stats.todaysItemsSold : stats.totalSold}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Inventory Value</Text>
            <Text style={[styles.statValue, { color: acc }]}>
              {formatCurrency(stats.inventoryValue)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Today's Sales by Cashier Breakdown ── */}
      {cashierStats.length > 0 && (
        <View style={[styles.section, { borderColor: theme.border }]}>
          <Text style={[styles.sectionEyebrow, { color: acc, marginBottom: 2 }]}>TEAM PERFORMANCE</Text>
          <Text style={[styles.sectionTitle, { color: theme.primary, marginBottom: spacing.m }]}>
            Today's Sales by Cashier
          </Text>
          <View style={{ gap: spacing.s }}>
            {cashierStats.map((item, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: spacing.s,
                  borderBottomWidth: idx < cashierStats.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>
                    {item.cashierName}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    {item.saleCount} {item.saleCount === 1 ? 'sale' : 'sales'} completed
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.primary }}>
                  {formatCurrency(item.totalRevenue)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Today's Payment Method Breakdown ── */}
      <View style={[styles.section, { borderColor: theme.border }]}>
        <Text style={[styles.sectionEyebrow, { color: acc, marginBottom: 2 }]}>PAYMENT METHODS</Text>
        <Text style={[styles.sectionTitle, { color: theme.primary, marginBottom: spacing.m }]}>
          Today's Payment Breakdown
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m }}>
          <View style={{ flex: 1, minWidth: 120, padding: spacing.m, backgroundColor: theme.surface, borderRadius: borderRadius.xs, borderWidth: 1, borderColor: theme.border, gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1.5 }}>CASH</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.primary }}>{formatCurrency(paymentStats.cash)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 120, padding: spacing.m, backgroundColor: theme.surface, borderRadius: borderRadius.xs, borderWidth: 1, borderColor: theme.border, gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1.5 }}>UPI</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.primary }}>{formatCurrency(paymentStats.upi)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 120, padding: spacing.m, backgroundColor: theme.surface, borderRadius: borderRadius.xs, borderWidth: 1, borderColor: theme.border, gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1.5 }}>CARD</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.primary }}>{formatCurrency(paymentStats.card)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 120, padding: spacing.m, backgroundColor: theme.primary + '15', borderRadius: borderRadius.xs, borderWidth: 1, borderColor: theme.primary, gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary, letterSpacing: 1.5 }}>TOTAL</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.primary }}>{formatCurrency(paymentStats.total)}</Text>
          </View>
        </View>
      </View>

      {/* ── Two-col: Top Selling + Low Stock ── */}
      <View style={[styles.twoCol, isWide && styles.twoColWide]}>
        {/* Top Selling */}
        <View style={[styles.colSection, { borderColor: theme.border }]}>
          <Text style={[styles.sectionEyebrow, { color: acc, marginBottom: 2 }]}>BESTSELLERS</Text>
          <Text style={[styles.sectionTitle, { color: theme.primary, marginBottom: spacing.m }]}>
            Top Selling
          </Text>
          {topProducts.length > 0 ? (
            topProducts.map((item, idx) => (
              <View
                key={item.productId || idx}
                style={[
                  styles.productRow,
                  idx < topProducts.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
                ]}
              >
                <Text style={[styles.rankNum, { color: acc }]}>
                  {String(idx + 1).padStart(2, '0')}
                </Text>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: theme.primary }]} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={[styles.productBarcode, { color: theme.textSecondary }]}>
                    {item.barcode}
                  </Text>
                </View>
                <View style={styles.productMeta}>
                  <Text style={[styles.productSold, { color: theme.primary }]}>
                    {item.totalSold} sold
                  </Text>
                  <Text style={[styles.productRevenue, { color: acc }]}>
                    {formatCurrency(item.totalRevenue)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyNote, { color: theme.textSecondary }]}>
              No sales data yet
            </Text>
          )}
        </View>

        {/* Low Stock Alerts */}
        <View style={[styles.colSection, { borderColor: theme.border }]}>
          <Text style={[styles.sectionEyebrow, { color: acc, marginBottom: 2 }]}>ALERTS</Text>
          <Text style={[styles.sectionTitle, { color: theme.primary, marginBottom: spacing.m }]}>
            Low Stock
          </Text>
          {lowStockItems.length > 0 ? (
            lowStockItems.slice(0, 4).map((p) => (
              <View
                key={p.id}
                style={[styles.lowStockRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
              >
                <View style={styles.lowStockInfo}>
                  <Text style={[styles.productName, { color: theme.primary }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <StatusBadge
                    status={p.stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'}
                    label={`${p.stock} remaining`}
                    size="small"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.restockChip, { borderColor: theme.border }]}
                  onPress={() => setRestockProduct(p)}
                >
                  <Text style={[styles.restockChipText, { color: theme.textSecondary }]}>
                    RESTOCK
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.healthyWrap}>
              <StatusBadge status="IN_STOCK" label="Inventory healthy" />
            </View>
          )}
        </View>
      </View>

      {/* ── Recent Transactions ── */}
      <View style={[styles.section, { borderColor: theme.border, marginBottom: spacing.xxl }]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: acc }]}>LEDGER</Text>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Recent Transactions
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('HistoryTabs')}>
            <Text style={[styles.viewAll, { color: acc }]}>VIEW ALL →</Text>
          </TouchableOpacity>
        </View>

        {recentSalesList.length > 0 ? (
          recentSalesList.map((sale, idx) => (
            <TouchableOpacity
              key={sale.id}
              style={[
                styles.txRow,
                idx < recentSalesList.length - 1 && {
                  borderBottomColor: theme.border,
                  borderBottomWidth: 1,
                },
              ]}
              onPress={() => setSelectedSale(sale)}
            >
              <View style={[styles.txDot, { backgroundColor: acc }]} />
              <View style={styles.txInfo}>
                <Text style={[styles.txInvoice, { color: theme.primary }]}>
                  {sale.invoiceNumber}
                </Text>
                <Text style={[styles.txTime, { color: theme.textSecondary }]}>
                  {new Date(sale.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {sale.items.length} items
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: theme.primary }]}>
                {formatCurrency(sale.totalAmount)}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState title="No Recent Sales" subtitle="Completed sales will appear here." />
        )}
      </View>

      {/* ── Quick Restock Modal ── */}
      {restockProduct && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalLabel, { color: acc }]}>QUICK RESTOCK</Text>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>
              {restockProduct.name}
            </Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              Current stock: {restockProduct.stock} units
            </Text>
            <TextInput
              style={[styles.modalInput, { color: theme.primary, borderColor: theme.border }]}
              value={restockQty}
              onChangeText={setRestockQty}
              keyboardType="numeric"
              placeholder="Units to add"
              placeholderTextColor={theme.textSecondary}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: theme.border }]}
                onPress={() => setRestockProduct(null)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: theme.primary }]}
                onPress={handleQuickRestock}
                disabled={restockLoading}
              >
                <Text style={[styles.modalSaveText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
                  {restockLoading ? 'Saving...' : 'SAVE STOCK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Receipt Modal ── */}
      <ReceiptModal
        visible={!!selectedSale}
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh' as any,
    }),
  },

  // ── Hero Header ──
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xl,
    paddingBottom: spacing.l,
    borderBottomWidth: 1,
  },
  heroLeft: { gap: 4 },
  heroEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
    lineHeight: 38,
  },
  heroDate: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: borderRadius.s,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── KPI Grid ──
  kpiGrid: {
    padding: spacing.l,
    gap: spacing.m,
  },
  kpiHero: {
    padding: spacing.l,
    borderRadius: borderRadius.s,
    position: 'relative',
    overflow: 'hidden',
  },
  kpiHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  kpiHeroLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    gap: 3,
  },
  trendText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  kpiHeroValue: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiHeroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  kpiHeroAccentLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#C9A99A',
    opacity: 0.7,
  },

  kpiRow: {
    flexDirection: 'row',
    gap: spacing.m,
    flexWrap: 'wrap',
  },
  kpiRowWide: { flexWrap: 'nowrap' },
  kpiCard: {
    flex: 1,
    minWidth: 100,
    padding: spacing.m,
    borderWidth: 1,
    borderRadius: borderRadius.s,
    gap: 6,
  },
  kpiCardLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  kpiCardValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Sections ──
  section: {
    marginHorizontal: spacing.l,
    paddingVertical: spacing.l,
    borderTopWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.l,
    flexWrap: 'wrap',
    gap: spacing.m,
  },
  sectionEyebrow: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },

  // Period tabs
  periodTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.s,
    overflow: 'hidden',
  },
  periodTab: {
    paddingHorizontal: spacing.m - 4,
    paddingVertical: 6,
  },
  periodTabText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 40 },

  // ── Two-col ──
  twoCol: { marginHorizontal: spacing.l },
  twoColWide: { flexDirection: 'row', gap: spacing.l },
  colSection: {
    flex: 1,
    paddingVertical: spacing.l,
    borderTopWidth: 1,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s + 2,
    gap: spacing.m,
  },
  rankNum: { fontSize: 18, fontWeight: '700', width: 28 },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  productBarcode: { fontSize: 10, letterSpacing: 0.5, marginTop: 1 },
  productMeta: { alignItems: 'flex-end', gap: 2 },
  productSold: { fontSize: 13, fontWeight: '600' },
  productRevenue: { fontSize: 11, fontWeight: '700' },

  lowStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s + 2,
  },
  lowStockInfo: { flex: 1, gap: 4 },
  restockChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
  },
  restockChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  healthyWrap: { paddingVertical: spacing.m },
  emptyNote: { fontSize: 13, fontWeight: '400', paddingVertical: spacing.m },

  // ── Transactions ──
  viewAll: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m - 2,
    gap: spacing.m,
  },
  txDot: { width: 6, height: 6, borderRadius: 3 },
  txInfo: { flex: 1 },
  txInvoice: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  txTime: { fontSize: 11, letterSpacing: 0.2 },
  txAmount: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // ── Modal ──
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.l,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.l,
    borderWidth: 1,
    borderRadius: borderRadius.s,
  },
  modalLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  modalSub: { fontSize: 13, marginBottom: spacing.l },
  modalInput: {
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: 2,
    borderBottomWidth: 1,
    paddingVertical: spacing.s,
    marginBottom: spacing.l,
  },
  modalActions: { flexDirection: 'row', gap: spacing.m },
  modalCancel: {
    flex: 1,
    paddingVertical: spacing.m,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  modalSave: {
    flex: 1,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
});
