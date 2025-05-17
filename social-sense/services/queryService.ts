import { API_BASE_URL, logApiRequest, logApiResponse } from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface for a single query
export interface Query {
  id: string;
  query: string;
  response: string;
  user_id: string;
  creation_date: string;
  history_id: string;
}

export const queryService = {
  // Get query by query ID
  async getQueryById(queryId: string): Promise<Query> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = `${API_BASE_URL}/query/${queryId}`;
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
        throw new Error(
          `Failed to fetch query: ${response.status} ${
            typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
          }`
        );
      }

      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error fetching query by ID:', error);
      throw error;
    }
  }
};
