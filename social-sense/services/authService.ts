import { API_BASE_URL, logApiRequest, logApiResponse } from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface for user data
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  age?: number;
  gender?: string;
  created_at: string;
}

// Interface for login data
interface LoginData {
  username: string;
  password: string;
}

// Interface for registration data
interface RegisterData {
  username: string;
  email: string;
  name: string;
  password: string;
  age?: number;
  gender?: string;
}

// Interface for token response
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_at: number;
}

const TOKEN_STORAGE_KEY = 'auth_token';
const USER_STORAGE_KEY = 'user_data';

export const authService = {
  // Set token to storage
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  },

  // Get token from storage
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  },

  // Remove token from storage
  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  },

  // Store user data
  async setUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },

  // Get user data
  async getUser(): Promise<User | null> {
    const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  // Remove user data
  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  },

  // Login user
  async login(loginData: LoginData): Promise<{ user: User; token: string }> {
    try {
      // The full URL for the login endpoint
      const loginUrl = `${API_BASE_URL}/auth/login`;

      // Create form data instead of JSON for OAuth2PasswordRequestForm compatibility
      const formData = new URLSearchParams();
      formData.append('username', loginData.username);
      formData.append('password', loginData.password);

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      };

      logApiRequest(loginUrl, 'POST', headers, formData.toString());

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers,
        body: formData.toString(),
      });

      // Log and parse the response
      const responseData = await logApiResponse(response);

      if (!response.ok) {
        const detail = typeof responseData === 'string'
          ? responseData
          : responseData.detail || JSON.stringify(responseData);
        throw new Error(detail);
      }

      // Parse the JSON response
      const tokenData: TokenResponse = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

      // Store the token
      await this.setToken(tokenData.access_token);

      // Fetch user data with the token
      const userData = await this.getCurrentUser(tokenData.access_token);

      // Store user data
      await this.setUser(userData);

      return { user: userData, token: tokenData.access_token };
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  },

  // Register a new user
  async register(registerData: RegisterData): Promise<{ user: User; token: string }> {
    try {
      const registerUrl = `${API_BASE_URL}/auth/register`;

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      logApiRequest(registerUrl, 'POST', headers, registerData);

      const response = await fetch(registerUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(registerData),
      });

      // Log and parse the response
      const responseData = await logApiResponse(response);

      if (!response.ok) {
        throw new Error(`Failed to register: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      // The register endpoint returns user data, not a token
      const userData: User = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

      // After registration, we need to log in to get a token
      const { token } = await this.login({
        username: registerData.username,
        password: registerData.password
      });

      // Store user data
      await this.setUser(userData);

      return { user: userData, token };
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  },

  // Get current user data
  async getCurrentUser(token?: string): Promise<User> {
    try {
      const authToken = token || await this.getToken();

      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const userUrl = `${API_BASE_URL}/user/me`;

      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json',
      };

      logApiRequest(userUrl, 'GET', headers, null);

      const response = await fetch(userUrl, {
        method: 'GET',
        headers,
      });

      // Log and parse the response
      const responseData = await logApiResponse(response);

      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      const token = await this.getToken();

      if (token) {
        // Try to hit the backend logout endpoint
        const url = `${API_BASE_URL}/auth/logout`;

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        };

        logApiRequest(url, 'POST', headers, null);

        try {
          // We don't need to wait for the response or check it
          // The important part is clearing local tokens
          fetch(url, {
            method: 'POST',
            headers,
          });
        } catch (error) {
          // Ignore network errors during logout
          console.warn('Error calling logout endpoint:', error);
        }
      }

      // Always clear local storage even if backend call fails
      await this.removeToken();
      await this.removeUser();
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear local storage even if there's an error
      await this.removeToken();
      await this.removeUser();
    }
  },

  // Check if user is logged in
  async isLoggedIn(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        return false;
      }

      // Verify the token is valid by making a test API call
      try {
        // Try to verify token with backend but don't fail if network issue
        await this.verifyToken();
        return true;
      } catch (error) {
        console.error('Error verifying token:', error);

        // Only clear token on specific errors, not network errors
        if (error instanceof Error) {
          // Check if error is a network error, if so, just return true
          // This allows offline use with existing token
          if (error.message.includes('Network request failed')) {
            console.log('Network error, but token exists - continuing session');
            return true;
          }

          // If token is invalid or expired, clear it
          if (error.message.includes('invalid') ||
            error.message.includes('expired') ||
            error.message.includes('401') ||
            error.message.includes('403')) {
            await this.removeToken();
            await this.removeUser();
            return false;
          }
        }

        // For other errors, keep token but return false to trigger login
        return false;
      }
    } catch (error) {
      console.error('Error in isLoggedIn:', error);
      return false;
    }
  },

  // Verify token validity with backend
  async verifyToken(): Promise<boolean> {
    try {
      const token = await this.getToken();

      if (!token) {
        throw new Error('No authentication token found');
      }

      const verifyUrl = `${API_BASE_URL}/auth/verify-token`;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      logApiRequest(verifyUrl, 'GET', headers, null);

      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers,
      });

      // Log and parse the response
      const responseData = await logApiResponse(response);

      if (!response.ok) {
        throw new Error(`Invalid token: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  },

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const token = await this.getToken();

      if (!token) {
        return false;
      }

      const url = `${API_BASE_URL}/auth/refresh-token`;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      logApiRequest(url, 'POST', headers, null);

      const response = await fetch(url, {
        method: 'POST',
        headers,
      });

      // Log and parse the response
      const responseData = await logApiResponse(response);

      if (!response.ok) {
        console.error(`Token refresh failed: ${response.status}`);
        return false;
      }

      // Parse the JSON response
      const tokenData: TokenResponse = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

      // Store the new token
      await this.setToken(tokenData.access_token);

      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  },

  // Update user profile
  async updateProfile(updateData: Partial<User>): Promise<User> {
    try {
      const token = await this.getToken();

      if (!token) {
        throw new Error('No authentication token found');
      }

      const updateUrl = `${API_BASE_URL}/user/update`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      logApiRequest(updateUrl, 'PUT', headers, updateData);

      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData),
      });

      // Log and parse the response
      const responseData = await logApiResponse(response);

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      const updatedUser = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

      // Update stored user data
      await this.setUser(updatedUser);

      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
}; 