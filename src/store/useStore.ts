import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../services/api';

// ─── User Model ──────────────────────────────────────────────
export interface User {
  id: number | string;
  name: string;
  username: string;
  role: 'cashier' | 'manager';
  is_active?: number;
  createdAt?: string;
}

// ─── Product Model ───────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  price: number;
  sellingPrice: number;
  purchasePrice: number;
  size: string;
  color?: string;
  category: string;
  stock: number;
  barcode: string;
  image?: string;
  lowStockThreshold: number;
  totalSold: number;
  description?: string;
}

// ─── Sale Models ─────────────────────────────────────────────
export interface SaleItem {
  id?: string;
  productId: string;
  productName: string;
  barcode: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  cashierId?: number | string;
  cashierName?: string;
  items: SaleItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus?: string;
  cashReceived?: number;
  changeAmount?: number;
  createdAt: string;
}

// ─── Cart Model ──────────────────────────────────────────────
export interface CartItem extends SaleItem {
  availableStock: number;
}

// ─── Dashboard Stats ─────────────────────────────────────────
export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  lowStockProducts?: number;
  outOfStockProducts?: number;
  totalSold: number;
  todaysSales: number;
  todaysItemsSold: number;
  totalSalesRevenue: number;
  totalSales?: number;
  totalProductsSold?: number;
  todaysProductsSold?: number;
  totalInventoryValue?: number;
  totalItemsSold: number;
  inventoryValue: number;
  thisWeekSales: number;
  thisMonthSales: number;
}

// ─── Store Interface ─────────────────────────────────────────
interface AppState {
  // Connection status
  isOnline: boolean;
  dbStatus: 'connected' | 'disconnected' | 'checking';
  dbMessage?: string;

  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Auth & RBAC User State
  user: User | null;
  token: string | null;
  usersList: User[];
  setUser: (user: User | null) => void;
  login: (role: string, pin: string, username?: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => Promise<void>;

  // User Management (Manager Only)
  fetchUsers: () => Promise<void>;
  createUser: (userData: { name: string; username: string; pin: string; role?: string }) => Promise<{ success: boolean; message?: string }>;
  toggleUserActive: (id: number | string) => Promise<{ success: boolean; message?: string }>;
  resetUserPin: (id: number | string, newPin: string) => Promise<{ success: boolean; message?: string }>;

  // Inventory
  inventory: Product[];
  setInventory: (items: Product[]) => void;
  addProduct: (product: Partial<Product>) => Promise<{ success: boolean; error?: string; product?: Product }>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  getProductByBarcode: (barcode: string) => Product | undefined;

  // Scan History
  scanHistory: Product[];
  addToHistory: (product: Product) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, qty?: number) => string | null;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => string | null;
  clearCart: () => void;

  // Sales
  sales: Sale[];
  completeSale: (paymentMethod?: string, discount?: number, tax?: number, cashReceived?: number) => Promise<{ success: boolean; error?: string; sale?: Sale }>;
  getSale: (id: string) => Sale | undefined;

  // Dashboard
  serverStats: DashboardStats | null;
  getDashboardStats: () => DashboardStats;
  fetchDashboardStats: () => Promise<void>;

  // Persistence & Data Loading
  loadState: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshSales: () => Promise<void>;
}

// ─── Helper: Normalize Product ──────────────────────────────
function normalizeProduct(p: any): Product {
  const selling = Number(p.sellingPrice ?? p.selling_price ?? p.price ?? 0);
  const purchase = Number(p.purchasePrice ?? p.purchase_price ?? 0);
  const stockQty = Number(p.stockQuantity ?? p.stock_quantity ?? p.stock ?? 0);
  const threshold = Number(p.lowStockThreshold ?? p.low_stock_threshold ?? 5);
  const sold = Number(p.totalSold ?? p.total_sold ?? 0);

  return {
    id: String(p.id),
    name: p.name || '',
    barcode: p.barcode || '',
    category: p.category || 'General',
    sellingPrice: selling,
    purchasePrice: purchase,
    price: selling,
    stock: stockQty,
    size: p.size || '',
    color: p.color || '',
    lowStockThreshold: threshold,
    totalSold: sold,
    description: p.description || '',
    image: p.image || p.image_url,
  };
}

export const useStore = create<AppState>((set, get) => ({
  // ─── Connection Status ───
  isOnline: false,
  dbStatus: 'checking',
  dbMessage: undefined,

  // ─── Theme ───
  isDarkMode: false,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  // ─── Auth State ───
  user: null,
  token: null,
  usersList: [],
  setUser: (user) => set({ user }),

  login: async (role, pin, username) => {
    const res = await api.login(pin, role, username);
    if (res.success && res.user && res.token) {
      set({ user: res.user, token: res.token });
      await AsyncStorage.setItem('auth_token', res.token);
      await AsyncStorage.setItem('auth_user', JSON.stringify(res.user));
      
      // Refresh inventory and sales with auth token
      get().refreshProducts();
      get().refreshSales();
      if (res.user.role === 'manager') {
        get().fetchDashboardStats();
        get().fetchUsers();
      }
      return { success: true, user: res.user };
    }
    return { success: false, message: res.message || 'Login failed' };
  },

  logout: async () => {
    await api.logout();
    set({ user: null, token: null, usersList: [] });
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
  },

  fetchUsers: async () => {
    const res = await api.getUsers();
    if (res.success && res.data) {
      set({ usersList: res.data });
    }
  },

  createUser: async (userData) => {
    const res = await api.createUser(userData);
    if (res.success) {
      get().fetchUsers();
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || 'Failed to create user' };
  },

  toggleUserActive: async (id) => {
    const res = await api.toggleUserActive(id);
    if (res.success) {
      get().fetchUsers();
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || 'Failed to toggle user status' };
  },

  resetUserPin: async (id, newPin) => {
    const res = await api.resetUserPin(id, newPin);
    if (res.success) {
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || 'Failed to reset PIN' };
  },

  // ─── Inventory ───
  inventory: [],
  setInventory: (items) => set({ inventory: items.map(normalizeProduct) }),

  addProduct: async (productData) => {
    const res = await api.createProduct(productData);
    if (res.success && res.data) {
      const newProd = normalizeProduct(res.data);
      const newInventory = [newProd, ...get().inventory];
      set({ inventory: newInventory });
      AsyncStorage.setItem('inventory', JSON.stringify(newInventory));
      get().fetchDashboardStats();
      return { success: true, product: newProd };
    }

    if (!get().isOnline) {
      const id = Date.now().toString();
      const selling = Number(productData.sellingPrice || productData.price || 0);
      const newProduct: Product = {
        id,
        name: productData.name || 'New Product',
        barcode: productData.barcode || id,
        category: productData.category || 'General',
        sellingPrice: selling,
        purchasePrice: Number(productData.purchasePrice || 0),
        price: selling,
        stock: Number(productData.stock || 0),
        size: productData.size || '',
        color: productData.color || '',
        lowStockThreshold: Number(productData.lowStockThreshold || 5),
        totalSold: 0,
        description: productData.description || '',
      };
      const updated = [newProduct, ...get().inventory];
      set({ inventory: updated });
      AsyncStorage.setItem('inventory', JSON.stringify(updated));
      return { success: true, product: newProduct };
    }

    return { success: false, error: res.message || 'Failed to create product' };
  },

  updateProduct: async (id, updates) => {
    const res = await api.updateProduct(id, updates);
    if (res.success && res.data) {
      const updatedProd = normalizeProduct(res.data);
      const updatedInv = get().inventory.map((p) => (p.id === id ? updatedProd : p));
      set({ inventory: updatedInv });
      AsyncStorage.setItem('inventory', JSON.stringify(updatedInv));
      get().fetchDashboardStats();
      return { success: true };
    }

    if (!get().isOnline) {
      const updatedInv = get().inventory.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );
      set({ inventory: updatedInv });
      AsyncStorage.setItem('inventory', JSON.stringify(updatedInv));
      return { success: true };
    }

    return { success: false, error: res.message || 'Failed to update product' };
  },

  deleteProduct: async (id) => {
    const res = await api.deleteProduct(id);
    if (res.success) {
      const updatedInv = get().inventory.filter((p) => p.id !== id);
      set({ inventory: updatedInv });
      AsyncStorage.setItem('inventory', JSON.stringify(updatedInv));
      get().fetchDashboardStats();
      return { success: true };
    }

    if (!get().isOnline) {
      const updatedInv = get().inventory.filter((p) => p.id !== id);
      set({ inventory: updatedInv });
      AsyncStorage.setItem('inventory', JSON.stringify(updatedInv));
      return { success: true };
    }

    return { success: false, error: res.message || 'Failed to delete product' };
  },

  getProductByBarcode: (barcode) => {
    return get().inventory.find((p) => p.barcode === barcode);
  },

  // ─── Scan History ───
  scanHistory: [],
  addToHistory: (product) => {
    set((state) => {
      const filtered = state.scanHistory.filter((p) => p.id !== product.id);
      return { scanHistory: [product, ...filtered].slice(0, 50) };
    });
  },

  // ─── Cart ───
  cart: [],

  addToCart: (product, qty = 1) => {
    const { cart } = get();
    const existing = cart.find((item) => item.productId === product.id);
    const currentCartQty = existing ? existing.quantity : 0;
    const requestedQty = currentCartQty + qty;

    if (requestedQty > product.stock) {
      return `Insufficient stock for "${product.name}". Available: ${product.stock}, in cart: ${currentCartQty}`;
    }

    let updatedCart: CartItem[];
    if (existing) {
      updatedCart = cart.map((item) =>
        item.productId === product.id
          ? {
              ...item,
              quantity: requestedQty,
              totalPrice: requestedQty * item.unitPrice,
            }
          : item
      );
    } else {
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        size: product.size,
        color: product.color,
        quantity: qty,
        unitPrice: product.sellingPrice,
        totalPrice: qty * product.sellingPrice,
        availableStock: product.stock,
      };
      updatedCart = [...cart, newItem];
    }

    set({ cart: updatedCart });
    return null;
  },

  removeFromCart: (productId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.productId !== productId),
    }));
  },

  updateCartQty: (productId, qty) => {
    const { cart } = get();
    const item = cart.find((i) => i.productId === productId);
    if (!item) return 'Item not in cart';

    if (qty <= 0) {
      get().removeFromCart(productId);
      return null;
    }

    if (qty > item.availableStock) {
      return `Cannot set quantity to ${qty}. Maximum available stock is ${item.availableStock}.`;
    }

    const updatedCart = cart.map((i) =>
      i.productId === productId
        ? { ...i, quantity: qty, totalPrice: qty * i.unitPrice }
        : i
    );

    set({ cart: updatedCart });
    return null;
  },

  clearCart: () => set({ cart: [] }),

  // ─── Sales ───
  sales: [],

  completeSale: async (paymentMethod = 'CASH', discount = 0, tax = 0, cashReceived?: number) => {
    const { cart } = get();
    if (cart.length === 0) {
      return { success: false, error: 'Cart is empty' };
    }

    const payload = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
    }));

    const res = await api.createSale(payload, paymentMethod, discount, tax, cashReceived);

    if (res.success && res.data) {
      const newSale = res.data;
      set((state) => ({
        sales: [newSale, ...state.sales],
        cart: [],
      }));

      await get().refreshProducts();
      await get().fetchDashboardStats();

      return { success: true, sale: newSale };
    }

    return {
      success: false,
      error: res.message || 'Failed to process sale transaction',
    };
  },

  getSale: (id) => get().sales.find((s) => s.id === id),

  // ─── Dashboard Stats ───
  serverStats: null,

  fetchDashboardStats: async () => {
    const res = await api.getDashboardStats();
    if (res.success && res.data) {
      set({ serverStats: res.data });
    }
  },

  getDashboardStats: () => {
    const { serverStats, inventory, sales } = get();
    if (serverStats) {
      return {
        totalProducts: serverStats.totalProducts,
        lowStockCount: serverStats.lowStockProducts ?? serverStats.lowStockCount ?? 0,
        totalSold: serverStats.totalProductsSold ?? serverStats.totalSold ?? 0,
        todaysSales: serverStats.todaysSales,
        todaysItemsSold: serverStats.todaysProductsSold ?? serverStats.todaysItemsSold ?? 0,
        totalSalesRevenue: serverStats.totalSales ?? serverStats.totalSalesRevenue ?? 0,
        totalItemsSold: serverStats.totalProductsSold ?? 0,
        inventoryValue: serverStats.totalInventoryValue ?? 0,
        thisWeekSales: 0,
        thisMonthSales: 0,
      };
    }

    const todayStr = new Date().toDateString();
    let todaysSales = 0;
    let todaysItemsSold = 0;
    let totalSalesRevenue = 0;
    let totalItemsSold = 0;

    sales.forEach((s) => {
      totalSalesRevenue += s.totalAmount;
      const sItems = s.items.reduce((acc, i) => acc + i.quantity, 0);
      totalItemsSold += sItems;
      if (new Date(s.createdAt).toDateString() === todayStr) {
        todaysSales += s.totalAmount;
        todaysItemsSold += sItems;
      }
    });

    const lowStockCount = inventory.filter((p) => p.stock <= p.lowStockThreshold).length;
    const inventoryValue = inventory.reduce((sum, p) => sum + p.stock * p.sellingPrice, 0);

    return {
      totalProducts: inventory.length,
      lowStockCount,
      totalSold: totalItemsSold,
      todaysSales,
      todaysItemsSold,
      totalSalesRevenue,
      totalItemsSold,
      inventoryValue,
      thisWeekSales: 0,
      thisMonthSales: 0,
    };
  },

  // ─── Data Persistence ───
  loadState: async () => {
    try {
      // Always require fresh manual login on app startup & refresh
      setAuthToken(null);
      set({ token: null, user: null, usersList: [] });
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');

      // 2. Health check MySQL API
      const healthRes = await api.getHealth();
      if (healthRes.success && healthRes.database === 'connected') {
        set({ isOnline: true, dbStatus: 'connected', dbMessage: undefined });

        if (get().user) {
          await get().refreshProducts();
          await get().refreshSales();
          if (get().user?.role === 'manager') {
            await get().fetchDashboardStats();
            await get().fetchUsers();
          }
        }
        return;
      }

      set({
        isOnline: false,
        dbStatus: 'disconnected',
        dbMessage: healthRes.message || 'Offline mode',
      });
    } catch (e) {
      set({ isOnline: false, dbStatus: 'disconnected', dbMessage: 'Offline' });
    }
  },

  refreshProducts: async () => {
    const res = await api.getProducts();
    if (res.success && res.data) {
      const normalized = res.data.map(normalizeProduct);
      set({ inventory: normalized });
      AsyncStorage.setItem('inventory', JSON.stringify(normalized));
    }
  },

  refreshSales: async () => {
    const res = await api.getSales();
    if (res.success && res.data) {
      set({ sales: res.data });
    }
  },
}));
