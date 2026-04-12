import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function WholesaleRoute({ children }) {
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const isWholesale = useAuthStore(s => s.isWholesale);

  if (!isLoggedIn()) return <Navigate to="/my-account" replace />;

  // Pending or rejected wholesale applications: bounce to dashboard.
  // The dashboard will show an "application under review" message if
  // wholesaleStatus === 'pending'.
  if (!isWholesale()) {
    if (user?.wholesaleStatus === 'pending' || user?.wholesaleStatus === 'rejected') {
      return <Navigate to="/my-account/dashboard" replace />;
    }
    return <Navigate to="/my-account/dashboard" replace />;
  }

  return children;
}
