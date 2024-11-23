import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize axios defaults
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Add axios interceptor for token handling
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add axios interceptor for token refresh
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axios(originalRequest);
        } catch (refreshError) {
          await logout();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.get('/api/auth/me');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        username: email,
        password: password,
      });

      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      await checkAuth();
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const register = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/register', {
        email,
        password,
      });

      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      await checkAuth();
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await axios.put('/api/auth/me', data);
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post('/api/auth/password/change', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return true;
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    register,
    updateProfile,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
