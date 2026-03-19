import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--muted)', fontSize:12, letterSpacing:3 }}>LOADING…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

export function OwnerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--muted)', fontSize:12, letterSpacing:3 }}>LOADING…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'owner') return <Navigate to="/" replace />;
  return children;
}
