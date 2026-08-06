export const BASE_URL = import.meta.env.VITE_API_URL || 'https://serpy.synxautomate.com/api';

// The desktop build runs its own backend on a loopback port chosen at launch,
// so the address is not known until the shell tells us. It also issues a
// per-launch key that the local API requires, which stops other processes on
// the machine from driving it.
export interface DesktopStatus {
  activated: boolean;
  email: string | null;
  licenceKey: string | null;
  activatedAt: string | null;
  apiBaseUrl: string | null;
  localKey: string | null;
  dbConnected: boolean;
  lastError: string | null;
  licenceApi: string;
  machineId: string;
  version: string;
}

declare global {
  interface Window {
    serpy?: {
      isDesktop: true;
      getStatus: () => Promise<DesktopStatus>;
      activate: (licenceKey: string) => Promise<{
        ok: boolean;
        message?: string;
        apiBaseUrl?: string;
        localKey?: string;
      }>;
      deactivate: () => Promise<{ ok: boolean }>;
      onBackendStatus: (cb: (status: Partial<DesktopStatus>) => void) => () => void;
    };
  }
}

export const isDesktop = (): boolean => Boolean(window.serpy?.isDesktop);

let desktopTarget: { baseUrl: string; localKey: string } | null = null;

/** Cached so we ask the shell once, not on every request. */
async function getDesktopTarget() {
  if (desktopTarget) return desktopTarget;
  if (!window.serpy) return null;

  const status = await window.serpy.getStatus();
  if (!status.apiBaseUrl || !status.localKey) return null;

  desktopTarget = { baseUrl: status.apiBaseUrl, localKey: status.localKey };
  return desktopTarget;
}

/** Called after activation, when the local API has just come up. */
export function setDesktopTarget(baseUrl: string, localKey: string) {
  desktopTarget = { baseUrl, localKey };
}

/**
 * fetch() aimed at the right API for this build: the shell's loopback backend
 * on the desktop, the hosted one otherwise.
 *
 * Call sites that want the raw Response should use this rather than
 * fetch(`${BASE_URL}/...`). Going straight to BASE_URL skips the desktop
 * target, so on the desktop the request leaves the machine entirely - and
 * arrives without the per-launch key the local API requires.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const desktop = await getDesktopTarget();

  return fetch(`${desktop ? desktop.baseUrl : BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(desktop && { 'x-serpy-local-key': desktop.localKey }),
    },
  });
}

interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  errors?: string[];
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // On the desktop, requests go to the locally spawned backend instead of the
    // hosted API, and must carry the shell's per-launch key.
    const desktop = await getDesktopTarget();
    const url = `${desktop ? desktop.baseUrl : this.baseURL}${endpoint}`;

    // Always get the latest token from localStorage
    const currentToken = localStorage.getItem('token');

    console.log('🌐 API Request:', endpoint);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
        ...(desktop && { 'x-serpy-local-key': desktop.localKey }),
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        const err = new Error(data.message || 'API request failed') as any;
        err.details = (data as any).details;
        err.stockCheck = (data as any).stockCheck;
        throw err;
      }

      // If the API returns data directly, return it
      // For auth endpoints, return the full response to preserve token
      if (endpoint.includes('/auth/')) {
        return data as unknown as T;
      }
      return data.data || (data as unknown as T);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string) {
    const response = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    console.log('🔑 Login response:', response);
    
    // The backend returns token at root level, not in response.token
    if (response && typeof response === 'object' && 'token' in response) {
      console.log('🔑 Token received');
      this.setToken(response.token);
      return {
        user: (response as any).data?.user || (response as any).user,
        token: response.token
      };
    }
    
    console.log('🔑 No token found in response');
    return response;
  }

  async register(email: string, password: string, fullName: string, phone?: string, companyName?: string) {
    const response = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, phone, companyName }),
    });
    
    console.log('🔑 Register response:', response);
    
    // The backend returns token at root level, not in response.token
    if (response && typeof response === 'object' && 'token' in response) {
      console.log('🔑 Token received');
      this.setToken(response.token);
      return {
        user: (response as any).data?.user || (response as any).user,
        token: response.token
      };
    }
    
    console.log('🔑 No token found in response');
    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  async getCurrentUser() {
    const response = await this.request<any>('/auth/me');
    // Extract user from the response data structure
    return response?.data?.user || response?.user || response;
  }

  // Utility methods
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Generic CRUD methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const searchParams = params ? new URLSearchParams(params).toString() : '';
    const url = searchParams ? `${endpoint}?${searchParams}` : endpoint;
    
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Business entity methods
  // Customers

   

  async getCustomer(params?: { status?: string; search?: string; page?: number; limit?: number }) {
    return this.get(`/customers`, params);
  }

  async createCustomer(data: any) {
    return this.post('/customers', data);
  }

  async updateCustomer(id: string, data: any) {
    return this.put(`/customers/${id}`, data);
  }

  async deleteCustomer(id: string) {
    return this.delete(`/customers/${id}`);
  }

  // Jobs
  async getJobs(params?: { status?: string; priority?: string; search?: string; page?: number; limit?: number }) {
    return this.get('/jobs', params);
  }

  async getJob(id: string) {
    return this.get(`/jobs/${id}`);
  }

  async createJob(data: any) {
    return this.post('/jobs', data);
  }

  async updateJob(id: string, data: any) {
    return this.put(`/jobs/${id}`, data);
  }

  async deleteJob(id: string) {
    return this.delete(`/jobs/${id}`);
  }

  async updateJobStatus(id: string, status: string, remarks?: string) {
    return this.post(`/jobs/${id}/update-status`, { status, remarks });
  }

  async assignJob(id: string, operatorId: string, operatorName: string) {
    return this.post(`/jobs/${id}/assign`, { operatorId, operatorName });
  }

  async updateFlowStage(id: string, stage: string, remarks?: string) {
    return this.post(`/jobs/${id}/update-flow-stage`, { stage, remarks });
  }

  async getJobStats() {
    return this.get('/jobs/stats/dashboard');
  }

  async getCalendarJobStatus(year: number, month: number) {
    return this.get(`/jobs/calendar-status?year=${year}&month=${month}`);
  }

  async getDashboardStats() {
    return this.get('/dashboard/stats');
  }

  // Inventory Management
  async getInventory(params?: any) {
    return this.get('/inventory', params);
  }

  async getInventoryStats() {
    return this.get('/inventory/stats');
  }

  async createInventoryItem(data: any) {
    return this.post('/inventory', data);
  }
  async createLogin(data: any) {
    return this.post('/create-login', data);
  }

  async updateInventoryItem(id: string, data: any) {
    return this.put(`/inventory/${id}`, data);
  }

  async deleteInventoryItem(id: string) {
    return this.delete(`/inventory/${id}`);
  }

  async adjustInventory(id: string, quantity: number, reason?: string, notes?: string) {
    return this.post(`/inventory/${id}/adjust`, { quantity, reason, notes });
  }

  // Staff Management
  async getStaff(params?: any) {
    return this.get('/staff', params);
  }

  async getStaffStats() {
    return this.get('/staff/stats');
  }

  async createStaff(data: any) {
    return this.post('/staff', data);
  }

  async updateStaff(id: string, data: any) {
    return this.put(`/users/${id}`, data);
  }

  async deleteStaff(id: string) {
    return this.delete(`/staff/${id}`);
  }

  // Staff Email and Password Management
  async changeStaffEmail(staffId: string, newEmail: string) {
    return this.put(`/staff/${staffId}/email`, { newEmail });
  }

  async changeStaffPassword(staffId: string, newPassword: string) {
    return this.put(`/staff/${staffId}/password`, { newPassword });
  }

  async getStaffList(params?: { search?: string; isActive?: boolean }) {
    const searchParams = params ? new URLSearchParams() : new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const queryString = searchParams ? '?' + searchParams.toString() : '';
    return this.get(`/staff/list${queryString}`);
  }

  // Schedule Management
  async getStaffSchedule(staffId: string, params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/staff/${staffId}/schedule${queryString}`);
  }

  async saveStaffSchedule(staffId: string, schedules: any[]) {
    return this.post(`/staff/${staffId}/schedule`, { schedules });
  }

  async updateStaffSchedule(staffId: string, scheduleId: string, data: any) {
    return this.put(`/staff/${staffId}/schedule/${scheduleId}`, data);
  }

  async deleteStaffSchedule(staffId: string, scheduleId: string) {
    return this.delete(`/staff/${staffId}/schedule/${scheduleId}`);
  }

  async getScheduleOverview(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/staff/schedule/overview${queryString}`);
  }

  // Tasks
  async getTasks(params?: any) {
    return this.get('/tasks', params);
  }

  async getTask(taskId: string) {
    return this.get(`/tasks/${taskId}`);
  }

  async getTaskStats() {
    return this.get('/tasks/stats');
  }

  async getTaskAnalytics() {
    return this.get('/tasks/analytics');
  }

  async getOverdueTasks() {
    return this.get('/tasks/overdue');
  }

  async getTasksByPriority(priority: string) {
    return this.get(`/tasks/by-priority/${priority}`);
  }

  async getTasksByStaff(staffId: string) {
    return this.get(`/tasks/by-staff/${staffId}`);
  }

  async createTask(data: any) {
    return this.post('/tasks', data);
  }

  async updateTask(taskId: string, data: any) {
    return this.put(`/tasks/${taskId}`, data);
  }

  async deleteTask(id: string) {
    return this.delete(`/tasks/${id}`);
  }

  async updateTaskStatus(id: string, status: string, notes?: string) {
    return this.put(`/tasks/${id}/status`, { status, notes });
  }

  async addComment(taskId: string, text: string) {
    return this.post(`/tasks/${taskId}/comments`, { text });
  }

  async updateTaskProgress(id: string, progress: number, actualHours?: number) {
    return this.put(`/tasks/${id}/progress`, { progress, actualHours });
  }

  async addTaskComment(id: string, text: string) {
    return this.post(`/tasks/${id}/comments`, { text });
  }

  async addTimeEntry(id: string, startTime: string, endTime: string, description?: string) {
    return this.post(`/tasks/${id}/time-entries`, { startTime, endTime, description });
  }

  // Reports
  async getRevenueReports(params?: any) {
    return this.get('/reports/revenue', params);
  }

  // HSN Code Management
  async getHsnCodes(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/hsn-codes${queryString}`);
  }

  async getHsnCode(id: string) {
    return this.get(`/hsn-codes/${id}`);
  }

  async createHsnCode(data: any) {
    return this.post('/hsn-codes', data);
  }

  async updateHsnCode(id: string, data: any) {
    return this.put(`/hsn-codes/${id}`, data);
  }

  async deleteHsnCode(id: string) {
    return this.delete(`/hsn-codes/${id}`);
  }

  async getHsnCategories() {
    return this.get('/hsn-codes/categories/list');
  }

  async getHsnGstRatesSummary() {
    return this.get('/hsn-codes/gst-rates/summary');
  }

  async bulkImportHsnCodes(data: any) {
    return this.post('/hsn-codes/bulk-import', { hsnCodes: data });
  }

  // SAC Code Management
  async getSacCodes(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/sac-codes${queryString}`);
  }

  async getSacCode(id: string) {
    return this.get(`/sac-codes/${id}`);
  }

  async createSacCode(data: any) {
    return this.post('/sac-codes', data);
  }

  async updateSacCode(id: string, data: any) {
    return this.put(`/sac-codes/${id}`, data);
  }

  async deleteSacCode(id: string) {
    return this.delete(`/sac-codes/${id}`);
  }

  async getSacCategories() {
    return this.get('/sac-codes/categories/list');
  }

  async getSacGstRatesSummary() {
    return this.get('/sac-codes/gst-rates/summary');
  }

  async bulkImportSacCodes(data: any) {
    return this.post('/sac-codes/bulk-import', { sacCodes: data });
  }

  // Vendor Management
  async getVendors(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/vendors${queryString}`);
  }

  async getVendor(id: string) {
    return this.get(`/vendors/${id}`);
  }

  async createVendor(data: any) {
    return this.post('/vendors', data);
  }

  async updateVendor(id: string, data: any) {
    return this.put(`/vendors/${id}`, data);
  }

  async deleteVendor(id: string) {
    return this.delete(`/vendors/${id}`);
  }

  async getVendorStats() {
    return this.get('/vendors/stats/summary');
  }

  // Purchase Bills
  async getPurchaseBills(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/purchase-bills${queryString}`);
  }

  async getPurchaseBill(id: string) {
    return this.get(`/purchase-bills/${id}`);
  }

  async createPurchaseBill(data: any) {
    return this.post('/purchase-bills', data);
  }

  async updatePurchaseBill(id: string, data: any) {
    return this.put(`/purchase-bills/${id}`, data);
  }

  async deletePurchaseBill(id: string) {
    return this.delete(`/purchase-bills/${id}`);
  }

  async getPurchaseBillStats() {
    return this.get('/purchase-bills/stats/summary');
  }

  async downloadPurchaseBillPDF(billId: string) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/purchase-bills/${billId}/pdf`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to download PDF: ${response.status}`);
      }
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('PDF is empty - generation may have failed');
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const contentDisposition = response.headers.get('content-disposition');
    let filename = `PurchaseBill_${billId}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  // Payment Management
  async getPayments(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/payments${queryString}`);
  }

  async getPayment(id: string) {
    return this.get(`/payments/${id}`);
  }

  async createPayment(data: any) {
    return this.post('/payments', data);
  }

  async updatePayment(id: string, data: any) {
    return this.put(`/payments/${id}`, data);
  }

  async deletePayment(id: string) {
    return this.delete(`/payments/${id}`);
  }

  async getPaymentStats() {
    return this.get('/payments/stats/summary');
  }

  // Cost Management
  async getCosts(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/costs${queryString}`);
  }

  async getCost(id: string) {
    return this.get(`/costs/${id}`);
  }

  async createCost(data: any) {
    return this.post('/costs', data);
  }

  async updateCost(id: string, data: any) {
    return this.put(`/costs/${id}`, data);
  }

  async deleteCost(id: string) {
    return this.delete(`/costs/${id}`);
  }

  async getCostStats() {
    return this.get('/costs/stats/summary');
  }

  // Delivery Management
  async getDeliveries(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/deliveries${queryString}`);
  }

  async getDelivery(id: string) {
    return this.get(`/deliveries/${id}`);
  }

  async createDelivery(data: any) {
    return this.post('/deliveries', data);
  }

  async updateDelivery(id: string, data: any) {
    return this.put(`/deliveries/${id}`, data);
  }

  async deleteDelivery(id: string) {
    return this.delete(`/deliveries/${id}`);
  }

  async updateDeliveryStatus(id: string, status: string, notes?: string) {
    return this.put(`/deliveries/${id}/status`, { status, notes });
  }

  async getDeliveryStats() {
    return this.get('/deliveries/stats/summary');
  }

  // Quotation Management
  async downloadQuotationPDF(id: string): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/quotations/${id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Failed to download PDF' }));
      throw new Error(err.message || 'Failed to download PDF');
    }
    return response.blob();
  }

  async getQuotations(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/quotations${queryString}`);
  }

  async getQuotation(id: string) {
    return this.get(`/quotations/${id}`);
  }

  async createQuotation(data: any) {
    return this.post('/quotations', data);
  }

  async updateQuotationStatus(id: string, status: string) {
    return this.patch(`/quotations/${id}/status`, { status });
  }

  async deleteQuotation(id: string) {
    return this.delete(`/quotations/${id}`);
  }

  async sendQuotationEmail(id: string, recipientEmail: string, message?: string) {
    return this.post(`/quotations/${id}/send-email`, { recipientEmail, message });
  }

  // Invoice Management
  async getInvoices(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/invoices${queryString}`);
  }

  async getInvoice(id: string) {
    return this.get(`/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return this.post('/invoices', data);
  }

  async updateInvoice(id: string, data: any) {
    return this.put(`/invoices/${id}`, data);
  }

  async deleteInvoice(id: string) {
    return this.delete(`/invoices/${id}`);
  }

  async getInvoiceStats() {
    return this.get('/invoices/stats/summary');
  }

  async cancelInvoice(invoiceId: string, reason?: string) {
    return this.patch(`/invoices/${invoiceId}/cancel`, { reason });
  }

  async getInvoiceMovements(invoiceId: string) {
    return this.get(`/invoices/${invoiceId}/movements`);
  }

  async getInventoryMovements(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return this.get(`/inventory-movements?${params.toString()}`);
  }

  async getInventoryMovementSummary(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.get(`/inventory-movements/summary?${params.toString()}`);
  }

  // Inventory Analytics
  async getInventoryAnalytics() {
    return this.get('/inventory/analytics');
  }

  async getLowStockReport() {
    return this.get('/inventory/reports/low-stock');
  }

  async getCriticalStockReport() {
    return this.get('/inventory/reports/critical-stock');
  }

  async getInventoryValuationReport(category?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    return this.get(`/inventory/reports/valuation?${params.toString()}`);
  }

  async getInventoryMovementSummaryReport(days?: number) {
    const params = new URLSearchParams();
    if (days) params.append('days', days.toString());
    return this.get(`/inventory/reports/movement-summary?${params.toString()}`);
  }

  // Purchase Order Management
  async getPurchaseOrders(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/purchase-orders${queryString}`);
  }

  async getPurchaseOrder(id: string) {
    return this.get(`/purchase-orders/${id}`);
  }

  async createPurchaseOrder(data: any) {
    return this.post('/purchase-orders', data);
  }

  async updatePurchaseOrder(id: string, data: any) {
    return this.put(`/purchase-orders/${id}`, data);
  }

  async updatePurchaseOrderStatus(id: string, status: string, notes?: string) {
    return this.patch(`/purchase-orders/${id}/status`, { status, notes });
  }

  async deletePurchaseOrder(id: string) {
    return this.delete(`/purchase-orders/${id}`);
  }

  async getPurchaseOrderStats() {
    return this.get('/purchase-orders/stats/summary');
  }

  // Invoice PDF and Email
  async downloadInvoicePDF(invoiceId: string) {
    try {
      const token = localStorage.getItem('token');
      console.log('📥 Starting PDF download for invoice:', invoiceId);

      const response = await fetch(`${this.baseURL}/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers.get('content-type'));

      if (!response.ok) {
        // Try to parse JSON error response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('📥 Error response:', errorData);
          throw new Error(errorData.message || `Failed to download PDF: ${response.status}`);
        }
        const errorText = await response.text();
        console.error('📥 Error response:', errorText);
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('📥 Blob size:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('PDF is empty - generation may have failed');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `Invoice_${invoiceId}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
          console.log('📥 Using filename from server:', filename);
        }
      }

      link.download = filename;
      document.body.appendChild(link);

      console.log('📥 Triggering download for:', link.download);
      link.click();

      // Wait a bit before removing to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('📥 Download completed and cleanup done');
      }, 100);
    } catch (error) {
      console.error('❌ PDF download error:', error);
      throw error;
    }
  }

  async sendInvoiceEmail(invoiceId: string, email: string, message?: string) {
    return this.post(`/invoices/${invoiceId}/send-email`, { email, message });
  }

  async sendInvoiceWhatsApp(invoiceId: string, phone: string, message?: string) {
    return this.post(`/invoices/${invoiceId}/send-whatsapp`, { phone, message });
  }

  async getInvoicePrintData(invoiceId: string) {
    return this.get(`/invoices/${invoiceId}/print-data`);
  }

  async updateInvoicePaymentStatus(invoiceId: string, data: { paymentStatus: string; amountPaid?: number }) {
    return this.patch(`/invoices/${invoiceId}/payment-status`, data);
  }

  async updateInvoiceNoGst(invoiceId: string, noGst: boolean) {
    return this.patch(`/invoices/${invoiceId}/no-gst`, { noGst });
  }

  async getVendorPerformance(vendorId: string) {
    return this.get(`/vendors/${vendorId}/performance`);
  }

  async updateVendorPerformance(vendorId: string, data: any) {
    return this.put(`/vendors/${vendorId}/performance`, data);
  }

  async addVendorCommunication(vendorId: string, data: any) {
    return this.post(`/vendors/${vendorId}/communication`, data);
  }

  async addVendorPayment(vendorId: string, data: any) {
    return this.post(`/vendors/${vendorId}/payment`, data);
  }

  // Walk-in Jobs Management
  async getWalkInJobs(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/walk-in-jobs${queryString}`);
  }

  async getWalkInJob(id: string) {
    return this.get(`/walk-in-jobs/${id}`);
  }

  async createWalkInJob(data: any) {
    return this.post('/walk-in-jobs', data);
  }

  async updateWalkInJob(id: string, data: any) {
    return this.put(`/walk-in-jobs/${id}`, data);
  }

  async deleteWalkInJob(id: string) {
    return this.delete(`/walk-in-jobs/${id}`);
  }

  async updateWalkInJobStatus(id: string, status: string, progress?: number, notes?: string) {
    return this.put(`/walk-in-jobs/${id}/status`, { status, progress, notes });
  }

  async assignWalkInJob(id: string, operatorId: string) {
    return this.put(`/walk-in-jobs/${id}/assign`, { operatorId });
  }

  async updateWalkInJobQualityCheck(id: string, checked: boolean, approved?: boolean, qualityNotes?: string, checkedBy?: string) {
    return this.put(`/walk-in-jobs/${id}/quality-check`, { checked, approved, qualityNotes, checkedBy });
  }

  async getWalkInJobStats() {
    return this.get('/walk-in-jobs/stats/summary');
  }

  // WhatsApp Integration
  async getWhatsAppStats() {
    return this.get('/whatsapp/stats');
  }

  async getWhatsAppTemplates() {
    return this.get('/whatsapp/templates');
  }

  async sendWhatsAppMessage(phoneNumber: string, templateId: string, variables: any, customerId?: string) {
    return this.post('/whatsapp/send', { phoneNumber, templateId, variables, customerId });
  }

  async sendBulkWhatsAppMessages(recipients: any[]) {
    return this.post('/whatsapp/send-bulk', { recipients });
  }

  // Meta WhatsApp API Integration
  async getWhatsAppSettings() {
    return this.get('/whatsapp/settings');
  }

  async setupWhatsApp(data: { enabled: boolean; wabaId: string; phoneNumberId: string; accessToken: string }) {
    return this.post('/whatsapp/settings', data);
  }

  async getMetaTemplates() {
    return this.get('/whatsapp/meta-templates');
  }

  async createMetaTemplate(data: { name: string; language: string; category: string; components: any[] }) {
    return this.post('/whatsapp/meta-templates', data);
  }

  async deleteMetaTemplate(name: string) {
    return this.delete(`/whatsapp/meta-templates/${name}`);
  }

  // WhatsApp Embedded Signup
  async exchangeWhatsAppToken(code: string, wabaId: string, phoneNumberId: string) {
    return this.post<any>('/embedded-signup/exchange-token', {
      code,
      waba_id: wabaId,
      phone_number_id: phoneNumberId
    });
  }

  async getEmbeddedSignupStatus() {
    return this.get<any>('/embedded-signup/status');
  }

  async resetEmbeddedSignupConfiguration() {
    return this.delete<any>('/embedded-signup/reset');
  }

  // Payment Reminders
  async getPaymentReminderStats() {
    return this.get('/payment-reminders/stats');
  }

  async getOverdueInvoices() {
    return this.get('/payment-reminders/overdue-invoices');
  }

  async getPaymentReminders(params?: { status?: string; customerId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
    return this.get('/payment-reminders', params);
  }

  async sendPaymentReminder(invoiceId: string) {
    return this.post(`/payment-reminders/send/${invoiceId}`);
  }

  async sendBulkPaymentReminders() {
    return this.post('/payment-reminders/send-bulk');
  }

  async getPaymentReminderSettings() {
    return this.get('/payment-reminders/settings');
  }

  async updatePaymentReminderSettings(data: any) {
    return this.put('/payment-reminders/settings', data);
  }

  // Proofing System
  async getProofs(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/proofs${queryString}`);
  }

  async getProof(id: string) {
    return this.get(`/proofs/${id}`);
  }

  async createProof(data: any) {
    return this.post('/proofs', data);
  }

  async updateProof(id: string, data: any) {
    return this.put(`/proofs/${id}`, data);
  }

  async deleteProof(id: string) {
    return this.delete(`/proofs/${id}`);
  }

  async approveProof(id: string, approvalNotes?: string) {
    return this.put(`/proofs/${id}/approve`, { approvalNotes });
  }

  async rejectProof(id: string, rejectionReason: string) {
    return this.put(`/proofs/${id}/reject`, { rejectionReason });
  }

  async addProofComment(id: string, comment: string, isInternal?: boolean) {
    return this.post(`/proofs/${id}/comments`, { comment, isInternal });
  }

  async getProofStats() {
    return this.get('/proofs/stats/summary');
  }

  // Emergency Orders Management
  async getEmergencyOrders(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/emergency-orders${queryString}`);
  }

  async getEmergencyOrder(id: string) {
    return this.get(`/emergency-orders/${id}`);
  }

  async createEmergencyOrder(data: any) {
    return this.post('/emergency-orders', data);
  }

  async updateEmergencyOrder(id: string, data: any) {
    return this.put(`/emergency-orders/${id}`, data);
  }

  async deleteEmergencyOrder(id: string) {
    return this.delete(`/emergency-orders/${id}`);
  }

  async updateEmergencyOrderStatus(id: string, status: string, notes?: string) {
    return this.put(`/emergency-orders/${id}/status`, { status, notes });
  }

  async getEmergencyOrderStats() {
    return this.get('/emergency-orders/stats/summary');
  }

  // Accounts Management
  async getAccountTransactions(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/accounts/transactions${queryString}`);
  }

  async getAccountBalances() {
    return this.get('/accounts/balances');
  }

  async getCheques(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/accounts/cheques${queryString}`);
  }

  async createAccountTransaction(data: any) {
    return this.post('/accounts/transactions', data);
  }

  async updateAccountTransaction(id: string, data: any) {
    return this.put(`/accounts/transactions/${id}`, data);
  }

  async deleteAccountTransaction(id: string) {
    return this.delete(`/accounts/transactions/${id}`);
  }

  async getAccountStats() {
    return this.get('/accounts/stats/summary');
  }

  async getAccountReportSummary(period: string = 'month') {
    return this.get(`/accounts/reports/summary?period=${period}`);
  }

  async getAccountLedger(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/accounts/ledger${queryString}`);
  }

  async downloadAccountReport(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseURL}/accounts/reports/export${queryString}`;

    // Get the current token
    const currentToken = localStorage.getItem('token');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'transactions-report.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return { status: 'success', message: 'Report downloaded successfully' };
    } catch (error) {
      console.error('Download report error:', error);
      throw error;
    }
  }

  async updateCustomerPricing(id: string, data: any) {
    return this.put(`/customer-pricing/${id}`, data);
  }

  async deleteCustomerPricing(id: string) {
    return this.delete(`/customer-pricing/${id}`);
  }

  // Files

  // Time Entries (Designer Timer) - Complete Implementation
  async getTimeEntries(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/time-entries${queryString}`);
  }

  async getTimeEntry(id: string) {
    return this.get(`/time-entries/${id}`);
  }

  async createTimeEntry(data: any) {
    return this.post('/time-entries', data);
  }

  async updateTimeEntry(id: string, data: any) {
    return this.put(`/time-entries/${id}`, data);
  }

  async deleteTimeEntry(id: string) {
    return this.delete(`/time-entries/${id}`);
  }

  async startTimer(id: string) {
    return this.post(`/time-entries/${id}/start`);
  }

  async pauseTimer(id: string) {
    return this.post(`/time-entries/${id}/pause`);
  }

  async stopTimer(id: string) {
    return this.post(`/time-entries/${id}/stop`);
  }

  async getTimeEntryStats() {
    return this.get('/time-entries/stats/summary');
  }

  async getActiveTimer() {
    return this.get('/time-entries/active');
  }

  // Calendar & Events - Complete Implementation
  async getEvents(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/calendar/events${queryString}`);
  }

  async getEvent(id: string) {
    return this.get(`/calendar/events/${id}`);
  }

  async createEvent(data: any) {
    return this.post('/calendar/events', data);
  }

  async updateEvent(id: string, data: any) {
    return this.put(`/calendar/events/${id}`, data);
  }

  async deleteEvent(id: string) {
    return this.delete(`/calendar/events/${id}`);
  }

  async getEventsInRange(startDate: string, endDate: string) {
    return this.get(`/calendar/events/range/${startDate}/${endDate}`);
  }

  async getUpcomingEvents(limit?: number) {
    const queryString = limit ? `?limit=${limit}` : '';
    return this.get(`/calendar/events/upcoming${queryString}`);
  }

  async getOverdueEvents() {
    return this.get('/calendar/events/overdue');
  }

  async updateEventStatus(id: string, status: string) {
    return this.put(`/calendar/events/${id}/status`, { status });
  }

  async getCalendarStats() {
    return this.get('/calendar/stats/summary');
  }

  // Discount Management - Complete Implementation
  async getDiscountRules(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/discounts/rules${queryString}`);
  }

  async getDiscountRule(id: string) {
    return this.get(`/discounts/rules/${id}`);
  }

  async createDiscountRule(data: any) {
    return this.post('/discounts/rules', data);
  }

  async updateDiscountRule(id: string, data: any) {
    return this.put(`/discounts/rules/${id}`, data);
  }

  async deleteDiscountRule(id: string) {
    return this.delete(`/discounts/rules/${id}`);
  }

  async getCustomerPricing(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/discounts/customer-pricing${queryString}`);
  }

  async getCustomerPricingRule(id: string) {
    return this.get(`/discounts/customer-pricing/${id}`);
  }

  async createCustomerPricing(data: any) {
    return this.post('/discounts/customer-pricing', data);
  }

  async updateCustomerPricingRule(id: string, data: any) {
    return this.put(`/discounts/customer-pricing/${id}`, data);
  }

  async deleteCustomerPricingRule(id: string) {
    return this.delete(`/discounts/customer-pricing/${id}`);
  }

  async calculateDiscount(customerId: string, amount: number, jobType?: string, isNewCustomer?: boolean) {
    return this.post('/discounts/calculate', { customerId, amount, jobType, isNewCustomer });
  }

  async getDiscountStats() {
    return this.get('/discounts/stats/summary');
  }

  // Customer Portal - Complete Implementation
  async portalLogin(phone: string, email?: string) {
    return this.post('/portal/login', { phone, email });
  }

  async portalLogout(sessionId: string) {
    return this.request('/portal/logout', { 
      method: 'POST',
      headers: { 'X-Portal-Session': sessionId }
    });
  }

  async getPortalCustomerData(sessionId: string) {
    return this.request('/portal/customer-data', { 
      headers: { 'X-Portal-Session': sessionId }
    });
  }

  async getPortalOrders(sessionId: string, params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/portal/orders${queryString}`, { headers: { 'X-Portal-Session': sessionId } });
  }

  async getPortalInvoices(sessionId: string, params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/portal/invoices${queryString}`, { headers: { 'X-Portal-Session': sessionId } });
  }

  async getPortalDeliveries(sessionId: string, params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/portal/deliveries${queryString}`, { headers: { 'X-Portal-Session': sessionId } });
  }

  async uploadPortalFile(sessionId: string, file: File, category?: string, description?: string, jobId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    if (description) formData.append('description', description);
    if (jobId) formData.append('jobId', jobId);
    
    return this.request('/portal/upload-file', { 
      method: 'POST',
      body: formData,
      headers: { 
        'X-Portal-Session': sessionId
      } 
    });
  }

  async getPortalFiles(sessionId: string, params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/portal/files${queryString}`, { headers: { 'X-Portal-Session': sessionId } });
  }

  async downloadPortalFile(sessionId: string, fileId: string) {
    return this.get(`/portal/files/${fileId}/download`, { headers: { 'X-Portal-Session': sessionId } });
  }

  async getPortalStats(sessionId: string) {
    return this.get('/portal/stats/summary', { headers: { 'X-Portal-Session': sessionId } });
  }

  // Activity Log - Complete Implementation
  async getActivityLog(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/activity-log${queryString}`);
  }

  async getActivityLogEntry(id: string) {
    return this.get(`/activity-log/${id}`);
  }

  async getEntityActivity(entityType: string, entityId: string, params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/activity-log/entity/${entityType}/${entityId}${queryString}`);
  }

  async getUserActivity(userId: string, params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/activity-log/user/${userId}${queryString}`);
  }

  async getActivityStats(days?: number) {
    const queryString = days ? `?days=${days}` : '';
    return this.get(`/activity-log/stats/summary${queryString}`);
  }

  async getRecentActivity(limit?: number) {
    const queryString = limit ? `?limit=${limit}` : '';
    return this.get(`/activity-log/recent${queryString}`);
  }

  async getCriticalActivity(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/activity-log/critical${queryString}`);
  }

  async deleteActivityLogEntry(id: string) {
    return this.delete(`/activity-log/${id}`);
  }

  // User Management - Complete Implementation
  async getUsers(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/users${queryString}`);
  }

  async getUser(id: string) {
    return this.get(`/users/${id}`);
  }

  async createUser(data: any) {
    return this.post('/users', data);
  }

  async updateUser(id: string, data: any) {
    return this.put(`/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.delete(`/users/${id}`);
  }

  async changeUserPassword(id: string, currentPassword: string, newPassword: string) {
    return this.put(`/users/${id}/password`, { currentPassword, newPassword });
  }

  async toggleUserStatus(id: string) {
    return this.put(`/users/${id}/toggle-status`);
  }

  async getUserStats() {
    return this.get('/users/stats/summary');
  }

  // Settings - Complete Implementation
  async getSettings() {
    return this.get('/settings');
  }

  async updateSettings(data: any) {
    return this.put('/settings', data);
  }

  async updateCompanySettings(data: any) {
    return this.put('/settings/company', data);
  }

  async updateBusinessSettings(data: any) {
    return this.put('/settings/business', data);
  }

  async updateNotificationSettings(data: any) {
    return this.put('/settings/notifications', data);
  }

  async updateSecuritySettings(data: any) {
    return this.put('/settings/security', data);
  }

  async updateIntegrationSettings(data: any) {
    return this.put('/settings/integrations', data);
  }

  async updateCustomFields(data: any) {
    return this.put('/settings/custom-fields', data);
  }

  async updateThemeSettings(data: any) {
    return this.put('/settings/theme', data);
  }

  async resetSettings(section?: string) {
    return this.post('/settings/reset', { section });
  }

  // Files Management - Complete Implementation
  async getFiles(params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/files${queryString}`);
  }

  async getFile(id: string) {
    return this.get(`/files/${id}`);
  }

  async uploadFile(file: File, metadata?: any) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        if (metadata[key] !== undefined) {
          formData.append(key, metadata[key]);
        }
      });
    }
    
    return this.request('/files/upload', { 
      method: 'POST',
      body: formData
    });
  }

  async updateFile(id: string, data: any) {
    return this.put(`/files/${id}`, data);
  }

  async downloadFile(id: string) {
    return this.get(`/files/${id}/download`);
  }

  async deleteFile(id: string) {
    return this.delete(`/files/${id}`);
  }

  async getFileStats() {
    return this.get('/files/stats/summary');
  }

  async getFilesByCategory(category: string, params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/files/category/${category}${queryString}`);
  }

  async getFilesByEntity(entityType: string, entityId: string, params?: any) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/files/entity/${entityType}/${entityId}${queryString}`);
  }

  // Email Management
  async sendEmail(emailData: {
    to: string | string[];
    subject: string;
    template: string;
    data: any;
  }) {
    return this.post('/email/send', emailData);
  }

  async testEmail(to: string) {
    return this.post('/email/test', { to });
  }

  // ==================== HR & PAYROLL ====================

  // --- Employees ---
  async getEmployees(params?: any) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/hr/employees${qs}`);
  }
  async getEmployee(id: string) {
    return this.get(`/hr/employees/${id}`);
  }
  async getEmployeeStats() {
    return this.get('/hr/employees/stats/summary');
  }
  async createEmployee(data: any) {
    return this.post('/hr/employees', data);
  }
  async updateEmployee(id: string, data: any) {
    return this.put(`/hr/employees/${id}`, data);
  }
  async deleteEmployee(id: string) {
    return this.delete(`/hr/employees/${id}`);
  }

  // --- Attendance ---
  async getAttendance(params?: any) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/hr/attendance${qs}`);
  }
  async getAttendanceSummary(month: number, year: number) {
    return this.get(`/hr/attendance/summary?month=${month}&year=${year}`);
  }
  async markAttendance(data: any) {
    return this.post('/hr/attendance', data);
  }
  async markAttendanceBulk(date: string, records: any[]) {
    return this.post('/hr/attendance/bulk', { date, records });
  }
  async deleteAttendance(id: string) {
    return this.delete(`/hr/attendance/${id}`);
  }

  // --- Leaves ---
  async getLeaves(params?: any) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/hr/leaves${qs}`);
  }
  async createLeave(data: any) {
    return this.post('/hr/leaves', data);
  }
  async updateLeaveStatus(id: string, status: string, rejectionReason?: string) {
    return this.patch(`/hr/leaves/${id}/status`, { status, rejectionReason });
  }
  async deleteLeave(id: string) {
    return this.delete(`/hr/leaves/${id}`);
  }

  // --- Payroll ---
  async getPayroll(params?: any) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/hr/payroll${qs}`);
  }
  async getPayrollSummary(month: number, year: number) {
    return this.get(`/hr/payroll/stats/summary?month=${month}&year=${year}`);
  }
  async generatePayroll(month: number, year: number, employeeId?: string) {
    return this.post('/hr/payroll/generate', { month, year, employeeId });
  }
  async updatePayslip(id: string, data: any) {
    return this.put(`/hr/payroll/${id}`, data);
  }
  async markPayslipPaid(id: string, data?: any) {
    return this.patch(`/hr/payroll/${id}/pay`, data || {});
  }
  async deletePayslip(id: string) {
    return this.delete(`/hr/payroll/${id}`);
  }
  async downloadPayslipPDF(id: string): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/hr/payroll/${id}/payslip`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Failed to download payslip' }));
      throw new Error(err.message || 'Failed to download payslip');
    }
    return response.blob();
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
export type { ApiResponse };
