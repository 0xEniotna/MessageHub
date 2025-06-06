// API client for communicating with Python backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;
  private sessionToken: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    // Load session token from localStorage if available
    if (typeof window !== 'undefined') {
      this.sessionToken = localStorage.getItem('telegram_session_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  private async requestFormData<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Authentication
  async login(credentials: {
    api_id: string;
    api_hash: string;
    phone_number: string;
  }) {
    const response = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.session_token) {
      this.sessionToken = response.session_token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('telegram_session_token', response.session_token);
      }
    }

    return response;
  }

  async verifyCode(data: {
    phone_number: string;
    code: string;
    password?: string;
  }) {
    const response = await this.request<any>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.session_token) {
      this.sessionToken = response.session_token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('telegram_session_token', response.session_token);
      }
    }

    return response;
  }

  async checkAuthStatus() {
    try {
      return await this.request<{ connected: boolean; phone_number?: string }>(
        '/api/auth/status'
      );
    } catch (error) {
      return { connected: false };
    }
  }

  // Chats
  async getChats() {
    return this.request<{ chats: any[] }>('/api/chats');
  }

  // Messages
  async sendMessage(data: {
    recipients: any[];
    message: string;
    schedule_for?: string;
  }) {
    return this.request<any>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendMessageWithMedia(formData: FormData) {
    return this.requestFormData<any>('/api/messages/send-media', formData);
  }

  async getScheduledMessages() {
    return this.request<{ messages: any[] }>('/api/messages/scheduled');
  }

  async executeScheduledMessage(messageId: string) {
    return this.request<any>(`/api/messages/execute/${messageId}`, {
      method: 'POST',
    });
  }

  async deleteScheduledMessage(messageId: string) {
    return this.request<any>(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    return this.request<{
      status: string;
      telegram_connected: boolean;
      active_clients: number;
    }>('/api/health');
  }

  // Clear session
  clearSession() {
    this.sessionToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('telegram_session_token');
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
