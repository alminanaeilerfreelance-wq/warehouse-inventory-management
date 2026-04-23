import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import api, { login as loginApi, register as registerApi, getMe, googleLogin as googleLoginApi } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = Boolean(token && user);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('wms_token') : null;
    if (storedToken) {
      setToken(storedToken);
      getMe()
        .then((res) => {
          setUser(res.data.data || res.data.user || res.data);
        })
        .catch(() => {
          localStorage.removeItem('wms_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await loginApi(credentials);
    const { token: newToken, user: newUser, data } = res.data;
    const resolvedToken = newToken || (data && data.token);
    const resolvedUser = newUser || (data && data.user) || data;

    if (resolvedToken) {
      localStorage.setItem('wms_token', resolvedToken);
      setToken(resolvedToken);
    }
    if (resolvedUser) {
      setUser(resolvedUser);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const signup = useCallback(async (data) => {
    const res = await registerApi(data);
    return res;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const res = await googleLoginApi(credential);
    const { token: newToken, user: newUser } = res.data;
    if (newToken) {
      localStorage.setItem('wms_token', newToken);
      setToken(newToken);
    }
    if (newUser) setUser(newUser);
    return res;
  }, []);

  const updateProfile = useCallback(async (data) => {
    const res = await api.put('/auth/profile', data);
    const updatedUser = res.data.user || res.data;
    setUser(updatedUser);
    return res;
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, logout, signup, googleLogin, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
