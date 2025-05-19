// Configuration for API endpoints based on environment
import { Platform } from 'react-native';

// Debug Mode - Set to true for more detailed logging
export const DEBUG_MODE = true;

// Determine the appropriate API URL based on the platform and environment
let baseUrl = 'http://127.0.0.1:8000';

// For Android emulator, use 10.0.2.2 instead of localhost

// If you're testing on a physical device, you can uncomment and use your computer's local IP
// baseUrl = 'http://192.168.1.X:8000'; // Replace X with your actual IP address

// Uncomment to use ngrok for external testing
baseUrl = 'https://81fc-159-20-69-4.ngrok-free.app';

console.log(`API_BASE_URL configured as: ${baseUrl}`);

export const API_BASE_URL = baseUrl;

// Debug helper for API requests
export const logApiRequest = (url: string, method: string, headers: any, body: any) => {
  console.log(`API Request: ${method} ${url}`);
  if (DEBUG_MODE) {
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  }
};

export const logApiResponse = async (response: Response) => {
  const status = response.status;
  const statusText = response.statusText;
  const headers = Object.fromEntries([...response.headers.entries()]);

  console.log(`API Response: ${status} ${statusText}`);
  if (DEBUG_MODE) {
    console.log('Headers:', JSON.stringify(headers, null, 2));
  }

  try {
    // Clone the response to avoid consuming it
    const clonedResponse = response.clone();
    const text = await clonedResponse.text();

    if (DEBUG_MODE || !response.ok) {
      console.log('Response body:', text);
    }

    try {
      // Try to parse as JSON if possible
      const json = JSON.parse(text);
      if (DEBUG_MODE || !response.ok) {
        console.log('Response as JSON:', json);
      }
      return json;
    } catch {
      // If not JSON, return the text
      return text;
    }
  } catch (error) {
    console.log('Could not read response body:', error);
    return null;
  }
}; 