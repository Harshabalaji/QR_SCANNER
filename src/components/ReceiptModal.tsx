import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Receipt, X, Printer, CircleCheck, CreditCard } from 'lucide-react-native';
import { useStore, Sale } from '../store/useStore';
import { colors, darkColors, typography, spacing, borderRadius, shadows } from '../theme/theme';

interface ReceiptModalProps {
  visible: boolean;
  sale: Sale | null;
  onClose: () => void;
  onNewSale?: () => void;
}

export default function ReceiptModal({ visible, sale, onClose, onNewSale }: ReceiptModalProps) {
  const { isDarkMode } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  if (!sale) return null;

  const saleDate = new Date(sale.createdAt || Date.now());
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

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface }, shadows.medium]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleRow}>
              <Receipt color={theme.primary} size={22} />
              <Text style={[styles.title, { color: theme.text }]}>Sale Invoice</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={theme.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Store Branding */}
            <View style={styles.brandSection}>
              <View style={[styles.successIconBox, { backgroundColor: theme.primary + '1A' }]}>
                <CircleCheck color={theme.primary} size={32} />
              </View>
              <Text style={[styles.storeTitle, { color: theme.text }]}>NP_BRANDING</Text>
              <Text style={[styles.storeSubtitle, { color: theme.textSecondary }]}>
                LADIES FASHION · INVENTORY · POS
              </Text>
            </View>

            {/* Invoice Info Meta */}
            <View style={[styles.metaCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Invoice No</Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>{sale.invoiceNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Date & Time</Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>
                  {formattedDate}, {formattedTime}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Cashier</Text>
                <Text style={[styles.metaValue, { color: theme.primary, fontWeight: '700' }]}>
                  {sale.cashierName || 'Staff'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Payment Method</Text>
                <View style={styles.paymentBadge}>
                  <CreditCard color={theme.primary} size={14} />
                  <Text style={[styles.paymentText, { color: theme.primary }]}>
                    {sale.paymentMethod || 'CASH'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Items Table */}
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Items ({totalItems})</Text>
            <View style={[styles.tableContainer, { borderColor: theme.border }]}>
              <View style={[styles.tableHeader, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
                <Text style={[styles.colName, styles.thText, { color: theme.textSecondary }]}>Item</Text>
                <Text style={[styles.colQty, styles.thText, { color: theme.textSecondary }]}>Qty</Text>
                <Text style={[styles.colPrice, styles.thText, { color: theme.textSecondary }]}>Price</Text>
                <Text style={[styles.colTotal, styles.thText, { color: theme.textSecondary }]}>Total</Text>
              </View>

              {sale.items.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tableRow,
                    idx < sale.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={styles.colName}>
                    <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '600', marginTop: 1 }}>
                      {item.color ? `${item.color} • ` : ''}Size {item.size || 'Free'}
                    </Text>
                    <Text style={[styles.itemBarcode, { color: theme.textSecondary }]}>
                      {item.barcode}
                    </Text>
                  </View>
                  <Text style={[styles.colQty, styles.tdText, { color: theme.text }]}>
                    ×{item.quantity}
                  </Text>
                  <Text style={[styles.colPrice, styles.tdText, { color: theme.textSecondary }]}>
                    ₹{item.unitPrice.toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.colTotal, styles.tdText, { color: theme.text, fontWeight: '700' }]}>
                    ₹{item.totalPrice.toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>

            {/* Summary Totals */}
            <View style={[styles.totalsCard, { backgroundColor: theme.background }]}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.totalVal, { color: theme.text }]}>
                  ₹{(sale.subtotal || sale.totalAmount).toLocaleString('en-IN')}
                </Text>
              </View>

              {Number(sale.discount || 0) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: theme.error }]}>Discount</Text>
                  <Text style={[styles.totalVal, { color: theme.error }]}>
                    -₹{Number(sale.discount).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}

              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={[styles.grandTotalLabel, { color: theme.text }]}>Total Amount</Text>
                <Text style={[styles.grandTotalVal, { color: theme.primary }]}>
                  ₹{sale.totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>

              {sale.paymentMethod === 'CASH' && sale.cashReceived != null && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Cash Received</Text>
                    <Text style={[styles.totalVal, { color: theme.text }]}>
                      ₹{sale.cashReceived.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: theme.success, fontWeight: '700' }]}>Change</Text>
                    <Text style={[styles.totalVal, { color: theme.success, fontWeight: '700' }]}>
                      ₹{(sale.changeAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.printBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
                onPress={handlePrint}
              >
                <Printer color={theme.text} size={18} />
                <Text style={[styles.printBtnText, { color: theme.text }]}>Print Receipt</Text>
              </TouchableOpacity>
            )}

            {onNewSale ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.newSaleBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  onClose();
                  onNewSale();
                }}
              >
                <Text style={styles.newSaleBtnText}>Start New Sale</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.newSaleBtn, { backgroundColor: theme.primary }]}
                onPress={onClose}
              >
                <Text style={styles.newSaleBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.m,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: borderRadius.l,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  title: {
    ...typography.h3,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.l,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  successIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  storeTitle: {
    ...typography.h2,
    letterSpacing: 0.5,
  },
  storeSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  metaCard: {
    borderWidth: 1,
    borderRadius: borderRadius.m,
    padding: spacing.m,
    marginBottom: spacing.l,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    ...typography.caption,
  },
  metaValue: {
    ...typography.body2,
    fontWeight: '600',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentText: {
    ...typography.caption,
    fontWeight: '700',
  },
  sectionHeading: {
    ...typography.body1,
    fontWeight: '600',
    marginBottom: spacing.s,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.m,
    overflow: 'hidden',
    marginBottom: spacing.l,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderBottomWidth: 1,
  },
  thText: {
    ...typography.micro,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s + 2,
    paddingHorizontal: spacing.m,
  },
  colName: {
    flex: 2,
  },
  colQty: {
    width: 45,
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
    ...typography.body2,
    fontWeight: '600',
  },
  itemBarcode: {
    ...typography.micro,
    marginTop: 1,
  },
  tdText: {
    ...typography.body2,
  },
  totalsCard: {
    padding: spacing.m,
    borderRadius: borderRadius.m,
    gap: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.body2,
  },
  totalVal: {
    ...typography.body2,
    fontWeight: '600',
  },
  grandTotalRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  grandTotalLabel: {
    ...typography.h3,
  },
  grandTotalVal: {
    ...typography.h2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.m,
    padding: spacing.l,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.s,
  },
  printBtn: {
    borderWidth: 1,
  },
  printBtnText: {
    ...typography.body2,
    fontWeight: '600',
  },
  newSaleBtn: {
    elevation: 1,
  },
  newSaleBtnText: {
    ...typography.body2,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
