import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import type { Owner } from '../types';

interface AuthContextType {
  owner: Owner | null;
  login: (owner: Owner) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 验证用户是否已登录（通过调用 /api/me 端点）
    // JWT 存储在 httpOnly cookie 中，由浏览器自动发送
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        setOwner(res.data);
      } catch {
        // 未登录或 token 过期
        setOwner(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (newOwner: Owner) => {
    // JWT 已通过 httpOnly cookie 设置，不需要在客户端存储
    setOwner(newOwner);
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setOwner(null);
    }
  };

  return (
    <AuthContext.Provider value={{ owner, login, logout, isAuthenticated: !!owner, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
