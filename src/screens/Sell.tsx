import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import {
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CircleCheck,
  CircleX,
  Zap,
  Search,
  Percent,
  Tag,
  QrCode,
  CreditCard as CardIcon,
  Banknote,
  CheckCircle2,
} from 'lucide-react-native';
import { useStore, Product, Sale } from '../store/useStore';
import { colors, darkColors, typography, spacing, borderRadius, shadows } from '../theme/theme';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import StatusBadge from '../components/StatusBadge';
import ReceiptModal from '../components/ReceiptModal';

export default function Sell() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const {
    isDarkMode,
    inventory,
    cart,
    addToCart,
    removeFromCart,
    updateCartQty,
    clearCart,
    completeSale,
    getProductByBarcode,
    user,
  } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  
  // Physical payment states
  const [cashReceivedInput, setCashReceivedInput] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const inputRef = useRef<TextInput>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Reset payment confirmation when payment method or cart total changes
  useEffect(() => {
    setPaymentConfirmed(false);
  }, [paymentMethod, cart.length]);

  // Barcode Handler
  const handleBarcodeScanned = useCallback(
    (barcode: string) => {
      if (!barcode.trim()) return;
      const product = getProductByBarcode(barcode.trim());
      if (product) {
        const error = addToCart(product);
        if (error) {
          showToast('error', error);
        } else {
          showToast('success', `Added "${product.name}" to cart`);
        }
      } else {
        showToast('error', `Product with barcode "${barcode.trim()}" not found`);
      }
      setBarcodeInput('');
    },
    [getProductByBarcode, addToCart]
  );

  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: true,
  });

  const handleManualAdd = () => {
    handleBarcodeScanned(barcodeInput);
  };

  const handleSelectProduct = (product: Product) => {
    const error = addToCart(product);
    if (error) {
      showToast('error', error);
    } else {
      showToast('success', `Added "${product.name}" to cart`);
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountVal = Math.max(0, Number(discountInput || 0));
  const cartTotal = Math.max(0, cartSubtotal - discountVal);

  const cashReceivedVal = Number(cashReceivedInput || 0);
  const changeAmount = Math.max(0, cashReceivedVal - cartTotal);
  const isCashSufficient = cashReceivedVal >= cartTotal;

  const handleConfirmPayment = () => {
    if (cart.length === 0) {
      showToast('error', 'Cart is empty');
      return;
    }

    if (paymentMethod === 'CASH') {
      if (!isCashSufficient) {
        showToast('error', `Insufficient cash received. Required ₹${cartTotal.toLocaleString('en-IN')}`);
        return;
      }
    }

    setPaymentConfirmed(true);
    showToast('success', 'Payment Confirmed! You may now complete the sale.');
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (!paymentConfirmed) {
      showToast('error', 'Please confirm payment received before completing sale');
      return;
    }

    setIsSubmitting(true);
    const res = await completeSale(
      paymentMethod,
      discountVal,
      0,
      paymentMethod === 'CASH' ? cashReceivedVal : undefined
    );
    setIsSubmitting(false);

    if (res.success && res.sale) {
      setCompletedSale(res.sale);
      setDiscountInput('');
      setCashReceivedInput('');
      setPaymentConfirmed(false);
      showToast('success', `Sale Completed! Invoice: ${res.sale.invoiceNumber}`);
    } else {
      showToast('error', res.error || 'Failed to complete sale');
    }
  };

  const filteredInventory = inventory.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.color || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.size || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Toast Banner */}
      {toast && (
        <View
          style={[
            styles.toast,
            { backgroundColor: toast.type === 'success' ? theme.success : theme.error },
          ]}
        >
          {toast.type === 'success' ? (
            <CircleCheck color="#FFF" size={18} />
          ) : (
            <CircleX color="#FFF" size={18} />
          )}
          <Text style={styles.toastText}>{toast.text}</Text>
        </View>
      )}

      <View style={[styles.mainLayout, isDesktop ? styles.desktopRow : styles.mobileCol]}>
        {/* LEFT PANEL: Barcode Scanner & Product Catalog */}
        <View style={[styles.leftPanel, isDesktop && { flex: 6 }]}>
          {/* Barcode & Scanner Input Bar */}
          <View
            style={[
              styles.scanHeaderCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              shadows.soft,
            ]}
          >
            <View style={styles.scanStatusRow}>
              <View style={styles.scannerConnectedBadge}>
                <Zap color={theme.primary} size={14} />
                <Text style={[styles.scanConnectedText, { color: theme.primary }]}>
                  ● Scanner Ready
                </Text>
              </View>
              {user && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1.5 }}>
                    CASHIER:
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>
                    {user.name}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.barcodeInputRow}>
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <ScanLine color={theme.primary} size={18} />
                <TextInput
                  ref={inputRef}
                  style={[styles.barcodeInput, { color: theme.text }]}
                  placeholder="Scan or enter item barcode…"
                  placeholderTextColor={theme.textSecondary}
                  value={barcodeInput}
                  onChangeText={setBarcodeInput}
                  onSubmitEditing={handleManualAdd}
                  autoCapitalize="characters"
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[styles.addBarcodeBtn, { backgroundColor: theme.primary }]}
                onPress={handleManualAdd}
              >
                <Plus color="#FFFFFF" size={18} />
                <Text style={styles.addBtnText}>ADD ITEM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar for Product Catalog */}
          <View style={styles.catalogSearchRow}>
            <View
              style={[
                styles.searchWrap,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Search color={theme.textSecondary} size={16} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search catalog by name, color, size, or barcode…"
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Product Cards Grid */}
          <ScrollView
            style={styles.catalogScroll}
            contentContainerStyle={styles.catalogGridContent}
          >
            {filteredInventory.map((product) => {
              const isOutOfStock = product.stock <= 0;
              return (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    isOutOfStock && { opacity: 0.5 },
                  ]}
                  onPress={() => !isOutOfStock && handleSelectProduct(product)}
                  disabled={isOutOfStock}
                  activeOpacity={0.8}
                >
                  <View style={styles.productCardTop}>
                    <StatusBadge
                      status={
                        product.stock <= (product.lowStockThreshold || 5)
                          ? product.stock === 0
                            ? 'OUT_OF_STOCK'
                            : 'LOW_STOCK'
                          : 'IN_STOCK'
                      }
                      label={`${product.stock} left`}
                      size="small"
                    />
                  </View>

                  <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={[styles.productVariantText, { color: theme.primary }]}>
                    {product.color ? `${product.color} • ` : ''}Size {product.size || 'Free'}
                  </Text>
                  <Text style={[styles.productBarcode, { color: theme.textSecondary }]}>
                    {product.barcode}
                  </Text>

                  <View style={styles.productCardBottom}>
                    <Text style={[styles.productPrice, { color: theme.text }]}>
                      ₹{product.price.toLocaleString('en-IN')}
                    </Text>
                    <View style={[styles.plusIconCirc, { backgroundColor: theme.primary + '1A' }]}>
                      <Plus color={theme.primary} size={16} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* RIGHT PANEL: POS Shopping Cart & Physical Checkout */}
        <View
          style={[
            styles.rightPanel,
            { backgroundColor: theme.surface, borderColor: theme.border },
            isDesktop && { flex: 4 },
            shadows.medium,
          ]}
        >
          <View style={[styles.cartHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.cartHeaderTitleRow}>
              <ShoppingCart color={theme.primary} size={22} />
              <Text style={[styles.cartTitle, { color: theme.text }]}>Point of Sale Cart</Text>
            </View>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={[styles.clearCartText, { color: theme.error }]}>Clear Cart</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cart Items List */}
          <ScrollView style={styles.cartList} contentContainerStyle={styles.cartListContent}>
            {cart.length > 0 ? (
              cart.map((item) => (
                <View
                  key={item.productId}
                  style={[styles.cartItemRow, { borderBottomColor: theme.border }]}
                >
                  <View style={styles.cartItemInfo}>
                    <Text style={[styles.cartItemName, { color: theme.text }]} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={[styles.cartItemVariant, { color: theme.primary }]}>
                      {item.color ? `${item.color} • ` : ''}Size {item.size || 'Free'}
                    </Text>
                    <Text style={[styles.cartItemBarcode, { color: theme.textSecondary }]}>
                      {item.barcode}
                    </Text>
                    <Text style={[styles.cartItemUnitPrice, { color: theme.textSecondary }]}>
                      ₹{item.unitPrice.toLocaleString('en-IN')} / unit
                    </Text>
                  </View>

                  {/* Quantity Adjustment Controls */}
                  <View style={styles.cartQtyControls}>
                    <TouchableOpacity
                      style={[
                        styles.qtyBtn,
                        { backgroundColor: theme.background, borderColor: theme.border },
                      ]}
                      onPress={() => updateCartQty(item.productId, item.quantity - 1)}
                    >
                      <Minus color={theme.text} size={14} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: theme.text }]}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[
                        styles.qtyBtn,
                        { backgroundColor: theme.background, borderColor: theme.border },
                      ]}
                      onPress={() => {
                        const err = updateCartQty(item.productId, item.quantity + 1);
                        if (err) showToast('error', err);
                      }}
                    >
                      <Plus color={theme.text} size={14} />
                    </TouchableOpacity>
                  </View>

                  {/* Item Total & Delete Button */}
                  <View style={styles.cartItemRight}>
                    <Text style={[styles.cartItemTotal, { color: theme.text }]}>
                      ₹{item.totalPrice.toLocaleString('en-IN')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.productId)}
                      style={styles.removeBtn}
                    >
                      <Trash2 color={theme.error} size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCartBox}>
                <ShoppingCart color={theme.textSecondary} size={48} />
                <Text style={[styles.emptyCartTitle, { color: theme.text }]}>Cart is Empty</Text>
                <Text style={[styles.emptyCartSub, { color: theme.textSecondary }]}>
                  Scan a clothing barcode or tap products on the left catalog to add to cart
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Checkout Footer Section */}
          <View
            style={[
              styles.checkoutSection,
              { borderTopColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            {/* Discount Input */}
            <View style={styles.discountRow}>
              <View style={styles.discountLabelBox}>
                <Percent color={theme.primary} size={14} />
                <Text style={[styles.discountLabelText, { color: theme.text }]}>
                  Discount (Fixed ₹)
                </Text>
              </View>
              <TextInput
                style={[
                  styles.discountInput,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
                ]}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                value={discountInput}
                onChangeText={(val) => {
                  setDiscountInput(val);
                  setPaymentConfirmed(false);
                }}
              />
            </View>

            {/* Subtotal & Total Amount */}
            <View style={styles.subtotalRow}>
              <Text style={[styles.subtotalLabel, { color: theme.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.subtotalVal, { color: theme.text }]}>
                ₹{cartSubtotal.toLocaleString('en-IN')}
              </Text>
            </View>

            {discountVal > 0 && (
              <View style={styles.subtotalRow}>
                <Text style={[styles.subtotalLabel, { color: theme.error }]}>Discount</Text>
                <Text style={[styles.subtotalVal, { color: theme.error }]}>
                  -₹{discountVal.toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={[styles.grandTotalLabel, { color: theme.text }]}>Total Amount</Text>
              <Text style={[styles.grandTotalVal, { color: theme.primary }]}>
                ₹{cartTotal.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Payment Method Selector */}
            <Text style={[styles.paymentSelectLabel, { color: theme.textSecondary }]}>
              SELECT PAYMENT METHOD
            </Text>
            <View style={styles.paymentSelectorRow}>
              {(['CASH', 'UPI', 'CARD'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentOptionBtn,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    paymentMethod === method && {
                      backgroundColor: theme.primary + '20',
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  {method === 'CASH' && <Banknote color={paymentMethod === method ? theme.primary : theme.textSecondary} size={14} />}
                  {method === 'UPI' && <QrCode color={paymentMethod === method ? theme.primary : theme.textSecondary} size={14} />}
                  {method === 'CARD' && <CardIcon color={paymentMethod === method ? theme.primary : theme.textSecondary} size={14} />}
                  <Text
                    style={[
                      styles.paymentOptionText,
                      { color: paymentMethod === method ? theme.primary : theme.textSecondary },
                      paymentMethod === method && { fontWeight: '700' },
                    ]}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Interactive Physical Payment Box */}
            <View style={[styles.paymentBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {paymentMethod === 'CASH' && (
                <View style={{ gap: 8 }}>
                  <Text style={[styles.paymentBoxTitle, { color: theme.text }]}>CASH PAYMENT</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: theme.textSecondary }}>CASH RECEIVED (₹):</Text>
                    <TextInput
                      style={[
                        styles.cashInput,
                        { color: theme.text, borderColor: isCashSufficient || !cashReceivedInput ? theme.border : theme.error, backgroundColor: theme.background },
                      ]}
                      placeholder={cartTotal.toString()}
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                      value={cashReceivedInput}
                      onChangeText={(val) => {
                        setCashReceivedInput(val);
                        setPaymentConfirmed(false);
                      }}
                    />
                  </View>

                  {cashReceivedInput !== '' && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isCashSufficient ? theme.success : theme.error }}>
                        {isCashSufficient ? 'CHANGE TO CUSTOMER:' : 'INSUFFICIENT CASH:'}
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: isCashSufficient ? theme.success : theme.error }}>
                        ₹{changeAmount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}

                  {!isCashSufficient && cashReceivedInput !== '' && (
                    <Text style={{ fontSize: 11, color: theme.error, fontWeight: '600' }}>
                      Insufficient cash received. Required ₹{cartTotal.toLocaleString('en-IN')}
                    </Text>
                  )}
                </View>
              )}

              {paymentMethod === 'UPI' && (
                <View style={{ gap: 6, alignItems: 'center' }}>
                  <Text style={[styles.paymentBoxTitle, { color: theme.text }]}>PAY VIA UPI</Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    Amount to collect: <Text style={{ color: theme.primary, fontWeight: '700' }}>₹{cartTotal.toLocaleString('en-IN')}</Text>
                  </Text>
                  <View style={{ padding: 8, backgroundColor: '#FFF', borderRadius: borderRadius.xs, marginVertical: 4 }}>
                    <QrCode color="#000" size={64} />
                  </View>
                  <Text style={{ fontSize: 10, color: theme.textSecondary, letterSpacing: 0.5 }}>
                    UPI ID: <Text style={{ color: theme.primary, fontWeight: '700' }}>np_branding@upi</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, fontStyle: 'italic' }}>
                    Waiting for payment in shop UPI app...
                  </Text>
                </View>
              )}

              {paymentMethod === 'CARD' && (
                <View style={{ gap: 6, alignItems: 'center' }}>
                  <Text style={[styles.paymentBoxTitle, { color: theme.text }]}>PAY VIA CARD</Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    Amount to collect: <Text style={{ color: theme.primary, fontWeight: '700' }}>₹{cartTotal.toLocaleString('en-IN')}</Text>
                  </Text>
                  <CardIcon color={theme.primary} size={36} />
                  <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}>
                    Use the shop's physical card machine / POS terminal.
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, fontStyle: 'italic' }}>
                    Waiting for card payment approval...
                  </Text>
                </View>
              )}

              {/* Confirm Payment Action Button */}
              {!paymentConfirmed ? (
                <TouchableOpacity
                  style={[
                    styles.confirmPaymentBtn,
                    { backgroundColor: theme.primary },
                    (cart.length === 0 || (paymentMethod === 'CASH' && !isCashSufficient)) && { opacity: 0.5 },
                  ]}
                  onPress={handleConfirmPayment}
                  disabled={cart.length === 0 || (paymentMethod === 'CASH' && !isCashSufficient)}
                >
                  <CheckCircle2 color="#FFF" size={16} />
                  <Text style={styles.confirmPaymentText}>PAYMENT RECEIVED</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.confirmedBadge, { backgroundColor: theme.success + '20', borderColor: theme.success }]}>
                  <CheckCircle2 color={theme.success} size={16} />
                  <Text style={[styles.confirmedText, { color: theme.success }]}>✓ PAYMENT CONFIRMED</Text>
                </View>
              )}
            </View>

            {/* Complete Sale Button */}
            <TouchableOpacity
              style={[
                styles.completeSaleBtn,
                { backgroundColor: paymentConfirmed ? theme.primary : theme.border },
                (!paymentConfirmed || cart.length === 0 || isSubmitting) && { opacity: 0.6 },
                paymentConfirmed && shadows.glow,
              ]}
              onPress={handleCompleteSale}
              disabled={!paymentConfirmed || cart.length === 0 || isSubmitting}
            >
              <CircleCheck color="#FFFFFF" size={22} />
              <Text style={styles.completeSaleText}>
                {isSubmitting ? 'Processing Transaction...' : 'COMPLETE SALE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Invoice Receipt Modal */}
      <ReceiptModal
        visible={!!completedSale}
        sale={completedSale}
        onClose={() => setCompletedSale(null)}
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
  toast: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.s,
    gap: spacing.s,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  toastText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  mainLayout: { flex: 1, padding: spacing.m, gap: spacing.m },
  desktopRow: { flexDirection: 'row' },
  mobileCol: { flexDirection: 'column' },

  // Left Panel
  leftPanel: { flex: 1, gap: spacing.m },
  scanHeaderCard: { padding: spacing.m, borderRadius: borderRadius.s, borderWidth: 1, gap: spacing.s },
  scanStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scannerConnectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scanConnectedText: { fontSize: 11, fontWeight: '700' },
  barcodeInputRow: { flexDirection: 'row', gap: spacing.s },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.xs, paddingHorizontal: spacing.m, height: 44, gap: spacing.s },
  barcodeInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  addBarcodeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.l, borderRadius: borderRadius.xs, gap: 6, justifyContent: 'center' },
  addBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  catalogSearchRow: {},
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.xs, paddingHorizontal: spacing.m, height: 40, gap: spacing.s },
  searchInput: { flex: 1, fontSize: 13 },
  catalogScroll: { flex: 1 },
  catalogGridContent: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.m, paddingBottom: spacing.l },
  productCard: { width: '31%', minWidth: 150, padding: spacing.m, borderRadius: borderRadius.xs, borderWidth: 1, gap: 4 },
  productCardTop: { alignItems: 'flex-start', marginBottom: 2 },
  productName: { fontSize: 14, fontWeight: '700' },
  productVariantText: { fontSize: 11, fontWeight: '600' },
  productBarcode: { fontSize: 10 },
  productCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  productPrice: { fontSize: 15, fontWeight: '700' },
  plusIconCirc: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  // Right Panel
  rightPanel: { flex: 1, borderRadius: borderRadius.s, borderWidth: 1, overflow: 'hidden' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.m, borderBottomWidth: 1 },
  cartHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  cartTitle: { fontSize: 15, fontWeight: '700' },
  clearCartText: { fontSize: 12, fontWeight: '600' },

  cartList: { flex: 1 },
  cartListContent: { padding: spacing.m },
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.m, borderBottomWidth: 1 },
  cartItemInfo: { flex: 1, gap: 2 },
  cartItemName: { fontSize: 13, fontWeight: '700' },
  cartItemVariant: { fontSize: 11, fontWeight: '600' },
  cartItemBarcode: { fontSize: 10 },
  cartItemUnitPrice: { fontSize: 11 },
  cartQtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.m },
  qtyBtn: { width: 28, height: 28, borderRadius: borderRadius.xs, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center' },
  cartItemRight: { alignItems: 'flex-end', gap: 4 },
  cartItemTotal: { fontSize: 14, fontWeight: '700' },
  removeBtn: { padding: 4 },

  emptyCartBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: spacing.s },
  emptyCartTitle: { fontSize: 16, fontWeight: '700' },
  emptyCartSub: { fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },

  // Checkout Section
  checkoutSection: { padding: spacing.m, borderTopWidth: 1, gap: spacing.s },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discountLabelBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountLabelText: { fontSize: 12, fontWeight: '600' },
  discountInput: { width: 80, height: 32, borderWidth: 1, borderRadius: borderRadius.xs, textAlign: 'right', paddingHorizontal: 8, fontSize: 13, fontWeight: '600' },

  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtotalLabel: { fontSize: 12 },
  subtotalVal: { fontSize: 13, fontWeight: '600' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 },
  grandTotalLabel: { fontSize: 15, fontWeight: '700' },
  grandTotalVal: { fontSize: 20, fontWeight: '700' },

  paymentSelectLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  paymentSelectorRow: { flexDirection: 'row', gap: spacing.s },
  paymentOptionBtn: { flex: 1, height: 36, borderWidth: 1, borderRadius: borderRadius.xs, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  paymentOptionText: { fontSize: 11, fontWeight: '600' },

  paymentBox: { padding: spacing.m, borderRadius: borderRadius.xs, borderWidth: 1, gap: spacing.s },
  paymentBoxTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cashInput: { width: 100, height: 32, borderWidth: 1, borderRadius: borderRadius.xs, textAlign: 'right', paddingHorizontal: 8, fontSize: 14, fontWeight: '700' },
  confirmPaymentBtn: { height: 36, borderRadius: borderRadius.xs, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
  confirmPaymentText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  confirmedBadge: { height: 36, borderRadius: borderRadius.xs, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
  confirmedText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  completeSaleBtn: { height: 48, borderRadius: borderRadius.xs, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  completeSaleText: { color: '#FFF', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
});
