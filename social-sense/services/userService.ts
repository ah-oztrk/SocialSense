import { API_BASE_URL, logApiRequest, logApiResponse } from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from './authService';

// Interface for user update data
export interface UserUpdateData {
  username?: string;
  email?: string;
  name?: string;
  age?: number;
  gender?: string;
}

// Interface for user stats
export interface UserStats {
  total_questions: number;
  total_answers: number;
  most_recent_activity?: string;
  join_date: string;
}

export const userService = {
  // Get current user profile
  async getUserProfile(): Promise<User> {
    try {
      // First try to get from AsyncStorage for quick load
      const userData = await AsyncStorage.getItem('user_data');

      if (userData) {
        // Return cached user data
        const parsedUser: User = JSON.parse(userData);

        // But also refresh in the background for next time
        this.refreshUserProfile().catch(err =>
          console.log('Background refresh user error:', err)
        );

        return parsedUser;
      }

      // If not in AsyncStorage, fetch from API
      return await this.refreshUserProfile();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  // Fetch fresh user data from API
  async refreshUserProfile(): Promise<User> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/user/me`;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      logApiRequest(url, 'GET', headers, null);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const responseData = await logApiResponse(response);

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      const userData: User = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

      // Cache the user data
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      throw error;
    }
  },

  // Update user profile
  async updateUserProfile(updateData: UserUpdateData): Promise<User> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/user/update`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      // Only send fields that have values
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );

      logApiRequest(url, 'PUT', headers, cleanData);

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(cleanData),
      });

      const responseData = await logApiResponse(response);

      if (!response.ok) {
        throw new Error(`Failed to update user profile: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      const updatedUser: User = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

      // Update the cached user data
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Delete user account
  async deleteUserAccount(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/user/delete`;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      logApiRequest(url, 'DELETE', headers, null);

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const responseData = await logApiResponse(response);
        throw new Error(`Failed to delete user account: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      // Clear local storage after successful delete
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');

      return true;
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  },

  // Get user statistics
  async getUserStats(): Promise<UserStats> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/user/stats`;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      logApiRequest(url, 'GET', headers, null);

      // First try to get user data to extract join date
      const userData = await this.getUserProfile();

      try {
        // Attempt to get stats from API
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        const responseData = await logApiResponse(response);

        if (!response.ok) {
          // If API fails, return fallback stats
          return this.getFallbackStats(userData);
        }

        return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
      } catch (error) {
        console.error('Error fetching user stats, using fallback:', error);
        return this.getFallbackStats(userData);
      }
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  },

  // Generate fallback stats when API fails
  async getFallbackStats(userData: User): Promise<UserStats> {
    // This is a fallback if the stats endpoint isn't implemented yet
    return {
      total_questions: 0,
      total_answers: 0,
      join_date: userData.created_at || new Date().toISOString()
    };
  },

  // Change user password
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/auth/change-password`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      const data = {
        current_password: currentPassword,
        new_password: newPassword
      };

      logApiRequest(url, 'POST', headers, { ...data, new_password: '******' });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const responseData = await logApiResponse(response);
        throw new Error(`Failed to change password: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
};