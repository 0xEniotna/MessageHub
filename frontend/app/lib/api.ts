// API client for communicating with Python backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Timeout configuration
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const AUTH_TIMEOUT = 90000; // 90 seconds for auth operations (they take longer)

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Enhanced logging utility
const logApiCall = (method: string, url: string, data?: any) => {
  console.log(`🌐 API ${method}: ${url}`);
  if (data && typeof data === 'object') {
    // Safely log data without sensitive information
    const logData = { ...data };
    if (logData.api_hash) logData.api_hash = '[REDACTED]';
    if (logData.password) logData.password = '[REDACTED]';
    console.log('📤 Request data:', logData);
  }
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🔗 Base URL:', API_BASE_URL);
};

const logApiResponse = (
  method: string,
  url: string,
  response: any,
  duration: number
) => {
  console.log(`✅ API ${method} Response: ${url}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log('📥 Response:', response);
};

const logApiError = (
  method: string,
  url: string,
  error: any,
  duration: number
) => {
  console.error(`❌ API ${method} Error: ${url}`);
  console.error(`⏱️  Duration: ${duration}ms`);
  console.error('💥 Error:', error);
  console.error('🔍 Error name:', error?.name);
  console.error('🔍 Error message:', error?.message);
  console.error('🔍 Error stack:', error?.stack);
};

class ApiClient {
  private baseURL: string;
  private sessionToken: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('🚀 ApiClient initialized');
    console.log('🔗 Base URL:', this.baseURL);
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔧 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);

    // Load session token from localStorage if available
    if (typeof window !== 'undefined') {
      this.sessionToken = localStorage.getItem('session_token');
      console.log(
        '🔑 Session token loaded:',
        this.sessionToken ? '[TOKEN EXISTS]' : '[NO TOKEN]'
      );
    }
  }

  private createAbortController(timeout: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => {
      console.log(`⏰ Request timeout triggered after ${timeout}ms`);
      controller.abort();
    }, timeout);
    return controller;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<T> {
    const startTime = Date.now();
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';

    logApiCall(
      method,
      url,
      options.body ? JSON.parse(options.body as string) : undefined
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
      console.log('🔑 Authorization header added');
    } else {
      console.log('🔓 No session token available');
    }

    console.log('📋 Request headers:', headers);
    console.log('⏰ Timeout set to:', timeout + 'ms');

    const controller = this.createAbortController(timeout);

    try {
      console.log('🔄 Making fetch request...');
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const duration = Date.now() - startTime;
      console.log(
        `📡 Response received - Status: ${response.status} ${response.statusText}`
      );
      console.log(
        '📋 Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP Error ${response.status}:`, errorText);
        logApiError(
          method,
          url,
          {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          },
          duration
        );
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      logApiResponse(method, url, responseData, duration);
      return responseData;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (error.name === 'AbortError') {
        const timeoutError = new Error(
          `Request timeout after ${
            timeout / 1000
          } seconds - check your internet connection and server availability`
        );
        logApiError(method, url, timeoutError, duration);
        throw timeoutError;
      }

      logApiError(method, url, error, duration);
      throw error;
    }
  }

  private async requestFormData<T>(
    endpoint: string,
    formData: FormData,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<T> {
    const startTime = Date.now();
    const url = `${this.baseURL}${endpoint}`;
    const method = 'POST';

    console.log(`🌐 API ${method} (FormData): ${url}`);
    console.log('📤 FormData entries:');
    try {
      const entries = Array.from(formData.entries());
      for (const [key, value] of entries) {
        if (value instanceof File) {
          console.log(
            `  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`
          );
        } else {
          console.log(`  ${key}:`, value);
        }
      }
    } catch (error) {
      console.log('  [Unable to enumerate FormData entries]');
    }

    const headers: Record<string, string> = {};

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
      console.log('🔑 Authorization header added');
    } else {
      console.log('🔓 No session token available');
    }

    console.log('📋 Request headers:', headers);
    console.log('⏰ Timeout set to:', timeout + 'ms');

    const controller = this.createAbortController(timeout);

    try {
      console.log('🔄 Making fetch request with FormData...');
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      const duration = Date.now() - startTime;
      console.log(
        `📡 Response received - Status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP Error ${response.status}:`, errorText);
        logApiError(
          method,
          url,
          {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          },
          duration
        );
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      logApiResponse(method, url, responseData, duration);
      return responseData;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (error.name === 'AbortError') {
        const timeoutError = new Error(
          `Request timeout after ${
            timeout / 1000
          } seconds - check your internet connection and server availability`
        );
        logApiError(method, url, timeoutError, duration);
        throw timeoutError;
      }

      logApiError(method, url, error, duration);
      throw error;
    }
  }

  // Authentication (uses longer timeout)
  async login(credentials: {
    api_id: string;
    api_hash: string;
    phone_number: string;
  }) {
    console.log('🔐 Starting login process...');
    console.log('📱 Phone number:', credentials.phone_number);
    console.log('🆔 API ID:', credentials.api_id);

    const response = await this.request<any>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
      AUTH_TIMEOUT
    );

    if (response.session_token) {
      this.sessionToken = response.session_token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('session_token', response.session_token);
        console.log('💾 Session token saved to localStorage');
      }
    }

    console.log('✅ Login response processed');
    return response;
  }

  async verifyCode(data: {
    phone_number: string;
    code: string;
    password?: string;
  }) {
    console.log('🔐 Starting code verification...');
    console.log('📱 Phone number:', data.phone_number);
    console.log('🔢 Code length:', data.code.length);
    console.log('🔒 Has password:', !!data.password);

    const response = await this.request<any>(
      '/api/auth/verify',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      AUTH_TIMEOUT
    );

    if (response.session_token) {
      this.sessionToken = response.session_token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('session_token', response.session_token);
        console.log('💾 Session token saved to localStorage');
      }
    }

    console.log('✅ Verification response processed');
    return response;
  }

  async checkAuthStatus() {
    console.log('🔍 Checking authentication status...');
    try {
      const response = await this.request<{
        connected: boolean;
        phone_number?: string;
      }>('/api/auth/status');
      console.log('✅ Auth status check completed');
      return response;
    } catch (error) {
      console.log('❌ Auth status check failed');
      return { connected: false };
    }
  }

  // Chats
  async getChats() {
    console.log('💬 Fetching chats...');
    const response = await this.request<{ chats: any[] }>('/api/chats');
    console.log(`✅ Fetched ${response.chats?.length || 0} chats`);
    return response;
  }

  // Messages
  async sendMessage(data: {
    recipients: any[];
    message: string;
    schedule_for?: string;
  }) {
    console.log('📤 Sending message...');
    console.log('👥 Recipients count:', data.recipients.length);
    console.log('📝 Message length:', data.message.length);
    console.log('⏰ Scheduled:', !!data.schedule_for);

    return this.request<any>('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendMessageWithMedia(formData: FormData) {
    console.log('📤📷 Sending message with media...');
    return this.requestFormData<any>('/api/messages/send-media', formData);
  }

  async getScheduledMessages() {
    console.log('📅 Fetching scheduled messages...');
    const response = await this.request<{ messages: any[] }>(
      '/api/messages/scheduled'
    );
    console.log(
      `✅ Fetched ${response.messages?.length || 0} scheduled messages`
    );
    return response;
  }

  async executeScheduledMessage(messageId: string) {
    console.log('🚀 Executing scheduled message:', messageId);
    return this.request<any>(`/api/messages/execute/${messageId}`, {
      method: 'POST',
    });
  }

  async deleteScheduledMessage(messageId: string) {
    console.log('🗑️ Deleting scheduled message:', messageId);
    return this.request<any>(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    console.log('🏥 Performing health check...');
    const response = await this.request<{
      status: string;
      telegram_connected: boolean;
      active_clients: number;
    }>('/api/health');
    console.log('✅ Health check completed:', response);
    return response;
  }

  // Clear session
  clearSession() {
    console.log('🔄 Clearing session...');
    this.sessionToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('session_token');
      console.log('💾 Session token removed from localStorage');
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
