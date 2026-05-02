import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token } = response.data;

          const userWithToken = { ...user, token };

          set({
            user: userWithToken,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true, user: userWithToken };
        } catch (error) {
          const message =
            error.response?.data?.message || error.message || 'Login failed';
          set({
            error: message,
            isLoading: false,
          });
          return { success: false, error: message };
        }
      },

      signup: async userData => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/signup', userData);
          const { user, token } = response.data;

          const userWithToken = { ...user, token };

          set({
            user: userWithToken,
            isAuthenticated: true,
            isLoading: false,
          });
          console.log(userWithToken);
          return { success: true, user: userWithToken };
        } catch (error) {
          console.log(error, 'Signup');
          const message =
            error.response?.data?.message || error.message || 'Signup failed';
          set({
            error: message,
            isLoading: false,
          });
          return { success: false, error: message };
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updateUser: userData => {
        set(state => ({
          user: { ...state.user, ...userData },
        }));
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
