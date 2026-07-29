import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import NewContract from './pages/NewContract';
import Analysis from './pages/Analysis';

export default function App() {
  return (
    <div className="min-h-screen bg-ethiopian-cream">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/new" element={<ProtectedRoute><NewContract /></ProtectedRoute>} />
        <Route path="/analysis/:id" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
