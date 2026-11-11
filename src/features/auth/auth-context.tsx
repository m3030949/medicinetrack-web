import * as React from 'react';
import {
  apiClient,
  registerUnauthorizedHandler,
  setAccessToken,
} from '@/lib/api-client';
import type {
  AuthUser,
  LoginResult,
  SignupPayload,
  SignupResult,
  UserRole,
} from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  signup: (payload: SignupPayload) => Promise<SignupResult>;
  verifyMfa: (challengeToken: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function getDefaultHomeForRole(role: UserRole): string {
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
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
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
      const refreshRes = await apiClient.post<{
        accessToken: string;
        user: AuthUser;
      }>('/auth/refresh', {});
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

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<LoginResult>('/auth/login', {
      email,
      password,
    });
    if (!res.data.mfaRequired && res.data.accessToken && res.data.user) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
    }
    return res.data;
  }, []);

  const signup = React.useCallback(async (payload: SignupPayload) => {
    const res = await apiClient.post<SignupResult>('/auth/signup', payload);
    if (!res.data.pendingApproval && res.data.accessToken && res.data.user) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
    }
    return res.data;
  }, []);

  const verifyMfa = React.useCallback(
    async (challengeToken: string, code: string) => {
      const res = await apiClient.post<{
        accessToken: string;
        user: AuthUser;
      }>('/auth/mfa/verify', { challengeToken, code });
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      return res.data.user;
    },
    [],
  );

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
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

