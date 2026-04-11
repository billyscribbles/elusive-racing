import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '../../lib/adminAuth';

export default function AdminLogin() {
  // Already authenticated — go straight to admin panel
  if (isAdminAuthenticated()) return <Navigate to="/admin/products" replace />;
  // Otherwise redirect to unified login
  return <Navigate to="/my-account" replace />;
}
