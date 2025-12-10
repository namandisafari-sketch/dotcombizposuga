const LOCAL_API_URL = 'http://localhost:3001';

class LocalApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = LOCAL_API_URL) {
    this.baseUrl = baseUrl;
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }

  async put(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }

  async delete(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  }

  // Health check
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Backend health check failed with status:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('Backend health check success:', data);
      return data;
    } catch (error) {
      console.error('Local backend health check failed:', error);
      return null;
    }
  }

  // Auth token storage
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string) {
    localStorage.setItem('auth_token', token);
  }

  private removeToken() {
    localStorage.removeItem('auth_token');
  }

  // Authenticated request helper
  private async authenticatedRequest(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || response.statusText);
    }

    return response.json();
  }

  // Auth API
  auth = {
    register: async (email: string, password: string, full_name: string) => {
      const response = await this.post('/api/auth/register', { email, password, full_name });
      if (response.token) {
        this.setToken(response.token);
      }
      return response;
    },
    login: async (email: string, password: string) => {
      const response = await this.post('/api/auth/login', { email, password });
      if (response.token) {
        this.setToken(response.token);
      }
      return response;
    },
    logout: () => {
      this.removeToken();
    },
    getCurrentUser: () => this.authenticatedRequest('/api/auth/user'),
  };

  // Departments API
  departments = {
    getAll: () => this.authenticatedRequest('/api/departments'),
    create: (data: any) => this.authenticatedRequest('/api/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.authenticatedRequest(`/api/departments/${id}`, {
      method: 'DELETE',
    }),
  };

  // Customers API
  customers = {
    getAll: (departmentId?: string) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      return this.authenticatedRequest(`/api/customers?${queryParams.toString()}`);
    },
    getCount: (departmentId?: string) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      return this.authenticatedRequest(`/api/customers-count?${queryParams.toString()}`);
    },
    create: (data: any) => this.authenticatedRequest('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.authenticatedRequest(`/api/customers/${id}`, {
      method: 'DELETE',
    }),
  };

  // Products API
  products = {
    getAll: (departmentId?: string) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      return this.authenticatedRequest(`/api/products?${queryParams.toString()}`);
    },
    getById: (id: string) => this.authenticatedRequest(`/api/products/${id}`),
    getLowStock: (departmentId?: string) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      return this.authenticatedRequest(`/api/products-low-stock?${queryParams.toString()}`);
    },
    getCount: (departmentId?: string) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      return this.authenticatedRequest(`/api/products-count?${queryParams.toString()}`);
    },
    create: (data: any) => this.authenticatedRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.authenticatedRequest(`/api/products/${id}`, {
      method: 'DELETE',
    }),
  };

  // Sales API
  sales = {
    getAll: (params?: { startDate?: string; endDate?: string; status?: string; departmentId?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
      
      const query = queryParams.toString();
      return this.authenticatedRequest(`/api/sales${query ? `?${query}` : ''}`);
    },
    getToday: (departmentId?: string) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      return this.authenticatedRequest(`/api/sales-today?${queryParams.toString()}`);
    },
    getRecent: (departmentId?: string, limit: number = 10) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      queryParams.append('limit', limit.toString());
      return this.authenticatedRequest(`/api/sales-recent?${queryParams.toString()}`);
    },
    create: (data: { sale: any; items: any[] }) => this.authenticatedRequest('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    voidSale: (id: string, void_reason: string, voided_by: string) => 
      this.authenticatedRequest(`/api/sales/${id}/void`, {
        method: 'PUT',
        body: JSON.stringify({ void_reason, voided_by }),
      }),
    getDailySales: (date: string, departmentId?: string) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      return this.authenticatedRequest(`/api/sales/daily/${date}?${queryParams.toString()}`);
    },
  };

  // Sale Items API
  saleItems = {
    getBySale: (saleId: string) => {
      const queryParams = new URLSearchParams();
      queryParams.append('saleId', saleId);
      return this.authenticatedRequest(`/api/sale-items?${queryParams.toString()}`);
    },
  };

  // Services API
  services = {
    getAll: (departmentId?: string) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      return this.authenticatedRequest(`/api/services?${queryParams.toString()}`);
    },
    create: (data: any) => this.authenticatedRequest('/api/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.authenticatedRequest(`/api/services/${id}`, {
      method: 'DELETE',
    }),
  };

  // Categories API
  categories = {
    getAll: () => this.authenticatedRequest('/api/categories'),
    create: (data: any) => this.authenticatedRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };

  // Settings API
  settings = {
    get: () => this.authenticatedRequest('/api/settings'),
    update: (data: any) => this.authenticatedRequest('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    getDepartmentSettings: (departmentId: string) => 
      this.authenticatedRequest(`/api/department-settings/${departmentId}`),
    updateDepartmentSettings: (departmentId: string, data: any) => 
      this.authenticatedRequest(`/api/department-settings/${departmentId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  };

  // Expenses API
  expenses = {
    getAll: (params?: { departmentId?: string; startDate?: string; endDate?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      return this.authenticatedRequest(`/api/expenses?${queryParams.toString()}`);
    },
    create: (data: any) => this.authenticatedRequest('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.authenticatedRequest(`/api/expenses/${id}`, {
      method: 'DELETE',
    }),
  };

  // Reconciliations API
  reconciliations = {
    getAll: (params?: { departmentId?: string; startDate?: string; endDate?: string; status?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.status) queryParams.append('status', params.status);
      return this.authenticatedRequest(`/api/reconciliations?${queryParams.toString()}`);
    },
    create: (data: any) => this.authenticatedRequest('/api/reconciliations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };

  // Credits API
  credits = {
    getAll: (params?: { department_id?: string; is_admin?: boolean }) => {
      const queryParams = new URLSearchParams();
      if (params?.department_id) queryParams.append('department_id', params.department_id);
      if (params?.is_admin !== undefined) queryParams.append('is_admin', params.is_admin.toString());
      return this.authenticatedRequest(`/api/credits?${queryParams.toString()}`);
    },
    create: (data: any) => {
      return this.authenticatedRequest('/api/credits', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateStatus: (id: string, status: string) => {
      return this.authenticatedRequest(`/api/credits/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
    settle: (id: string) => {
      return this.authenticatedRequest(`/api/credits/${id}/settle`, {
        method: 'PUT',
      });
    },
    sendNotification: (id: string, data: {
      message: string;
      from_department_id: string | null;
      to_department_id: string | null;
      subject: string;
    }) => {
      return this.authenticatedRequest(`/api/credits/${id}/notify`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };

  // Suspended Revenue API
  suspendedRevenue = {
    getAll: (departmentId?: string) => {
      const query = departmentId ? `?department_id=${departmentId}` : '';
      return this.authenticatedRequest(`/api/suspended-revenue${query}`);
    },
    create: (data: any) => this.authenticatedRequest('/api/suspended-revenue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateStatus: (id: string, data: any) => this.authenticatedRequest(`/api/suspended-revenue/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  };

  // Inbox API
  inbox = {
    getAll: (params?: { department_id?: string; is_admin?: boolean }) => {
      const queryParams = new URLSearchParams();
      if (params?.department_id) queryParams.append('department_id', params.department_id);
      if (params?.is_admin !== undefined) queryParams.append('is_admin', params.is_admin.toString());
      return this.authenticatedRequest(`/api/inbox?${queryParams.toString()}`);
    },
    markAsRead: (id: string) => {
      return this.authenticatedRequest(`/api/inbox/${id}/read`, {
        method: 'PUT',
      });
    },
  };

  // Categories API (already exists, keeping for reference)
  // Product Variants API (already exists, keeping for reference)

  // Product Variants API
  productVariants = {
    getAll: (productId?: string) => {
      const queryParams = new URLSearchParams();
      if (productId) queryParams.append('productId', productId);
      return this.authenticatedRequest(`/api/product-variants?${queryParams.toString()}`);
    },
  };

  // Perfume Scents API
  perfumeScents = {
    getAll: () => this.authenticatedRequest('/api/perfume-scents'),
    create: (data: any) => this.authenticatedRequest('/api/perfume-scents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/perfume-scents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.authenticatedRequest(`/api/perfume-scents/${id}`, {
      method: 'DELETE',
    }),
  };

  // Perfume Pricing Config API
  perfumePricingConfig = {
    get: (departmentId: string) => this.authenticatedRequest(`/api/perfume-pricing-config?department_id=${departmentId}`),
    createOrUpdate: (data: any) => this.authenticatedRequest('/api/perfume-pricing-config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };

  // Appointments API
  appointments = {
    getAll: () => this.authenticatedRequest('/api/appointments'),
    create: (data: any) => this.authenticatedRequest('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.authenticatedRequest(`/api/appointments/${id}`, {
      method: 'DELETE',
    }),
  };

  // Suppliers API
  suppliers = {
    getAll: () => this.authenticatedRequest('/api/suppliers'),
    create: (data: any) => this.authenticatedRequest('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.authenticatedRequest(`/api/suppliers/${id}`, {
      method: 'DELETE',
    }),
  };

  // Internal Usage API
  internalUsage = {
    getAll: (departmentId?: string) => {
      const query = departmentId ? `?department_id=${departmentId}` : '';
      return this.authenticatedRequest(`/api/internal-usage${query}`);
    },
    create: (data: any) => this.authenticatedRequest('/api/internal-usage', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateStatus: (id: string, status: string) => this.authenticatedRequest(`/api/internal-usage/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  };

  // Mobile Money Transactions API
  mobileMoneyTransactions = {
    getAll: (departmentId?: string) => {
      const query = departmentId ? `?department_id=${departmentId}` : '';
      return this.authenticatedRequest(`/api/mobile-money-transactions${query}`);
    },
    create: (data: any) => this.authenticatedRequest('/api/mobile-money-transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };

  // User Roles API
  userRoles = {
    getAll: () => this.authenticatedRequest('/api/user-roles'),
  };

  // Profiles API
  profiles = {
    getAll: () => this.authenticatedRequest('/api/profiles'),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  };

  // Stock Alerts API
  stockAlerts = {
    getAll: (departmentId?: string) => {
      const queryParams = new URLSearchParams();
      if (departmentId) queryParams.append('departmentId', departmentId);
      return this.authenticatedRequest(`/api/stock-alerts?${queryParams.toString()}`);
    },
  };

  // User Management API
  users = {
    create: (data: { email: string; password: string; fullName: string; role: string; departmentId: string; navPermissions: string[] }) => 
      this.authenticatedRequest('/api/users/create', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateRole: (userId: string, data: { role: string; departmentId: string; navPermissions: string[] }) =>
      this.authenticatedRequest(`/api/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleActivation: (userId: string, isActive: boolean) =>
      this.authenticatedRequest(`/api/users/${userId}/activation`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      }),
    delete: (userId: string, masterPassword: string) =>
      this.authenticatedRequest(`/api/users/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify({ masterPassword }),
      }),
    getNavPermissions: (userId: string) =>
      this.authenticatedRequest(`/api/users/${userId}/nav-permissions`),
  };

  // Staff Performance API
  staffPerformance = {
    getAll: () => this.authenticatedRequest('/api/staff-performance'),
  };

  // Landing Page Content API
  landingPageContent = {
    getAll: () => this.authenticatedRequest('/api/landing-page-content'),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/landing-page-content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  };

  // Service Showcase API
  serviceShowcase = {
    getAll: () => this.authenticatedRequest('/api/service-showcase'),
    create: (data: any) => this.authenticatedRequest('/api/service-showcase', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.authenticatedRequest(`/api/service-showcase/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => this.authenticatedRequest(`/api/service-showcase/${id}`, {
      method: 'DELETE',
    }),
  };

  // Perfume reporting API
  perfumeReports = {
    getRevenueReport: (params: { date?: string; departmentId?: string }) => {
      const queryParams = new URLSearchParams();
      if (params.date) queryParams.append('date', params.date);
      if (params.departmentId) queryParams.append('departmentId', params.departmentId);
      return this.authenticatedRequest(`/api/perfume-revenue-report?${queryParams.toString()}`);
    },
    getDepartmentReport: (params: { date?: string; departmentId?: string }) => {
      const queryParams = new URLSearchParams();
      if (params.date) queryParams.append('date', params.date);
      if (params.departmentId) queryParams.append('departmentId', params.departmentId);
      return this.authenticatedRequest(`/api/perfume-department-report?${queryParams.toString()}`);
    },
    getScentPopularity: (params?: { departmentId?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.departmentId) queryParams.append('departmentId', params.departmentId);
      return this.authenticatedRequest(`/api/scent-popularity?${queryParams.toString()}`);
    },
  };

  sensitiveRegistrations = {
    getAll: (departmentId: string) => 
      this.authenticatedRequest(`/api/sensitive-registrations?departmentId=${departmentId}`),
    create: (data: any) => 
      this.authenticatedRequest('/api/sensitive-registrations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) => 
      this.authenticatedRequest(`/api/sensitive-registrations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  };

  // ============= STOCK CHECKING =============
  checkVariantStock = async (
    variantId: string,
    quantity: number
  ): Promise<{ available: boolean; message?: string }> => {
    try {
      const variant = await this.authenticatedRequest(`/api/product-variants/${variantId}`);
      if (!variant) {
        return { available: false, message: "Variant not found" };
      }
      const available = variant.stock >= quantity;
      return {
        available,
        message: available ? undefined : `Only ${variant.stock} units available`,
      };
    } catch (error) {
      console.error("Error checking variant stock:", error);
      return { available: false, message: "Error checking stock" };
    }
  };

  checkProductStock = async (
    productId: string,
    quantity: number,
    trackingType?: string,
    totalMl?: number
  ): Promise<{ available: boolean; message?: string }> => {
    try {
      const product = await this.authenticatedRequest(`/api/products/${productId}`);
      if (!product) {
        return { available: false, message: "Product not found" };
      }
      
      // For ml-based tracking (perfumes)
      if (trackingType === 'ml' && totalMl !== undefined) {
        const availableMl = product.total_ml || product.stock || 0;
        const available = availableMl >= totalMl;
        return {
          available,
          message: available ? undefined : `Only ${availableMl}ml available`,
        };
      }
      
      // Standard quantity-based tracking
      const available = (product.stock || 0) >= quantity;
      return {
        available,
        message: available ? undefined : `Only ${product.stock} units available`,
      };
    } catch (error) {
      console.error("Error checking product stock:", error);
      return { available: false, message: "Error checking stock" };
    }
  };

  // ============= FILE STORAGE =============
  storage = {
    upload: async (file: File, type: 'logos' | 'products' | 'documents' = 'documents') => {
      const token = this.getToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/api/upload/${type}`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return response.json();
    },

    getFileUrl: (type: string, filename: string) => {
      return `${this.baseUrl}/api/files/${type}/${filename}`;
    },

    delete: async (type: string, filename: string) => {
      return this.authenticatedRequest(`/api/files/${type}/${filename}`, {
        method: 'DELETE',
      });
    },
  };
}

export const localApi = new LocalApiClient();
