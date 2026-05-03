import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../App';

const ProtectedRoute: React.FC = () => {
  const { isAuth } = useAuth();

  if (!isAuth) {
    console.log('ProtectedRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute: User authenticated, rendering outlet');
  return <Outlet />;
};

export default ProtectedRoute;