import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Search, ShoppingCart, CreditCard, Calendar, UserCheck, CheckCircle2 } from 'lucide-react-native';
import { useStore, Sale } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius } from '../theme/theme';
import EmptyState from '../components/EmptyState';
import ReceiptModal from '../components/ReceiptModal';

export default function HistoryScreen() {
  const { isDarkMode, sales, user } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  const [search, setSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [selectedCashier, setSelectedCashier] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'ALL' | 'CASH' | 'UPI' | 'CARD'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Extract unique cashier names from sales
  const uniqueCashiers = Array.from(
    new Set(sales.map((s) => s.cashierName || 'Staff'))
  );

  // Filter logic
  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (sale.cashierName || '').toLowerCase().includes(search.toLowerCase()) ||
      sale.items.some(
        (i) =>
          i.productName.toLowerCase().includes(search.toLowerCase()) ||
          i.barcode.includes(search)
      );
    if (!matchesSearch) return false;

    if (selectedCashier && (sale.cashierName || 'Staff') !== selectedCashier) {
      return false;
    }

    if (selectedPaymentMethod !== 'ALL' && (sale.paymentMethod || 'CASH').toUpperCase() !== selectedPaymentMethod) {
      return false;
    }

    if (filterPeriod === 'ALL') return true;
    const saleDate = new Date(sale.createdAt || Date.now());
    const diffDays = Math.ceil(
      Math.abs(Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (filterPeriod === 'TODAY') return diffDays <= 1;
    if (filterPeriod === 'WEEK') return diffDays <= 7;
    if (filterPeriod === 'MONTH') return diffDays <= 30;
    return true;
  });

  const acc = theme.accent;

  const renderItem = ({ item }: { item: Sale }) => {
    const saleDate = new Date(item.createdAt || Date.now());
    const formattedDate = saleDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = saleDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const totalItems = item.items.reduce((sum, i) => sum + i.quantity, 0);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
        onPress={() => setSelectedSale(item)}
        activeOpacity={0.85}
      >
        {/* Left accent bar */}
        <View style={[styles.cardAccentBar, { backgroundColor: acc }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.invoiceNum, { color: theme.primary }]}>
                {item.invoiceNumber}
              </Text>
              <View style={styles.cashierBadge}>
                <UserCheck color={acc} size={11} />
                <Text style={[styles.cashierText, { color: acc }]}>
                  {item.cashierName || 'Staff'}
                </Text>
              </View>
            </View>

            <View style={styles.dateRow}>
              <Calendar color={theme.textSecondary} size={11} strokeWidth={1.5} />
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                {formattedDate} {formattedTime}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.itemCount, { color: theme.textSecondary }]}>
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </Text>

              <View style={[styles.payBadge, { borderColor: theme.border }]}>
                <CreditCard color={acc} size={11} strokeWidth={1.5} />
                <Text style={[styles.payText, { color: acc }]}>
                  {item.paymentMethod || 'CASH'}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: theme.success + '1A', borderColor: theme.success }]}>
                <CheckCircle2 color={theme.success} size={10} />
                <Text style={[styles.statusText, { color: theme.success }]}>PAID</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardRight}>
            <Text style={[styles.amount, { color: theme.primary }]}>
              ₹{item.totalAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.tapHint, { color: theme.textSecondary }]}>TAP FOR RECEIPT</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const PERIODS: Array<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'> = ['ALL', 'TODAY', 'WEEK', 'MONTH'];
  const periodLabel: Record<typeof PERIODS[number], string> = {
    ALL: 'ALL',
    TODAY: 'TODAY',
    WEEK: '7 DAYS',
    MONTH: '30 DAYS',
  };

  const PAYMENT_METHODS: Array<'ALL' | 'CASH' | 'UPI' | 'CARD'> = ['ALL', 'CASH', 'UPI', 'CARD'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchRow, { borderBottomColor: theme.border }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search color={theme.textSecondary} size={16} strokeWidth={1.5} />
          <TextInput
            style={[styles.searchInput, { color: theme.primary }]}
            placeholder="Search by invoice, cashier, product, or barcode…"
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Period Filter Chips */}
      <View style={[styles.filterRow, { borderBottomColor: theme.border }]}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.filterBtn,
              filterPeriod === p
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { borderColor: theme.border },
            ]}
            onPress={() => setFilterPeriod(p)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    filterPeriod === p
                      ? isDarkMode
                        ? '#0D0D0D'
                        : '#FFFFFF'
                      : theme.textSecondary,
                },
              ]}
            >
              {periodLabel[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Payment Method Filter Chips */}
      <View style={[styles.cashierFilterRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.cashierFilterLabel, { color: theme.textSecondary }]}>PAYMENT METHOD:</Text>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method}
            style={[
              styles.cashierChip,
              {
                borderColor: selectedPaymentMethod === method ? theme.primary : theme.border,
                backgroundColor: selectedPaymentMethod === method ? theme.primary + '20' : 'transparent',
              },
            ]}
            onPress={() => setSelectedPaymentMethod(method)}
          >
            <Text
              style={[
                styles.cashierChipText,
                { color: selectedPaymentMethod === method ? theme.primary : theme.textSecondary },
              ]}
            >
              {method}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cashier Filter Chips */}
      {uniqueCashiers.length > 0 && (
        <View style={[styles.cashierFilterRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.cashierFilterLabel, { color: theme.textSecondary }]}>CASHIER:</Text>
          {[null, ...uniqueCashiers].map((cashier) => (
            <TouchableOpacity
              key={cashier ?? 'all'}
              style={[
                styles.cashierChip,
                {
                  borderColor: selectedCashier === cashier ? acc : theme.border,
                  backgroundColor: selectedCashier === cashier ? acc + '20' : 'transparent',
                },
              ]}
              onPress={() => setSelectedCashier(cashier)}
            >
              <Text
                style={[
                  styles.cashierChipText,
                  { color: selectedCashier === cashier ? acc : theme.textSecondary },
                ]}
              >
                {cashier === null ? 'ALL CASHIERS' : cashier.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sales count label */}
      <View style={[styles.countBar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.countEyebrow, { color: acc }]}>NP_BRANDING</Text>
        <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
          {filteredSales.length} {filteredSales.length === 1 ? 'transaction' : 'transactions'}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredSales}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={ShoppingCart}
            title="No Sales Found"
            subtitle="Completed sales transactions will appear here."
          />
        }
      />

      {/* Receipt Modal */}
      <ReceiptModal
        visible={!!selectedSale}
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </View>
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
  searchRow: {
    padding: spacing.m,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.m,
    height: 44,
    gap: spacing.s,
  },
  searchInput: { flex: 1, fontSize: 14, letterSpacing: 0.2 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    gap: spacing.s,
    borderBottomWidth: 1,
  },
  filterBtn: {
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
  },
  filterText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  cashierFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    gap: spacing.s,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
  },
  cashierFilterLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5 },
  cashierChip: {
    paddingHorizontal: spacing.s + 4,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
  },
  cashierChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
  },
  countEyebrow: { fontSize: 8, fontWeight: '700', letterSpacing: 2.5 },
  countLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    marginHorizontal: spacing.m,
    marginBottom: spacing.s,
    overflow: 'hidden',
    borderRadius: borderRadius.xs,
  },
  cardAccentBar: {
    width: 3,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    gap: spacing.m,
  },
  cardLeft: { flex: 1, gap: 3 },
  invoiceNum: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  cashierBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cashierText: { fontSize: 10, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, letterSpacing: 0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  itemCount: { fontSize: 11 },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    gap: 3,
  },
  payText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    gap: 2,
  },
  statusText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  tapHint: { fontSize: 8, fontWeight: '600', letterSpacing: 1.5 },
  listContent: { paddingTop: spacing.m, paddingBottom: spacing.xxl },
});
