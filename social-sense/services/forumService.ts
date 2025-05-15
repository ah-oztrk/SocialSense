import { API_BASE_URL, logApiRequest, logApiResponse } from '../constants/Config';
import { authService } from './authService';

export interface Answer {
  id: string;
  answer_id: string;
  question_id: string;
  user_id: string;
  username?: string;
  answer: string;
  creation_date: string;
}

export interface Question {
  id: string;
  question_id: string;
  user_id: string;
  username?: string;
  question_header: string;
  question: string;
  creation_date: string;
  answers?: Answer[];
}

export const forumService = {
  // Helper method to ensure token is valid
  async ensureAuthToken(): Promise<string> {
    const token = await authService.getToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Check token validity
    const isValid = await authService.verifyToken();
    if (!isValid) {
      // Try to refresh token
      const refreshSuccess = await authService.refreshToken();
      if (!refreshSuccess) {
        throw new Error('Authentication session expired. Please login again.');
      }
      // Get the new token
      return await authService.getToken() || '';
    }
    
    return token;
  },

  async getQuestions(): Promise<Question[]> {
    try {
      const token = await this.ensureAuthToken();
      const url = `${API_BASE_URL}/forum/question/all`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      logApiRequest(url, 'GET', headers, null);
      
      const response = await fetch(url, {
        headers
      });
      
      const responseData = await logApiResponse(response);
      
      if (response.status === 500) {
        console.error(`Server error when fetching questions: ${response.status}`);
        // Return empty array instead of throwing error for 500 status
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }
      
      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error fetching questions:', error);
      // Return empty array instead of propagating error
      return [];
    }
  },

  async postQuestion(title: string, content: string): Promise<Question> {
    try {
      const token = await this.ensureAuthToken();
      const url = `${API_BASE_URL}/forum/question/`;
      
      const payload = {
        question_header: title,
        question: content,
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      logApiRequest(url, 'POST', headers, payload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      const responseData = await logApiResponse(response);
      
      if (!response.ok) {
        throw new Error(`Failed to post question: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }
      
      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error posting question:', error);
      throw error;
    }
  },

  async getQuestion(questionId: string): Promise<Question> {
    try {
      const token = await this.ensureAuthToken();
      const url = `${API_BASE_URL}/forum/question/${questionId}`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      logApiRequest(url, 'GET', headers, null);
      
      const response = await fetch(url, {
        headers
      });
      
      const responseData = await logApiResponse(response);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch question: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }
      
      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error fetching question:', error);
      throw error;
    }
  },

  async postReply(questionId: string, content: string): Promise<Answer> {
    try {
      const token = await this.ensureAuthToken();
      const url = `${API_BASE_URL}/forum/answer/`;
      
      const payload = {
        question_id: questionId,
        answer: content,
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      logApiRequest(url, 'POST', headers, payload);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      const responseData = await logApiResponse(response);
      
      if (!response.ok) {
        throw new Error(`Failed to post reply: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }
      
      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error posting reply:', error);
      throw error;
    }
  },

  async getUserQuestions(): Promise<Question[]> {
    try {
      const token = await this.ensureAuthToken();
      const url = `${API_BASE_URL}/forum/my-questions/`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      logApiRequest(url, 'GET', headers, null);
      
      const response = await fetch(url, {
        headers
      });
      
      const responseData = await logApiResponse(response);
      
      if (response.status === 500) {
        console.error(`Server error when fetching user questions: ${response.status}`);
        // Return empty array instead of throwing error for 500 status
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user questions: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }
      
      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error fetching user questions:', error);
      // Return empty array instead of propagating error
      return [];
    }
  },

  async getQuestionAnswers(questionId: string): Promise<Answer[]> {
    try {
      const token = await this.ensureAuthToken();
      const url = `${API_BASE_URL}/forum/question/${questionId}/answers`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      logApiRequest(url, 'GET', headers, null);
      
      const response = await fetch(url, {
        headers
      });
      
      const responseData = await logApiResponse(response);
      
      if (response.status === 500) {
        console.error(`Server error when fetching answers: ${response.status}`);
        // Return empty array instead of throwing error for 500 status
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch answers: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }
      
      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error fetching answers:', error);
      // Return empty array instead of propagating error
      return [];
    }
  },

  async getAnswer(answerId: string): Promise<Answer> {
    try {
      const token = await this.ensureAuthToken();
      const url = `${API_BASE_URL}/forum/answer/${answerId}`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      logApiRequest(url, 'GET', headers, null);
      
      const response = await fetch(url, {
        headers
      });
      
      const responseData = await logApiResponse(response);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch answer: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }
      
      return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    } catch (error) {
      console.error('Error fetching answer:', error);
      throw error;
    }
  },
  
  async deleteQuestion(questionId: string): Promise<void> {
    try {
      const token = await this.ensureAuthToken();
      const url = `${API_BASE_URL}/forum/question/${questionId}`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      logApiRequest(url, 'DELETE', headers, null);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });
      
      const responseData = await logApiResponse(response);
      
      if (!response.ok) {
        throw new Error(`Failed to delete question: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }
      
      return;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  },
  
  async deleteAnswer(answerId: string): Promise<void> {
    try {
      const token = await this.ensureAuthToken();
      const url = `${API_BASE_URL}/forum/answer/${answerId}`;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      logApiRequest(url, 'DELETE', headers, null);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });
      
      const responseData = await logApiResponse(response);
      
      if (!response.ok) {
        throw new Error(`Failed to delete answer: ${response.status} ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      }
      
      return;
    } catch (error) {
      console.error('Error deleting answer:', error);
      throw error;
    }
  }
}; 