'use client';

import { redirect } from 'next/navigation';

/**
 * Base API response type
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Options for API requests
 */
export interface ApiRequestOptions {
  redirectOnUnauthorized?: boolean;
  redirectPath?: string;
}

const defaultOptions: ApiRequestOptions = {
  redirectOnUnauthorized: true,
  redirectPath: '/sign-in',
};

/**
 * Handles API errors
 */
const handleApiError = (status: number, options: ApiRequestOptions = defaultOptions) => {
  if (status === 401 && options.redirectOnUnauthorized) {
    redirect(options.redirectPath || '/sign-in');
  }
};

/**
 * Base function for making API requests
 */
async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  apiOptions: ApiRequestOptions = defaultOptions
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle unauthorized and redirect if needed
    if (response.status === 401) {
      handleApiError(response.status, apiOptions);
    }

    // Parse the response
    const result = await response.json();

    // Return the parsed response
    return result;
  } catch (error) {
    console.error('API request error:', error);
    return { error: 'Failed to make request' };
  }
}

/**
 * Auth API
 */
export const authApi = {
  /**
   * Sign in a user
   */
  signIn: async (email: string, password: string): Promise<ApiResponse> => {
    return apiRequest('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Sign up a new user
   */
  signUp: async (email: string, password: string): Promise<ApiResponse> => {
    return apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Sign out the current user
   */
  signOut: async (): Promise<ApiResponse> => {
    const response = await apiRequest('/api/auth/signout', {
      method: 'POST',
    });
    
    // Redirect to sign-in page after successful sign out
    if (!response.error) {
      redirect('/sign-in');
    }
    
    return response;
  },
};

/**
 * User API
 */
export const userApi = {
  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ApiResponse> => {
    return apiRequest('/api/user', {
      method: 'GET',
    });
  },

  /**
   * Update user account details
   */
  updateAccount: async (name: string, email: string): Promise<ApiResponse> => {
    return apiRequest('/api/user', {
      method: 'PUT',
      body: JSON.stringify({ name, email }),
    });
  },

  /**
   * Update user password
   */
  updatePassword: async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<ApiResponse> => {
    return apiRequest('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
  },

  /**
   * Delete user account
   */
  deleteAccount: async (password: string): Promise<ApiResponse> => {
    const response = await apiRequest('/api/user/delete', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    
    // Redirect to sign-in page after successful account deletion
    if (!response.error) {
      redirect('/sign-in');
    }
    
    return response;
  },

  /**
   * Update notification preferences
   */
  updateNotifications: async (marketingEmails: boolean): Promise<ApiResponse> => {
    return apiRequest('/api/user/notifications', {
      method: 'PUT',
      body: JSON.stringify({ marketingEmails }),
    });
  },

  /**
   * Upload profile image
   */
  uploadProfileImage: async (formData: FormData): Promise<ApiResponse> => {
    try {
      const response = await fetch('/api/user/profile-image', {
        method: 'POST',
        body: formData,
      });
      
      if (response.status === 401) {
        handleApiError(response.status);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      return { error: 'Failed to upload image' };
    }
  },
};