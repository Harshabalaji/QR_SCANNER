import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Search, Plus, RefreshCw, Edit, Barcode as BarcodeIcon, Printer, X, CheckCircle2 } from 'lucide-react-native';
import { useStore, Product } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius, shadows } from '../theme/theme';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { api } from '../services/api';

export default function Inventory() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { isDarkMode, inventory, refreshProducts, addProduct, updateProduct } = useStore();
  const theme = isDarkMode ? darkColors : colors;
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'PRICE' | 'STOCK'>('NAME');

  // Add/Edit Product Modal State
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Kurti');
  const [formSize, setFormSize] = useState('M');
  const [formColor, setFormColor] = useState('Pink');
  const [formPrice, setFormPrice] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formStock, setFormStock] = useState('5');
  const [formBarcode, setFormBarcode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Restock Modal State
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [restockReason, setRestockReason] = useState('RESTOCK');
  const [isRestocking, setIsRestocking] = useState(false);

  // Print Barcode Tag Modal State
  const [printProduct, setPrintProduct] = useState<Product | null>(null);

  // Open Add Modal from route params if requested
  useEffect(() => {
    if (route.params?.openAddModal) {
      openAddModal(route.params.initialBarcode || '');
    }
  }, [route.params]);

  // USB Barcode scanner support
  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      const product = inventory.find((p) => p.barcode === barcode);
      if (product) navigation.navigate('ProductDetail', { product });
      else setSearch(barcode);
    },
    [inventory, navigation]
  );
  useBarcodeScanner({ enabled: true, onScan: handleBarcodeScan });

  const categories = Array.from(new Set(inventory.map((p) => p.category || 'General')));

  // Filter & Sort inventory
  const filtered = inventory
    .filter((p) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.size.toLowerCase().includes(q) ||
        (p.color ? p.color.toLowerCase().includes(q) : false);

      const matchesCategory = selectedCategory ? (p.category || 'General') === selectedCategory : true;

      const isLow = p.stock <= (p.lowStockThreshold || 5) && p.stock > 0;
      const isOut = p.stock === 0;

      let matchesStock = true;
      if (stockFilter === 'IN_STOCK') matchesStock = p.stock > 0;
      else if (stockFilter === 'LOW_STOCK') matchesStock = isLow;
      else if (stockFilter === 'OUT_OF_STOCK') matchesStock = isOut;

      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === 'PRICE') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'STOCK') return b.stock - a.stock;
      return a.name.localeCompare(b.name);
    });

  const totalUnits = inventory.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = inventory.filter((p) => p.stock <= (p.lowStockThreshold || 5) && p.stock > 0).length;
  const outOfStockCount = inventory.filter((p) => p.stock === 0).length;

  const openAddModal = (initialBarcode = '') => {
    setEditingProductId(null);
    setFormName('');
    setFormCategory('Kurti');
    setFormSize('M');
    setFormColor('Pink');
    setFormPrice('1299');
    setFormPurchasePrice('450');
    setFormStock('5');
    setFormBarcode(initialBarcode || generateBarcodeString());
    setFormDescription('');
    setFormError(null);
    setProductModalVisible(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProductId(p.id);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormSize(p.size || 'M');
    setFormColor(p.color || 'Pink');
    setFormPrice(String(p.sellingPrice));
    setFormPurchasePrice(String(p.purchasePrice || '0'));
    setFormStock(String(p.stock));
    setFormBarcode(p.barcode);
    setFormDescription(p.description || '');
    setFormError(null);
    setProductModalVisible(true);
  };

  const generateBarcodeString = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(100 + Math.random() * 900).toString();
    return `100${timestamp}${random}`.slice(0, 13);
  };

  const handleSaveProduct = async () => {
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Product name is required');
      return;
    }
    if (!formBarcode.trim()) {
      setFormError('Barcode is required');
      return;
    }
    const priceVal = Number(formPrice || 0);
    if (priceVal <= 0) {
      setFormError('Selling price must be greater than 0');
      return;
    }

    const payload: Partial<Product> = {
      name: formName.trim(),
      category: formCategory.trim(),
      size: formSize.trim(),
      color: formColor.trim(),
      price: priceVal,
      sellingPrice: priceVal,
      purchasePrice: Number(formPurchasePrice || 0),
      stock: Math.max(0, Number(formStock || 0)),
      barcode: formBarcode.trim(),
      description: formDescription.trim(),
    };

    if (editingProductId) {
      const res = await updateProduct(editingProductId, payload);
      if (!res.success) {
        setFormError(res.error || 'Failed to update product');
        return;
      }
    } else {
      const res = await addProduct(payload);
      if (!res.success) {
        setFormError(res.error || 'Failed to create product');
        return;
      }
    }

    setProductModalVisible(false);
  };

  const handleSaveRestock = async () => {
    if (!restockProduct) return;
    const addQty = Number(restockQty || 0);
    if (addQty <= 0) return;
    setIsRestocking(true);
    await api.restockProduct(restockProduct.id, addQty, restockReason);
    await refreshProducts();
    setIsRestocking(false);
    setRestockProduct(null);
  };

  const handlePrintBarcode = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const isLowStock = item.stock <= (item.lowStockThreshold || 5) && item.stock > 0;
    const isOutOfStock = item.stock === 0;

    if (isDesktop) {
      return (
        <View style={[styles.tableRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.colProduct}>
            <Text style={[styles.nameText, { color: theme.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.variantTag, { color: theme.primary }]}>
              {item.color ? `${item.color} • ` : ''}Size {item.size || 'Free'}
            </Text>
            <Text style={[styles.barcodeText, { color: theme.textSecondary }]}>{item.barcode}</Text>
          </View>
          <Text style={[styles.colCategory, { color: theme.textSecondary }]}>{item.category || 'General'}</Text>
          <Text style={[styles.colPrice, { color: theme.primary }]}>
            ₹{item.sellingPrice.toLocaleString('en-IN')}
          </Text>
          <Text
            style={[
              styles.colStock,
              {
                color: isOutOfStock ? theme.error : isLowStock ? theme.warning : theme.primary,
                fontWeight: '700',
              },
            ]}
          >
            {item.stock} units
          </Text>
          <View style={styles.colStatus}>
            <StatusBadge
              status={isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'IN_STOCK'}
              size="small"
            />
          </View>
          <View style={styles.colActions}>
            <TouchableOpacity
              style={[styles.rowBtn, { borderColor: theme.border }]}
              onPress={() => setPrintProduct(item)}
            >
              <BarcodeIcon color={theme.textSecondary} size={13} />
              <Text style={[styles.rowBtnText, { color: theme.textSecondary }]}>TAG</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rowBtn, { borderColor: theme.border }]}
              onPress={() => setRestockProduct(item)}
            >
              <RefreshCw color={theme.textSecondary} size={13} />
              <Text style={[styles.rowBtnText, { color: theme.textSecondary }]}>RESTOCK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rowBtn, { borderColor: theme.border }]}
              onPress={() => openEditModal(item)}
            >
              <Edit color={theme.textSecondary} size={13} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          isOutOfStock
            ? { borderLeftColor: theme.error, borderLeftWidth: 3 }
            : isLowStock
            ? { borderLeftColor: theme.warning, borderLeftWidth: 3 }
            : {},
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={[styles.nameText, { color: theme.primary }]}>{item.name}</Text>
            <Text style={[styles.variantTag, { color: theme.primary }]}>
              {item.color ? `${item.color} • ` : ''}Size {item.size || 'Free'}
            </Text>
            <Text style={[styles.barcodeText, { color: theme.textSecondary }]}>{item.barcode}</Text>
          </View>
          <StatusBadge
            status={isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'IN_STOCK'}
            size="small"
          />
        </View>

        <View style={styles.cardMid}>
          <Text style={[styles.priceText, { color: theme.primary }]}>
            ₹{item.sellingPrice.toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.stockText, { color: theme.textSecondary }]}>
            Stock{' '}
            <Text
              style={{
                color: isOutOfStock ? theme.error : isLowStock ? theme.warning : theme.primary,
                fontWeight: '700',
              }}
            >
              {item.stock}
            </Text>
          </Text>
        </View>

        <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.cardBtn, { borderColor: theme.border }]}
            onPress={() => setPrintProduct(item)}
          >
            <BarcodeIcon color={theme.textSecondary} size={14} />
            <Text style={[styles.cardBtnText, { color: theme.textSecondary }]}>BARCODE TAG</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardBtn, { borderColor: theme.border }]}
            onPress={() => setRestockProduct(item)}
          >
            <RefreshCw color={theme.textSecondary} size={14} />
            <Text style={[styles.cardBtnText, { color: theme.textSecondary }]}>RESTOCK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cardBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => openEditModal(item)}
          >
            <Edit color={isDarkMode ? '#0D0D0D' : '#FFFFFF'} size={14} />
            <Text style={[styles.cardBtnText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>EDIT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Summary Bar */}
      <View style={[styles.summaryBar, { borderBottomColor: theme.border }]}>
        {[
          { label: 'PRODUCTS', value: inventory.length, color: theme.primary },
          { label: 'UNITS', value: totalUnits.toLocaleString('en-IN'), color: theme.primary },
          { label: 'LOW STOCK', value: lowStockCount, color: lowStockCount > 0 ? theme.warning : theme.primary },
          { label: 'OUT OF STOCK', value: outOfStockCount, color: outOfStockCount > 0 ? theme.error : theme.primary },
        ].map((s, i) => (
          <View
            key={s.label}
            style={[
              styles.summaryItem,
              i < 3 && { borderRightColor: theme.border, borderRightWidth: 1 },
            ]}
          >
            <Text style={[styles.summaryVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Controls Row */}
      <View style={[styles.controlsRow, { borderBottomColor: theme.border }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search color={theme.textSecondary} size={16} />
          <TextInput
            style={[styles.searchInput, { color: theme.primary }]}
            placeholder="Search by name, barcode, size (M/L), color..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => openAddModal()}
        >
          <Plus color={isDarkMode ? '#0D0D0D' : '#FFFFFF'} size={16} />
          <Text style={[styles.addBtnText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
            ADD PRODUCT
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stock Filter Chips */}
      <View style={[styles.chipsRow, { borderBottomColor: theme.border }]}>
        {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.chip,
              {
                borderColor: stockFilter === filter ? theme.primary : theme.border,
                backgroundColor: stockFilter === filter ? theme.primary : 'transparent',
              },
            ]}
            onPress={() => setStockFilter(filter)}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    stockFilter === filter
                      ? isDarkMode
                        ? '#0D0D0D'
                        : '#FFFFFF'
                      : theme.textSecondary,
                },
              ]}
            >
              {filter.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Desktop Table Header */}
      {isDesktop && (
        <View style={[styles.tableHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          {[
            { label: 'PRODUCT', style: styles.colProduct },
            { label: 'CATEGORY', style: styles.colCategory },
            { label: 'PRICE', style: styles.colPrice },
            { label: 'STOCK', style: styles.colStock },
            { label: 'STATUS', style: styles.colStatus },
            { label: 'ACTIONS', style: styles.colActions },
          ].map(({ label, style }) => (
            <Text key={label} style={[style, styles.thText, { color: theme.textSecondary }]}>
              {label}
            </Text>
          ))}
        </View>
      )}

      {/* Product List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Products Found"
            subtitle="Try adjusting your search filters or add a new clothing item."
            actionLabel="ADD CLOTHING ITEM"
            onAction={() => openAddModal()}
          />
        }
      />

      {/* Add / Edit Product Modal */}
      {productModalVisible && (
        <Modal transparent animationType="fade" visible={productModalVisible}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: theme.primary }]}>
                  {editingProductId ? 'EDIT CLOTHING ITEM' : 'ADD NEW CLOTHING ITEM'}
                </Text>
                <TouchableOpacity onPress={() => setProductModalVisible(false)}>
                  <X color={theme.textSecondary} size={20} />
                </TouchableOpacity>
              </View>

              {formError && (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              )}

              <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: spacing.m, paddingVertical: spacing.s }}>
                <View>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PRODUCT NAME *</Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                    placeholder="e.g. Floral Kurti"
                    placeholderTextColor={theme.textSecondary}
                    value={formName}
                    onChangeText={setFormName}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.m }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>CATEGORY</Text>
                    <TextInput
                      style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                      placeholder="e.g. Kurti, Shirts"
                      placeholderTextColor={theme.textSecondary}
                      value={formCategory}
                      onChangeText={setFormCategory}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>SIZE</Text>
                    <TextInput
                      style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                      placeholder="e.g. S, M, L, XL"
                      placeholderTextColor={theme.textSecondary}
                      value={formSize}
                      onChangeText={setFormSize}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.m }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>COLOR</Text>
                    <TextInput
                      style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                      placeholder="e.g. Pink, Blue"
                      placeholderTextColor={theme.textSecondary}
                      value={formColor}
                      onChangeText={setFormColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>STOCK QUANTITY</Text>
                    <TextInput
                      style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                      keyboardType="numeric"
                      placeholder="e.g. 5"
                      placeholderTextColor={theme.textSecondary}
                      value={formStock}
                      onChangeText={setFormStock}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.m }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>SELLING PRICE (₹) *</Text>
                    <TextInput
                      style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                      keyboardType="numeric"
                      placeholder="e.g. 1299"
                      placeholderTextColor={theme.textSecondary}
                      value={formPrice}
                      onChangeText={setFormPrice}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PURCHASE COST (₹)</Text>
                    <TextInput
                      style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                      keyboardType="numeric"
                      placeholder="e.g. 450"
                      placeholderTextColor={theme.textSecondary}
                      value={formPurchasePrice}
                      onChangeText={setFormPurchasePrice}
                    />
                  </View>
                </View>

                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>BARCODE (EAN/CODE128) *</Text>
                    <TouchableOpacity onPress={() => setFormBarcode(generateBarcodeString())}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary }}>
                        [ GENERATE BARCODE ]
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                    placeholder="e.g. 100002"
                    placeholderTextColor={theme.textSecondary}
                    value={formBarcode}
                    onChangeText={setFormBarcode}
                  />
                </View>

                <View>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>DESCRIPTION</Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                    placeholder="Optional item notes"
                    placeholderTextColor={theme.textSecondary}
                    value={formDescription}
                    onChangeText={setFormDescription}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => setProductModalVisible(false)}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveProduct}
                >
                  <Text style={[styles.saveText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
                    SAVE PRODUCT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Restock Modal */}
      {restockProduct && (
        <Modal transparent animationType="fade" visible={!!restockProduct}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.modalEyebrow, { color: theme.primary }]}>STOCK MANAGEMENT</Text>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>{restockProduct.name}</Text>
              <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                Current Stock: {restockProduct.stock} units
              </Text>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>ADD QUANTITY</Text>
              <TextInput
                style={[styles.inputField, { color: theme.primary, borderColor: theme.border }]}
                value={restockQty}
                onChangeText={setRestockQty}
                keyboardType="numeric"
                placeholder="Units to add"
                placeholderTextColor={theme.textSecondary}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => setRestockProduct(null)}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveRestock}
                  disabled={isRestocking}
                >
                  <Text style={[styles.saveText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
                    {isRestocking ? 'Saving…' : 'CONFIRM RESTOCK'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Printable Clothing Barcode Tag Modal */}
      {printProduct && (
        <Modal transparent animationType="fade" visible={!!printProduct}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: '#FFFFFF', borderColor: '#E8E2DA', maxWidth: 420 }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', letterSpacing: 2 }}>
                  PRINTABLE CLOTHING TAG
                </Text>
                <TouchableOpacity onPress={() => setPrintProduct(null)}>
                  <X color="#8A8177" size={20} />
                </TouchableOpacity>
              </View>

              {/* Tag Ticket Graphic */}
              <View style={styles.printableTagContainer}>
                <Text style={styles.tagBrand}>NP_BRANDING</Text>
                <Text style={styles.tagSubBrand}>LADIES FASHION</Text>

                <View style={styles.tagDivider} />

                <Text style={styles.tagProductName}>{printProduct.name}</Text>
                <Text style={styles.tagMeta}>
                  {printProduct.color ? `${printProduct.color} • ` : ''}SIZE: {printProduct.size || 'FREE'}
                </Text>

                <Text style={styles.tagPrice}>₹{printProduct.sellingPrice.toLocaleString('en-IN')}</Text>

                <View style={styles.barcodeGraphicsBox}>
                  {/* Barcode lines emulation */}
                  <View style={styles.barcodeLinesRow}>
                    {[4, 2, 6, 2, 4, 8, 2, 6, 2, 4, 6, 2, 4, 8, 2, 4, 6, 2, 4, 6].map((w, i) => (
                      <View key={i} style={{ width: w, height: 40, backgroundColor: '#1A1A1A' }} />
                    ))}
                  </View>
                  <Text style={styles.barcodeDigitsText}>{printProduct.barcode}</Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: '#E8E2DA' }]} onPress={() => setPrintProduct(null)}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A8177' }}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#1A1A1A' }]}
                  onPress={handlePrintBarcode}
                >
                  <Printer color="#FFFFFF" size={16} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 2 }}>
                    PRINT BARCODE
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  summaryBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.m,
    gap: 2,
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.m,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.m,
    height: 44,
    gap: spacing.s,
  },
  searchInput: { flex: 1, fontSize: 14 },
  addBtn: {
    height: 44,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    gap: spacing.s,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
  },
  chip: {
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
  },
  chipText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderBottomWidth: 1,
  },
  thText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.m - 2,
    paddingHorizontal: spacing.m,
    borderBottomWidth: 1,
  },
  colProduct: { flex: 3 },
  colCategory: { flex: 1.5, fontSize: 13 },
  colPrice: { flex: 1.5, fontSize: 13, fontWeight: '600' },
  colStock: { flex: 1.5, fontSize: 13 },
  colStatus: { flex: 1.5 },
  colActions: { flex: 2, flexDirection: 'row', gap: spacing.s },
  nameText: { fontSize: 13, fontWeight: '700' },
  variantTag: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  barcodeText: { fontSize: 10, marginTop: 1 },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    gap: 4,
  },
  rowBtnText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.s,
    marginHorizontal: spacing.m,
    marginBottom: spacing.s,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.m,
    paddingBottom: spacing.s,
  },
  cardTopLeft: { flex: 1 },
  cardMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
  },
  priceText: { fontSize: 18, fontWeight: '700' },
  stockText: { fontSize: 13 },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  cardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.s + 2,
    gap: 6,
  },
  cardBtnText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  listContent: { paddingTop: spacing.m, paddingBottom: spacing.xxl },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    padding: spacing.l,
    borderWidth: 1,
    borderRadius: borderRadius.m,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  modalEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5, marginBottom: 4 },
  modalTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  modalSub: { fontSize: 13, marginBottom: spacing.m },
  inputLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  inputField: {
    fontSize: 14,
    borderBottomWidth: 1,
    paddingVertical: spacing.xs,
    marginBottom: spacing.s,
  },
  formErrorBox: {
    backgroundColor: '#FFEAE6',
    padding: spacing.s,
    borderRadius: borderRadius.xs,
    marginBottom: spacing.s,
  },
  formErrorText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.m },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 12, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  saveText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  printableTagContainer: {
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderStyle: 'dashed',
    borderRadius: borderRadius.m,
    padding: spacing.l,
    alignItems: 'center',
    marginVertical: spacing.m,
    backgroundColor: '#FAF9F7',
  },
  tagBrand: { fontSize: 18, fontWeight: '900', letterSpacing: 4, color: '#1A1A1A' },
  tagSubBrand: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: '#8A8177', marginTop: 2 },
  tagDivider: { width: '80%', height: 1, backgroundColor: '#E8E2DA', marginVertical: spacing.m },
  tagProductName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  tagMeta: { fontSize: 12, fontWeight: '600', color: '#8A8177', marginTop: 2 },
  tagPrice: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', marginVertical: spacing.s },
  barcodeGraphicsBox: { alignItems: 'center', marginTop: spacing.xs },
  barcodeLinesRow: { flexDirection: 'row', gap: 2, alignItems: 'center', marginVertical: 4 },
  barcodeDigitsText: { fontSize: 13, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 3, color: '#1A1A1A' },
});
