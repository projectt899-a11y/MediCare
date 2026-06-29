import { create } from 'zustand';

export interface LabResult {
  id: string;
  lab_request_id: string;
  lab_id: string;
  result_type: 'File Upload' | 'Manual Entry';
  file_path?: string;
  file_name?: string;
  file_size?: number;
  result_values?: Record<string, any>;
  doctor_visible_notes?: string;
  internal_lab_notes?: string;
  submitted_by: string;
  submitted_at: string;
  is_draft: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface LabResultStore {
  // State
  results: LabResult[];
  currentResult: LabResult | null;
  uploadProgress: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  submitResult: (requestId: string, result: Partial<LabResult>) => Promise<void>;
  fetchResult: (resultId: string) => Promise<void>;
  saveResultDraft: (requestId: string, result: Partial<LabResult>) => Promise<void>;
  uploadFile: (file: File, onProgress: (progress: number) => void) => Promise<string>;
  setUploadProgress: (progress: number) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentResult: (result: LabResult | null) => void;
  setError: (error: string | null) => void;
}

import { useAuthStore } from './authStore';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = (): string => {
  return useAuthStore.getState().accessToken || '';
};

// Helper function to make API calls
const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = {
    'Authorization': `Bearer ${getAuthToken()}`,
    ...options.headers,
  };

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
};

export const useLabResultStore = create<LabResultStore>((set, get) => ({
  // Initial state
  results: [],
  currentResult: null,
  uploadProgress: 0,
  isLoading: false,
  error: null,

  // Actions
  submitResult: async (requestId, result) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('requestId', requestId);
      formData.append('resultType', result.result_type || 'Manual Entry');
      
      if (result.result_values) {
        formData.append('resultValues', JSON.stringify(result.result_values));
      }
      if (result.doctor_visible_notes) {
        formData.append('doctorVisibleNotes', result.doctor_visible_notes);
      }
      if (result.internal_lab_notes) {
        formData.append('internalLabNotes', result.internal_lab_notes);
      }

      const response = await apiCall('/lab-results', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to submit result: ${response.statusText}`);
      }

      const data = await response.json();
      const newResult = data.data;

      const state = get();
      set({
        results: [...state.results, newResult],
        currentResult: newResult,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to submit result:', error);
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchResult: async (resultId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCall(`/lab-results/${resultId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch result: ${response.statusText}`);
      }

      const data = await response.json();
      set({ currentResult: data.data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch result:', error);
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  saveResultDraft: async (requestId, result) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('requestId', requestId);
      formData.append('resultType', result.result_type || 'Manual Entry');
      formData.append('isDraft', 'true');
      
      if (result.result_values) {
        formData.append('resultValues', JSON.stringify(result.result_values));
      }
      if (result.doctor_visible_notes) {
        formData.append('doctorVisibleNotes', result.doctor_visible_notes);
      }
      if (result.internal_lab_notes) {
        formData.append('internalLabNotes', result.internal_lab_notes);
      }

      const response = await apiCall('/lab-results', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to save draft: ${response.statusText}`);
      }

      const data = await response.json();
      const draftResult = data.data;

      const state = get();
      set({
        results: [...state.results, draftResult],
        currentResult: draftResult,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to save draft:', error);
      set({ error: errorMessage });
    } finally {
      set({ isLoading: false });
    }
  },

  uploadFile: async (file, onProgress) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Track upload progress
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
            set({ uploadProgress: percentComplete });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.data.filePath);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', `${API_BASE_URL}/lab-results/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
        xhr.send(formData);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to upload file:', error);
      set({ error: errorMessage });
      throw error;
    }
  },

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setCurrentResult: (result) => set({ currentResult: result }),

  setError: (error) => set({ error }),
}));
