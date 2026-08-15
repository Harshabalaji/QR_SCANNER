import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Receipt, Calendar, CreditCard, Package } from 'lucide-react-native';
import { useStore, Sale } from '../store/useStore';
import { colors, darkColors, typography, spacing, borderRadius, shadows } from '../theme/theme';

export default function SaleDetail() {
  const route = useRoute<any>();
  const { saleId } = route.params || {};
  const { isDarkMode, getSale } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  const sale: Sale | undefined = getSale(saleId);

  if (!sale) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyState}>
          <Receipt color={theme.textSecondary} size={48} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sale not found</Text>
        </View>
      </View>
    );
  }

  const saleDate = new Date(sale.createdAt);
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

  const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ─── Header Card ─── */}
      <View style={[styles.card, { backgroundColor: theme.surface }, shadows.soft]}>
        <View style={[styles.invoiceIcon, { backgroundColor: theme.primary + '15' }]}>
          <Receipt color={theme.primary} size={32} />
        </View>
        <Text style={[styles.invoiceNumber, { color: theme.text }]}>{sale.invoiceNumber}</Text>
        <View style={styles.dateRow}>
          <Calendar color={theme.textSecondary} size={16} />
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {formattedDate}, {formattedTime}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{totalItems}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Items</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.text, fontSize: 16 }]} numberOfLines={1}>
              {sale.cashierName || 'Staff'}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Cashier</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>
              ₹{sale.totalAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total</Text>
          </View>
        </View>
      </View>

      {/* ─── Items List ─── */}
      <View style={[styles.card, { backgroundColor: theme.surface }, shadows.soft]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Items</Text>

        {/* Table Header */}
        <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.colProduct, styles.tableHeaderText, { color: theme.textSecondary }]}>Product</Text>
          <Text style={[styles.colQty, styles.tableHeaderText, { color: theme.textSecondary }]}>Qty</Text>
          <Text style={[styles.colPrice, styles.tableHeaderText, { color: theme.textSecondary }]}>Price</Text>
          <Text style={[styles.colTotal, styles.tableHeaderText, { color: theme.textSecondary }]}>Total</Text>
        </View>

        {sale.items.map((item, index) => (
          <View
            key={index}
            style={[
              styles.tableRow,
              index < sale.items.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
            ]}
          >
            <View style={styles.colProduct}>
              <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.productName}</Text>
              <Text style={[styles.itemBarcode, { color: theme.textSecondary }]}>{item.barcode}</Text>
            </View>
            <Text style={[styles.colQty, styles.cellText, { color: theme.text }]}>×{item.quantity}</Text>
            <Text style={[styles.colPrice, styles.cellText, { color: theme.textSecondary }]}>
              ₹{item.unitPrice.toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.colTotal, styles.cellText, { color: theme.text, fontWeight: '700' }]}>
              ₹{item.totalPrice.toLocaleString('en-IN')}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={[styles.totalsSection, { borderTopColor: theme.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: theme.text }]}>
              ₹{sale.subtotal.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.grandTotalLabel, { color: theme.text }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: theme.primary }]}>
              ₹{sale.totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── Payment Method ─── */}
      <View style={[styles.card, { backgroundColor: theme.surface }, shadows.soft]}>
        <View style={styles.paymentRow}>
          <View style={[styles.paymentIcon, { backgroundColor: theme.info + '15' }]}>
            <CreditCard color={theme.info} size={20} />
          </View>
          <View>
            <Text style={[styles.paymentLabel, { color: theme.textSecondary }]}>Payment Method</Text>
            <Text style={[styles.paymentValue, { color: theme.text }]}>{sale.paymentMethod}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.m,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh' as any,
    }),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.h3,
    marginTop: spacing.m,
  },
  card: {
    borderRadius: borderRadius.l,
    padding: spacing.l,
    marginBottom: spacing.m,
  },
  invoiceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.m,
  },
  invoiceNumber: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.l,
  },
  dateText: {
    ...typography.body2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  summaryValue: {
    ...typography.h2,
    marginBottom: 2,
  },
  summaryLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.m,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.s,
    borderBottomWidth: 1,
    marginBottom: spacing.s,
  },
  tableHeaderText: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m,
  },
  colProduct: {
    flex: 2,
  },
  colQty: {
    width: 50,
    textAlign: 'center',
  },
  colPrice: {
    flex: 1,
    textAlign: 'right',
  },
  colTotal: {
    flex: 1,
    textAlign: 'right',
  },
  itemName: {
    ...typography.body1,
    fontWeight: '600',
  },
  itemBarcode: {
    ...typography.caption,
    marginTop: 2,
  },
  cellText: {
    ...typography.body2,
  },
  totalsSection: {
    borderTopWidth: 2,
    paddingTop: spacing.m,
    marginTop: spacing.s,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    ...typography.body1,
  },
  totalValue: {
    ...typography.body1,
    fontWeight: '600',
  },
  grandTotalLabel: {
    ...typography.h3,
  },
  grandTotalValue: {
    ...typography.h2,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentValue: {
    ...typography.body1,
    fontWeight: '600',
    marginTop: 2,
  },
});
