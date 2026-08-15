import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Save, Trash2, CircleAlert } from 'lucide-react-native';
import { useStore, Product } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius } from '../theme/theme';

export default function ProductDetail() {
  const route      = useRoute<any>();
  const navigation = useNavigation<any>();
  const { product, barcode } = route.params || {};

  const { isDarkMode, addProduct, updateProduct, deleteProduct, inventory } = useStore();
  const theme    = isDarkMode ? darkColors : colors;
  const isEditing = !!product;
  const acc       = theme.accent; // dusty rose

  const [form, setForm] = useState<Partial<Product>>({
    id:                product?.id || Math.random().toString(36).substr(2, 9),
    name:              product?.name || '',
    sellingPrice:      product?.sellingPrice ?? product?.price ?? 0,
    purchasePrice:     product?.purchasePrice ?? 0,
    price:             product?.sellingPrice ?? product?.price ?? 0,
    size:              product?.size || '',
    category:          product?.category || '',
    stock:             product?.stock ?? 0,
    barcode:           product?.barcode || barcode || '',
    lowStockThreshold: product?.lowStockThreshold ?? 5,
    totalSold:         product?.totalSold ?? 0,
    description:       product?.description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Validation (unchanged) ──
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name?.trim())     newErrors.name = 'Product name is required';
    if (!form.barcode?.trim())  newErrors.barcode = 'Barcode is required';
    else if (!isEditing) {
      const existing = inventory.find((p) => p.barcode === form.barcode);
      if (existing) newErrors.barcode = `Barcode already exists (${existing.name})`;
    }
    if ((form.sellingPrice ?? 0) <= 0)   newErrors.sellingPrice = 'Selling price must be > 0';
    if ((form.stock ?? 0) < 0)           newErrors.stock = 'Stock cannot be negative';
    if ((form.lowStockThreshold ?? 0) < 0) newErrors.lowStockThreshold = 'Threshold cannot be negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Save (unchanged) ──
  const handleSave = () => {
    if (!validate()) return;
    const productData: Product = {
      id:                form.id!,
      name:              form.name!.trim(),
      sellingPrice:      form.sellingPrice ?? 0,
      purchasePrice:     form.purchasePrice ?? 0,
      price:             form.sellingPrice ?? 0,
      size:              form.size || '',
      color:             form.color || '',
      category:          form.category || '',
      stock:             form.stock ?? 0,
      barcode:           form.barcode!.trim(),
      lowStockThreshold: form.lowStockThreshold ?? 5,
      totalSold:         form.totalSold ?? 0,
      description:       form.description || '',
    };
    if (isEditing) updateProduct(product.id, productData);
    else addProduct(productData);
    navigation.goBack();
  };

  // ── Delete (unchanged) ──
  const handleDelete = () => {
    if (!isEditing) return;
    const doDelete = () => { deleteProduct(product.id); navigation.goBack(); };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this product? This action cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete Product', 'This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ── Field renderer ──
  const renderField = (
    label: string,
    key: keyof Product,
    options?: {
      keyboardType?: 'numeric' | 'default';
      editable?: boolean;
      multiline?: boolean;
      placeholder?: string;
    }
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          {
            color: theme.primary,
            borderBottomColor: errors[key] ? theme.error : theme.border,
          },
          options?.multiline && styles.multilineInput,
          options?.editable === false && { color: theme.textSecondary },
        ]}
        value={form[key]?.toString() || ''}
        onChangeText={(v) => {
          const value =
            options?.keyboardType === 'numeric' ? Number(v) || 0 : v;
          setForm({ ...form, [key]: value });
          if (errors[key]) {
            const e = { ...errors };
            delete e[key];
            setErrors(e);
          }
        }}
        keyboardType={options?.keyboardType || 'default'}
        editable={options?.editable !== false}
        multiline={options?.multiline}
        placeholder={options?.placeholder}
        placeholderTextColor={theme.textSecondary}
      />
      {errors[key] && (
        <View style={styles.errorRow}>
          <CircleAlert color={theme.error} size={13} strokeWidth={1.5} />
          <Text style={[styles.errorText, { color: theme.error }]}>{errors[key]}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.pageHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.pageEyebrow, { color: acc }]}>
          {isEditing ? 'EDIT PRODUCT' : 'NEW PRODUCT'}
        </Text>
        <Text style={[styles.pageTitle, { color: theme.primary }]}>
          {isEditing ? (form.name || 'Product') : 'Add to Collection'}
        </Text>
        {isEditing && (form.totalSold ?? 0) > 0 && (
          <View style={[styles.soldPill, { backgroundColor: acc + '20', borderColor: acc + '40' }]}>
            <View style={[styles.soldDot, { backgroundColor: acc }]} />
            <Text style={[styles.soldText, { color: acc }]}>
              {product.totalSold} units sold
            </Text>
          </View>
        )}
      </View>

      {/* ── Form Card ── */}
      <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>

        {/* Section: Identity */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PRODUCT IDENTITY</Text>

        {renderField('Product Name', 'name', { placeholder: 'e.g. Embroidered Kurta' })}
        {renderField('Barcode / QR', 'barcode', {
          editable: !isEditing,
          placeholder: 'Scan or enter barcode',
        })}

        {/* Section: Pricing */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: spacing.l }]}>
          PRICING
        </Text>
        <View style={styles.twoCol}>
          <View style={styles.colLeft}>
            {renderField('Selling Price (₹)', 'sellingPrice', { keyboardType: 'numeric' })}
          </View>
          <View style={styles.colRight}>
            {renderField('Purchase Price (₹)', 'purchasePrice', { keyboardType: 'numeric' })}
          </View>
        </View>

        {/* Section: Stock */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: spacing.l }]}>
          STOCK
        </Text>
        <View style={styles.twoCol}>
          <View style={styles.colLeft}>
            {renderField('Quantity', 'stock', { keyboardType: 'numeric' })}
          </View>
          <View style={styles.colRight}>
            {renderField('Low Stock Alert', 'lowStockThreshold', { keyboardType: 'numeric' })}
          </View>
        </View>

        {/* Section: Details */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: spacing.l }]}>
          DETAILS
        </Text>
        <View style={styles.twoCol}>
          <View style={styles.colLeft}>
            {renderField('Category', 'category', { placeholder: 'e.g. Ethnic Wear' })}
          </View>
          <View style={styles.colRight}>
            {renderField('Size', 'size', { placeholder: 'e.g. M / L / Free' })}
          </View>
        </View>

        {renderField('Description (optional)', 'description', {
          multiline: true,
          placeholder: 'Product notes or description…',
        })}
      </View>

      {/* ── Action Buttons ── */}
      <View style={styles.actions}>
        {isEditing && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: theme.error + '60' }]}
            onPress={handleDelete}
          >
            <Trash2 color={theme.error} size={18} strokeWidth={1.5} />
            <Text style={[styles.deleteBtnText, { color: theme.error }]}>DELETE</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary, flex: isEditing ? 2 : 1 }]}
          onPress={handleSave}
          activeOpacity={0.88}
        >
          <Save color={isDarkMode ? '#0D0D0D' : '#FFFFFF'} size={18} strokeWidth={1.5} />
          <Text style={[styles.saveBtnText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
            {isEditing ? 'UPDATE PRODUCT' : 'SAVE PRODUCT'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: spacing.xxl }} />
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

  // ── Header ──
  pageHeader: {
    padding: spacing.l,
    borderBottomWidth: 1,
    gap: 4,
  },
  pageEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 30,
  },
  soldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  soldDot: { width: 5, height: 5, borderRadius: 3 },
  soldText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  // ── Form ──
  formCard: {
    margin: spacing.m,
    padding: spacing.l,
    borderWidth: 1,
    borderRadius: borderRadius.s,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: spacing.m,
  },
  twoCol: { flexDirection: 'row' },
  colLeft:  { flex: 1, marginRight: spacing.s },
  colRight: { flex: 1, marginLeft: spacing.s },

  // ── Field ──
  fieldGroup: { marginBottom: spacing.l },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.2,
    borderBottomWidth: 1,
    paddingVertical: spacing.s,
  },
  multilineInput: { minHeight: 64, textAlignVertical: 'top', fontSize: 14 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  errorText: { fontSize: 11, fontWeight: '500' },

  // ── Actions ──
  actions: {
    flexDirection: 'row',
    gap: spacing.m,
    marginHorizontal: spacing.m,
    marginBottom: spacing.m,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    gap: spacing.s,
  },
  deleteBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    borderRadius: borderRadius.xs,
    gap: spacing.s,
  },
  saveBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
});
