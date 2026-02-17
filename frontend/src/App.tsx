import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import BoardDetailPage from './pages/BoardDetailPage';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    if (isAuthenticated) return <Navigate to="/" replace />;
    return <>{children}</>;
}

export default function App() {
    return (
        <ErrorBoundary>
            <Routes>
                <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
                <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/board/:boardId" element={<ProtectedRoute><BoardDetailPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ToastContainer />
            <ConfirmDialog />
        </ErrorBoundary>
    );
}
