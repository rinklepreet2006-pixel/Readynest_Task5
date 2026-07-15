import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantSubdomain: string;
  tenantSubscription: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: any) => Promise<void>;
  logout: () => void;
  updateSubscriptionState: (subscription: string) => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [refreshTokenVal, setRefreshTokenVal] = useState<string | null>(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && accessToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    setAccessToken(data.accessToken);
    setRefreshTokenVal(data.refreshToken);
    setUser(data.user);
  };

  const signup = async (payload: any) => {
    const res = await fetch(`${API_BASE}/auth/register-tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setAccessToken(null);
    setRefreshTokenVal(null);
    setUser(null);
  };

  const updateSubscriptionState = (subscription: string) => {
    if (user) {
      const updated = { ...user, tenantSubscription: subscription };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    }
  };

  // Perform token refresh operation
  const performTokenRefresh = async (): Promise<string> => {
    const rt = localStorage.getItem('refreshToken') || refreshTokenVal;
    if (!rt) throw new Error('No refresh token available');

    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rt }),
    });

    const data = await res.json();
    if (!res.ok) {
      logout();
      throw new Error('Session expired');
    }

    localStorage.setItem('accessToken', data.accessToken);
    setAccessToken(data.accessToken);
    return data.accessToken;
  };

  // Centralized fetch interceptor to handle Auth header and Auto-Refresh on token expiration
  const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    let token = localStorage.getItem('accessToken') || accessToken;
    
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    options.headers = headers;

    let res = await fetch(`${API_BASE}${endpoint}`, options);

    // If 403 / 401 unauthorized, attempt a refresh
    if (res.status === 401 || res.status === 403) {
      try {
        const newToken = await performTokenRefresh();
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        options.headers = retryHeaders;
        
        // Retry fetch with new token
        res = await fetch(`${API_BASE}${endpoint}`, options);
      } catch (err) {
        logout();
        throw new Error('Session expired');
      }
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateSubscriptionState, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
