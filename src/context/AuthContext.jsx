import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for token on mount
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    
    if (token) {
      setUser({ token, username });
      setIsAdmin(role === 'admin');
    }
    
    setIsLoading(false);
  }, []);


  const login = (userData, role) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', userData.username || '');
    setUser(userData);
    setIsAdmin(role === 'admin');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, login, logout }}>
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
