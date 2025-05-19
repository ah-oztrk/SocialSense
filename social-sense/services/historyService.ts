import { API_BASE_URL, logApiRequest, logApiResponse } from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface for history item
export interface History {
  history_id: string;
  user_id: string;
  query_set: string[];
  query_number: number;
  assistant_name: string;
}

// Interface for creating history
export interface HistoryCreate {
  history_id?: string; // Optional, system will generate if not provided
}

// Interface for updating history
export interface HistoryUpdate {
  query_id: string;
}

export const historyService = {
  // Create a new history
  async createHistory(data: HistoryCreate): Promise<History> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/history/`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      logApiRequest(url, 'POST', headers, data);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const responseData = await logApiResponse(response);

      if (!response.ok) {
        throw new Error(`Failed to create history: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error creating history:', error);
      throw error;
    }
  },

  // Get all histories for the current user
  async getUserHistories(): Promise<History[]> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // First try to get cached histories for faster display
      const cachedHistories = await AsyncStorage.getItem('user_histories');
      if (cachedHistories) {
        // Return cached data but refresh in background
        this.refreshUserHistories().catch(err =>
          console.log('Background refresh histories error:', err)
        );
        return JSON.parse(cachedHistories);
      }

      return await this.refreshUserHistories();
    } catch (error) {
      console.error('Error getting user histories:', error);
      throw error;
    }
  },

  // Refresh histories data from API
  async refreshUserHistories(): Promise<History[]> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      if (!token || !user) {
        throw new Error('No authentication token or user data found');
      }

      const url = `${API_BASE_URL}/history/user/?user_id=${user.id}`;

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
        throw new Error(`Failed to fetch histories: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      const histories: History[] = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

      // Cache the histories data
      await AsyncStorage.setItem('user_histories', JSON.stringify(histories));

      return histories;
    } catch (error) {
      console.error('Error refreshing user histories:', error);
      throw error;
    }
  },

  // Get specific history by ID
  async getHistory(historyId: string): Promise<History> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/history/${historyId}`;

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
        throw new Error(`Failed to fetch history: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error(`Error getting history ${historyId}:`, error);
      throw error;
    }
  },

  // Add a query to history
  async addQueryToHistory(historyId: string, queryId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/history/${historyId}/add-query`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      const data: HistoryUpdate = {
        query_id: queryId
      };

      logApiRequest(url, 'PUT', headers, data);

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const responseData = await logApiResponse(response);
        throw new Error(`Failed to add query to history: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      // Update cached histories after successful add
      await this.refreshUserHistories();

      return true;
    } catch (error) {
      console.error(`Error adding query to history ${historyId}:`, error);
      throw error;
    }
  },

  // Remove a query from history
  async removeQueryFromHistory(historyId: string, queryId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/history/${historyId}/remove-query`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      logApiRequest(url, 'DELETE', headers, { query_id: queryId });

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ query_id: queryId }),
      });

      if (!response.ok) {
        const responseData = await logApiResponse(response);
        throw new Error(`Failed to remove query from history: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      // Update cached histories after successful removal
      await this.refreshUserHistories();

      return true;
    } catch (error) {
      console.error(`Error removing query from history ${historyId}:`, error);
      throw error;
    }
  },

  // Delete a history
  async deleteHistory(historyId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/history/${historyId}`;

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
        throw new Error(`Failed to delete history: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }

      // Update cached histories after successful deletion
      await this.refreshUserHistories();

      return true;
    } catch (error) {
      console.error(`Error deleting history ${historyId}:`, error);
      throw error;
    }
  },

  // Clear local history cache
  async clearHistoryCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('user_histories');
    } catch (error) {
      console.error('Error clearing history cache:', error);
      throw error;
    }
  },

  // Get the most recent history
  async getMostRecentHistory(): Promise<History | null> {
    try {
      const histories = await this.getUserHistories();

      if (!histories || histories.length === 0) {
        return null;
      }

      // Sort by query_number (assuming more queries means more recent activity)
      // You might want to change this if you have a timestamp in your history model
      return histories.sort((a, b) => b.query_number - a.query_number)[0];
    } catch (error) {
      console.error('Error getting most recent history:', error);
      throw error;
    }
  }
};