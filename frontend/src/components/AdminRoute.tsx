import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth';

interface Props {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: Props) {
  const user = authService.getUser();

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
