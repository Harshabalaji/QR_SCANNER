import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useStore, Product } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius, shadows } from '../theme/theme';
import { Search, ShoppingBag, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const FRAME_SIZE = Math.min(width * 0.68, 260);
const ACCENT = '#C9A99A';

export default function Scanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { inventory, isDarkMode, addToHistory, addToCart } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  const laserAnim = useRef(new Animated.Value(0)).current;
  const laserLoop = useRef<Animated.CompositeAnimation | null>(null);

  // USB/Bluetooth hardware scanner keyboard buffer
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (e) {
        setHasPermission(false);
      }
    })();
  }, []);

  // USB/Bluetooth Keyboard Scanner Global Listener (for Desktop/Web)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing into an input field explicitly
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      const currentTime = Date.now();

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.trim().length >= 3) {
          const barcode = barcodeBuffer.current.trim();
          handleSearchBarcode(barcode);
          barcodeBuffer.current = '';
        }
      } else if (e.key.length === 1) {
        // Fast typing buffer (USB scanners send keystrokes within 20-50ms)
        if (currentTime - lastKeyTime.current > 300) {
          barcodeBuffer.current = '';
        }
        barcodeBuffer.current += e.key;
        lastKeyTime.current = currentTime;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventory]);

  useEffect(() => {
    if (isFocused) {
      setScanned(false);
      setScannedProduct(null);
      setNotFoundBarcode(null);

      laserLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: FRAME_SIZE,
            duration: 1800,
            useNativeDriver: false,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: false,
          }),
        ])
      );
      laserLoop.current.start();
    } else {
      laserLoop.current?.stop();
      laserAnim.setValue(0);
    }
    return () => laserLoop.current?.stop();
  }, [isFocused]);

  const handleSearchBarcode = (barcodeToSearch: string) => {
    const cleanCode = barcodeToSearch.trim();
    if (!cleanCode) return;

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    }

    const product = inventory.find(
      (p) => p.barcode.toLowerCase() === cleanCode.toLowerCase() || p.id === cleanCode
    );

    if (product) {
      addToHistory(product);
      setScannedProduct(product);
      setNotFoundBarcode(null);
      setScanned(true);
    } else {
      setScannedProduct(null);
      setNotFoundBarcode(cleanCode);
      setScanned(true);
    }
  };

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    handleSearchBarcode(data);
  };

  const handleAddToCart = () => {
    if (!scannedProduct) return;
    const err = addToCart(scannedProduct, 1);
    if (err) {
      alert(err);
    } else {
      setAddedMessage(`"${scannedProduct.name}" added to POS Cart!`);
      setTimeout(() => setAddedMessage(null), 3000);
    }
  };

  const handleResetScan = () => {
    setScanned(false);
    setScannedProduct(null);
    setNotFoundBarcode(null);
    setManualInput('');
  };

  const bg = isDarkMode ? '#0D0D0D' : '#FAF9F7';
  const fg = isDarkMode ? '#F5F0EB' : '#1A1A1A';
  const sub = isDarkMode ? '#9E9589' : '#8A8177';
  const cardBg = isDarkMode ? '#1A1A1A' : '#FFFFFF';
  const brd = isDarkMode ? '#2D2D2D' : '#E8E2DA';

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={[styles.brandLabel, { color: ACCENT }]}>NP_BRANDING · POS SCANNER</Text>
        <Text style={[styles.title, { color: fg }]}>BARCODE & QR SCANNER</Text>
        <Text style={[styles.subtitle, { color: sub }]}>
          Scan clothing barcode tags via camera, USB scanner, or manual search
        </Text>
      </View>

      {/* Manual Input Search Bar */}
      <View style={[styles.searchCard, { backgroundColor: cardBg, borderColor: brd }]}>
        <Text style={[styles.searchLabel, { color: sub }]}>MANUAL BARCODE LOOKUP</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { color: fg, borderColor: brd, backgroundColor: bg }]}
            placeholder="Enter barcode e.g. 100002"
            placeholderTextColor={sub}
            value={manualInput}
            onChangeText={setManualInput}
            onSubmitEditing={() => handleSearchBarcode(manualInput)}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: fg }]}
            onPress={() => handleSearchBarcode(manualInput)}
          >
            <Search color={isDarkMode ? '#0D0D0D' : '#FFFFFF'} size={18} />
            <Text style={[styles.searchBtnText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
              SEARCH
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scanned Result Card / Product Not Found Card */}
      {scanned && scannedProduct && (
        <View style={[styles.resultCard, { backgroundColor: cardBg, borderColor: ACCENT }, shadows.medium]}>
          <View style={styles.resultBadgeRow}>
            <View style={[styles.successBadge, { backgroundColor: ACCENT + '20' }]}>
              <CheckCircle2 color={ACCENT} size={16} />
              <Text style={[styles.successBadgeText, { color: ACCENT }]}>PRODUCT FOUND</Text>
            </View>
            <Text style={[styles.barcodeTag, { color: sub }]}>Barcode: {scannedProduct.barcode}</Text>
          </View>

          <View style={styles.productDetailRow}>
            {scannedProduct.image ? (
              <Image source={{ uri: scannedProduct.image }} style={styles.productImg} />
            ) : (
              <View style={[styles.productImgPlaceholder, { backgroundColor: brd }]}>
                <ShoppingBag color={sub} size={32} />
              </View>
            )}

            <View style={styles.productInfo}>
              <Text style={[styles.productTitle, { color: fg }]}>{scannedProduct.name}</Text>
              <Text style={[styles.productMeta, { color: sub }]}>
                {scannedProduct.color ? `${scannedProduct.color} • ` : ''}Size {scannedProduct.size || 'Free'} | Category: {scannedProduct.category}
              </Text>

              <View style={styles.priceStockRow}>
                <Text style={[styles.priceText, { color: fg }]}>
                  ₹{scannedProduct.sellingPrice.toLocaleString('en-IN')}
                </Text>
                <View
                  style={[
                    styles.stockBadge,
                    {
                      backgroundColor:
                        scannedProduct.stock > 0
                          ? scannedProduct.stock <= scannedProduct.lowStockThreshold
                            ? '#FFF9E6'
                            : '#E6F9F0'
                          : '#FFEAE6',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stockText,
                      {
                        color:
                          scannedProduct.stock > 0
                            ? scannedProduct.stock <= scannedProduct.lowStockThreshold
                              ? '#D97706'
                              : '#059669'
                            : '#DC2626',
                      },
                    ]}
                  >
                    {scannedProduct.stock > 0
                      ? `Available Stock: ${scannedProduct.stock}`
                      : 'OUT OF STOCK'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {addedMessage && (
            <View style={styles.toastBox}>
              <CheckCircle2 color="#059669" size={16} />
              <Text style={styles.toastText}>{addedMessage}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.addPosBtn,
                {
                  backgroundColor: scannedProduct.stock > 0 ? fg : brd,
                  opacity: scannedProduct.stock > 0 ? 1 : 0.6,
                },
              ]}
              disabled={scannedProduct.stock <= 0}
              onPress={handleAddToCart}
            >
              <ShoppingBag color={isDarkMode ? '#0D0D0D' : '#FFFFFF'} size={18} />
              <Text style={[styles.addPosBtnText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
                ADD TO POS CART
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.resetBtn, { borderColor: brd }]} onPress={handleResetScan}>
              <RefreshCw color={sub} size={16} />
              <Text style={[styles.resetBtnText, { color: sub }]}>SCAN AGAIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {scanned && notFoundBarcode && (
        <View style={[styles.resultCard, { backgroundColor: cardBg, borderColor: '#DC2626' }, shadows.medium]}>
          <View style={styles.notFoundHeader}>
            <AlertCircle color="#DC2626" size={28} />
            <View>
              <Text style={[styles.notFoundTitle, { color: fg }]}>PRODUCT NOT FOUND</Text>
              <Text style={[styles.notFoundSub, { color: sub }]}>Barcode: {notFoundBarcode}</Text>
            </View>
          </View>
          <Text style={[styles.notFoundDesc, { color: sub }]}>
            No clothing item registered in database matching barcode "{notFoundBarcode}".
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.addPosBtn, { backgroundColor: fg }]}
              onPress={() => navigation.navigate('Inventory', { openAddModal: true, initialBarcode: notFoundBarcode })}
            >
              <Text style={[styles.addPosBtnText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
                REGISTER NEW PRODUCT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.resetBtn, { borderColor: brd }]} onPress={handleResetScan}>
              <RefreshCw color={sub} size={16} />
              <Text style={[styles.resetBtnText, { color: sub }]}>TRY AGAIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Camera Live Scanner Box */}
      <View style={[styles.cameraContainer, { borderColor: brd, backgroundColor: cardBg }]}>
        <View style={styles.cameraHeader}>
          <Text style={[styles.cameraTitle, { color: fg }]}>CAMERA BARCODE DETECTOR</Text>
          <Text style={[styles.cameraHint, { color: sub }]}>Supports EAN-13, CODE-128, QR</Text>
        </View>

        {hasPermission === false ? (
          <View style={styles.noCamBox}>
            <Text style={[styles.noCamText, { color: sub }]}>
              Camera permission not granted. You can still scan using USB barcode scanner or manual search above.
            </Text>
          </View>
        ) : (
          <View style={styles.cameraBox}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
              }}
            >
              <View style={styles.overlay}>
                <View style={styles.top} />
                <View style={styles.middle}>
                  <View style={styles.side} />
                  <View style={[styles.frame, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
                    <View style={[styles.corner, styles.tl, { borderColor: ACCENT }]} />
                    <View style={[styles.corner, styles.tr, { borderColor: ACCENT }]} />
                    <View style={[styles.corner, styles.bl, { borderColor: ACCENT }]} />
                    <View style={[styles.corner, styles.br, { borderColor: ACCENT }]} />
                    <Animated.View
                      style={[
                        styles.laser,
                        {
                          backgroundColor: ACCENT,
                          transform: [{ translateY: laserAnim }],
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.side} />
                </View>
                <View style={styles.bottom} />
              </View>
            </CameraView>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: spacing.l,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    gap: spacing.l,
  },
  headerSection: {
    marginBottom: spacing.xs,
  },
  brandLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  searchCard: {
    borderWidth: 1,
    borderRadius: borderRadius.m,
    padding: spacing.m,
    gap: spacing.s,
  },
  searchLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: borderRadius.s,
    paddingHorizontal: spacing.m,
    fontSize: 14,
  },
  searchBtn: {
    height: 44,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  resultCard: {
    borderWidth: 1.5,
    borderRadius: borderRadius.l,
    padding: spacing.l,
    gap: spacing.m,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
    borderRadius: 20,
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  barcodeTag: {
    fontSize: 12,
    fontWeight: '600',
  },
  productDetailRow: {
    flexDirection: 'row',
    gap: spacing.m,
    alignItems: 'center',
  },
  productImg: {
    width: 80,
    height: 96,
    borderRadius: borderRadius.m,
  },
  productImgPlaceholder: {
    width: 80,
    height: 96,
    borderRadius: borderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  productMeta: {
    fontSize: 13,
  },
  priceStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
  },
  stockBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E6F9F0',
    padding: spacing.s,
    borderRadius: borderRadius.xs,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  addPosBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  addPosBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  resetBtn: {
    height: 44,
    paddingHorizontal: spacing.l,
    borderWidth: 1,
    borderRadius: borderRadius.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notFoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  notFoundSub: {
    fontSize: 12,
  },
  notFoundDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  cameraContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.l,
    overflow: 'hidden',
  },
  cameraHeader: {
    padding: spacing.m,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cameraTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cameraHint: {
    fontSize: 11,
    marginTop: 2,
  },
  noCamBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  noCamText: {
    fontSize: 13,
    textAlign: 'center',
  },
  cameraBox: {
    height: 320,
    width: '100%',
    position: 'relative',
  },
  overlay: { flex: 1 },
  top: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  middle: { flexDirection: 'row' },
  side: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  frame: { backgroundColor: 'transparent', overflow: 'hidden' },
  bottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  corner: { position: 'absolute', width: 24, height: 24, borderWidth: 2 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  laser: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.9,
  },
});
