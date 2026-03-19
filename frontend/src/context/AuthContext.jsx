import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const csrfPrimeRef = useRef(Promise.resolve());

  const loadUser = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Prime CSRF cookie for cookie-based auth flows.
    csrfPrimeRef.current = authApi.csrf().catch(() => {});
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    await csrfPrimeRef.current;
    await authApi.login({ email, password });
    const me = await authApi.me();
    setUser(me.data);
    return me.data;
  };

  const register = async (name, email, password, phone) => {
    await csrfPrimeRef.current;
    await authApi.register({ name, email, password, phone });
    const me = await authApi.me();
    setUser(me.data);
    return me.data;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
