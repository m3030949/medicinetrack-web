import * as React from 'react';
import {
  apiClient,
  registerUnauthorizedHandler,
  setAccessToken,
} from '@/lib/api-client';

const AuthContext = React.createContext(undefined);

export const getDefaultHomeForRole = (role) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/dashboard';
    case 'PHARMACY_ADMIN':
      return '/pharmacy/dashboard';
    case 'HOSPITAL_ADMIN':
    case 'CLINICIAN':
      return '/hospital/dashboard';
    case 'NURSE':
      return '/nurse/dashboard';
    default:
      return '/login';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const clearSession = React.useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  React.useEffect(() => {
    registerUnauthorizedHandler(clearSession);
  }, [clearSession]);

  const refreshProfile = React.useCallback(async () => {
    try {
      const refreshRes = await apiClient.post('/auth/refresh', {});
      setAccessToken(refreshRes.data.accessToken);
      setUser(refreshRes.data.user);
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  React.useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = React.useCallback(async (email, password) => {
    const res = await apiClient.post('/auth/login', {
      email,
      password,
    });
    if (!res.data.mfaRequired && res.data.accessToken && res.data.user) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
    }
    return res.data;
  }, []);

  const signup = React.useCallback(async (payload) => {
    const res = await apiClient.post('/auth/signup', payload);
    if (!res.data.pendingApproval && res.data.accessToken && res.data.user) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
    }
    return res.data;
  }, []);

  const verifyMfa = React.useCallback(async (challengeToken, code) => {
    const res = await apiClient.post('/auth/mfa/verify', {
      challengeToken,
      code,
    });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      clearSession();
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        verifyMfa,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

