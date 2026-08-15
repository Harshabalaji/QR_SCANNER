import { Product, Sale, DashboardStats, User } from '../store/useStore';

const API_BASE_URL = 'http://localhost:5000/api';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  user?: User;
  token?: string;
  available?: number;
  database?: string;
  error?: string;
}

/**
 * Helper to handle fetch requests with timeout and json parsing.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: json.message || `Request failed with status ${response.status}`,
        available: json.available,
      };
    }

    return json;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Server connection timed out',
      };
    }
    return {
      success: false,
      message: 'Server connection unavailable. Make sure backend is running on http://localhost:5000.',
    };
  }
}

export const api = {
  /**
   * Auth: Secure Login
   */
  async login(pin: string, role: string, username?: string): Promise<ApiResponse<{ token: string; user: User }>> {
    const res = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ pin, role, username }),
    });
    if (res.success && res.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  /**
   * Auth: Get Current Authenticated Profile
   */
  async getMe(): Promise<ApiResponse<User>> {
    return request<User>('/auth/me');
  },

  /**
   * Auth: Logout
   */
  async logout(): Promise<ApiResponse> {
    const res = await request('/auth/logout', { method: 'POST' });
    setAuthToken(null);
    return res;
  },

  /**
   * User Management (Manager Only)
   */
  async getUsers(): Promise<ApiResponse<User[]>> {
    return request<User[]>('/users');
  },

  async createUser(userData: { name: string; username: string; pin: string; role?: string }): Promise<ApiResponse<User>> {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async toggleUserActive(id: number | string): Promise<ApiResponse> {
    return request(`/users/${id}/toggle-active`, {
      method: 'PUT',
    });
  },

  async resetUserPin(id: number | string, newPin: string): Promise<ApiResponse> {
    return request(`/users/${id}/reset-pin`, {
      method: 'PUT',
      body: JSON.stringify({ newPin }),
    });
  },

  /**
   * Health check endpoint testing MySQL database connection.
   */
  async getHealth(): Promise<ApiResponse> {
    return request('/health');
  },

  /**
   * Fetch all products from MySQL database.
   */
  async getProducts(): Promise<ApiResponse<Product[]>> {
    return request<Product[]>('/products');
  },

  /**
   * Search products by name, barcode, or category.
   */
  async searchProducts(query: string): Promise<ApiResponse<Product[]>> {
    return request<Product[]>(`/products/search?q=${encodeURIComponent(query)}`);
  },

  /**
   * Get product details by ID.
   */
  async getProductById(id: string): Promise<ApiResponse<Product>> {
    return request<Product>(`/products/${id}`);
  },

  /**
   * Lookup product by Barcode (used by USB, Camera, QR scanners).
   */
  async getProductByBarcode(barcode: string): Promise<ApiResponse<Product>> {
    return request<Product>(`/products/barcode/${encodeURIComponent(barcode)}`);
  },

  /**
   * Create a new product.
   */
  async createProduct(productData: Partial<Product>): Promise<ApiResponse<Product>> {
    return request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  /**
   * Update an existing product.
   */
  async updateProduct(id: string, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    return request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  /**
   * Delete a product.
   */
  async deleteProduct(id: string): Promise<ApiResponse> {
    return request(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Restock stock quantity for a product.
   */
  async restockProduct(id: string, addQuantity: number, reason = 'RESTOCK'): Promise<ApiResponse<Product>> {
    return request<Product>(`/products/${id}/restock`, {
      method: 'POST',
      body: JSON.stringify({ addQuantity, reason }),
    });
  },

  /**
   * Execute sale transaction with ACID transaction.
   */
  async createSale(
    items: { productId: string; quantity: number; size?: string; color?: string }[],
    paymentMethod = 'CASH',
    discount = 0,
    tax = 0,
    cashReceived?: number
  ): Promise<ApiResponse<Sale>> {
    return request<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify({ items, paymentMethod, discount, tax, cashReceived }),
    });
  },

  /**
   * Fetch all sales history.
   */
  async getSales(
    startDate?: string,
    endDate?: string,
    cashierId?: string | number,
    paymentMethod?: string
  ): Promise<ApiResponse<Sale[]>> {
    let endpoint = '/sales';
    const params = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (cashierId) params.push(`cashier_id=${cashierId}`);
    if (paymentMethod && paymentMethod !== 'ALL') params.push(`payment_method=${paymentMethod}`);
    if (params.length > 0) endpoint += `?${params.join('&')}`;

    return request<Sale[]>(endpoint);
  },

  /**
   * Get single sale detail invoice.
   */
  async getSaleById(id: string): Promise<ApiResponse<Sale>> {
    return request<Sale>(`/sales/${id}`);
  },

  /**
   * Fetch dashboard statistics computed directly from MySQL.
   */
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return request<DashboardStats>('/dashboard/stats');
  },

  /**
   * Fetch dashboard sales period overview.
   */
  async getSalesOverview(): Promise<ApiResponse<{ today: number; thisWeek: number; thisMonth: number }>> {
    return request('/dashboard/sales-overview');
  },

  /**
   * Fetch top selling products.
   */
  async getTopProducts(): Promise<ApiResponse<any[]>> {
    return request('/dashboard/top-products');
  },

  /**
   * Fetch today's sales breakdown by cashier.
   */
  async getCashierStats(): Promise<ApiResponse<{ cashierName: string; saleCount: number; totalRevenue: number }[]>> {
    return request('/dashboard/cashier-stats');
  },

  /**
   * Fetch today's sales breakdown by payment method.
   */
  async getPaymentStats(): Promise<ApiResponse<{ cash: number; upi: number; card: number; total: number }>> {
    return request('/dashboard/payment-stats');
  },
};
