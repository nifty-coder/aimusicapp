import { supabase } from './supabase';

// Backend API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string;
  profile_picture: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    // Get Firebase ID token
    const { currentUser } = await import('@/contexts/AuthContext');
    // We'll need to access this differently - let me update this
    return null;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Get Firebase ID token
      const token = await this.getFirebaseToken();
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error.message || 'Request failed',
      };
    }
  }

  private async getFirebaseToken(): Promise<string> {
    // This will be updated to get the actual Firebase token
    // For now, we'll need to pass it from the component
    throw new Error('Firebase token not available');
  }

  // Profile API methods
  async getProfile(token: string): Promise<ApiResponse<Profile>> {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP error! status: ${response.status}`,
      };
    }

    return data;
  }

  async createProfile(token: string, profileData: Partial<Profile>): Promise<ApiResponse<Profile>> {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP error! status: ${response.status}`,
      };
    }

    return data;
  }

  async updateProfile(token: string, updates: Partial<Profile>): Promise<ApiResponse<Profile>> {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP error! status: ${response.status}`,
      };
    }

    return data;
  }

  async deleteProfile(token: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP error! status: ${response.status}`,
      };
    }

    return data;
  }
}

export const apiService = new ApiService();
