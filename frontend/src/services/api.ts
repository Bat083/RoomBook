import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Include cookies for session
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 401) {
        // Unauthorized - redirect to login
        window.location.href = '/login';
      }

      return Promise.reject(data);
    } else if (error.request) {
      // Request made but no response received
      return Promise.reject({
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to server',
      });
    } else {
      // Error in request setup
      return Promise.reject({
        error: 'REQUEST_ERROR',
        message: error.message,
      });
    }
  }
);

export default api;
