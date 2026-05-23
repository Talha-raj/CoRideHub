import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Android emulator routes localhost to 10.0.2.2; iOS simulator uses localhost
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = `http://${DEV_HOST}:5000/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth-storage');
    console.log('Auth storage token:', token);
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.state?.user?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.user.token}`;
          console.log('Authorization header set:', config.url);
          console.log(config.data)
        } else {
          console.log('No token found in parsed state');
        }
      } catch (e) {
        console.log('Error parsing auth token:', e);
      }
    } else {
      console.log('No auth-storage found');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      await AsyncStorage.removeItem('auth-storage');
      
      console.log('Unauthorized access - token cleared');
    }

    if (error.response) {
      console.log('API Error:', error.response.data);
    } else if (error.request) {
      console.log('Network Error:', error.request);
    } else {
      console.log('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;

export const setAuthToken = async (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};
