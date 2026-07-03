import { WorkoutSession } from './types';

// Use a relative URL so it hits the Vite dev server, which will proxy it to the backend.
// This allows the app to work on other devices (like your phone) on the same network.
const API_BASE_URL = '/api';

export const api = {
  /**
   * Fetches the merged workout history data from the FastAPI backend.
   */
  fetchWorkoutHistory: async (): Promise<WorkoutSession[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch workout history');
      }
      const data = await response.json();
      return data as WorkoutSession[];
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Triggers a Strava data sync in the backend.
   */
  syncStravaData: async (): Promise<{ status: string; message: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/strava/sync`, {
        method: 'POST',
      });
      if (!response.ok) {
        let detail = 'Failed to trigger Strava sync';
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            detail = errorData.detail;
          }
        } catch {
          // Fall back to the generic message when the response body is not JSON.
        }
        throw new Error(detail);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Updates a specific workout log entry.
   */
  updateWorkoutLog: async (logId: string, entry: any): Promise<{ status: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/log/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!response.ok) {
        throw new Error('Failed to update workout log');
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Deletes a specific workout log entry.
   */
  deleteWorkoutLog: async (logId: string): Promise<{ status: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/log/${logId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete workout log');
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};
