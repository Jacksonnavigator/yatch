import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { yachtApi } from '../api/client';

// Provide a stable null default to make HMR/provider race conditions less fatal
const YachtContext = createContext(null);

export function YachtProvider({ children }) {
  const [yacht, setYacht] = useState(null);
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load yacht and extras on mount
  useEffect(() => {
    refreshYacht();
  }, []);

  // Fetch fresh yacht data
  const refreshYacht = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [yachtRes, extrasRes] = await Promise.all([
        yachtApi.get(),
        yachtApi.getExtras(),
      ]);
      console.log('🔄 Yacht context updated:', yachtRes.data);
      setYacht(yachtRes.data);
      setExtras(extrasRes.data);
    } catch (err) {
      setError(err.message);
      console.error('❌ Failed to load yacht data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    yacht,
    extras,
    loading,
    error,
    refreshYacht, // Call this after any update to sync data globally
  };

  return (
    <YachtContext.Provider value={value}>
      {children}
    </YachtContext.Provider>
  );
}

export function useYacht() {
  const context = useContext(YachtContext);
  // During fast refresh or transient reloading the provider may be momentarily
  // unavailable. Return safe defaults instead of throwing so the app doesn't
  // crash in development; this keeps the UI stable until the provider is
  // reattached. In production the provider should always be present.
  if (!context) {
    return {
      yacht: null,
      extras: [],
      loading: true,
      error: null,
      refreshYacht: async () => {},
    };
  }
  return context;
}
