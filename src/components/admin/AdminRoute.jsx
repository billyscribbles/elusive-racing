import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '../../lib/adminAuth';

export default function AdminRoute({ children }) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}
