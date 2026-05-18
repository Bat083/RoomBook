import { apiClient } from './api';
import { User, LoginRequest } from '../types';

export const authService = {
  /**
   * Log in with username and password
   */
  async login(username: string, password: string): Promise<User> {
    const response = await apiClient.post<User>('/auth/login', {
      username,
      password,
    } as LoginRequest);
    return response.data;
  },

  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  /**
   * Get the currently authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
