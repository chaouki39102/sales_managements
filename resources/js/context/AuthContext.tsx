import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api, { setToken, clearToken } from '@/lib/api';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // محاولة جلب بيانات المستخدم الحالية باستخدام التوكن المخزن
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data.data);
        })
        .catch(() => {
          // في حال كان التوكن منتهي الصلاحية أو غير صحيح
          clearToken();
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const res = await api.post<AuthResponse>('/auth/login', credentials);
    const token = res.data.data.token;
    const userData = res.data.data.user;

    // استدعاء الدوال المستوردة مباشرة لتحديث localStorage و Axios
    setToken(token);
    setUser(userData);
  };

  const register = async (data: RegisterData) => {
    const res = await api.post<AuthResponse>('/auth/register', data);
    const token = res.data.data.token;
    const userData = res.data.data.user;

    setToken(token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // تنظيف البيانات محلياً بغض النظر عن نجاح طلب السيرفر
      clearToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
