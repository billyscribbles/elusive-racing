import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function WholesaleRoute({ children }) {
  const { isLoggedIn, isWholesale } = useAuthStore();
  if (!isLoggedIn()) return <Navigate to="/my-account" replace />;
  if (!isWholesale()) return <Navigate to="/my-account/dashboard" replace />;
  return children;
}
