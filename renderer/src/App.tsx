import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeContextProvider } from './components/ThemeContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';
import PlaceholderPage from './pages/PlaceholderPage';
import { Box, CircularProgress } from '@mui/material';

/**
 * Guard component that redirects to /login if user is not authenticated.
 */
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

/**
 * Guard component that redirects to /dashboard if user IS authenticated (for login page).
 */
const GuestRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

/**
 * Guard for admin-only routes.
 */
const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { user } = useAuth();

    if (user?.role !== 'ADMIN') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

const App: React.FC = () => {
    return (
        <ThemeContextProvider>
            <AuthProvider>
                <HashRouter>
                    <Routes>
                        {/* Login — only accessible when NOT logged in */}
                        <Route
                            path="/login"
                            element={
                                <GuestRoute>
                                    <LoginPage />
                                </GuestRoute>
                            }
                        />

                        {/* Protected app routes */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="templates" element={<PlaceholderPage title="Templates" />} />
                            <Route path="forms" element={<PlaceholderPage title="Forms" />} />
                            <Route path="generate-report" element={<PlaceholderPage title="Generate Report" />} />
                            <Route path="reports" element={<PlaceholderPage title="Reports" />} />
                            <Route
                                path="users"
                                element={
                                    <AdminRoute>
                                        <UsersPage />
                                    </AdminRoute>
                                }
                            />
                            <Route path="settings" element={<PlaceholderPage title="Settings" />} />
                        </Route>

                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </HashRouter>
            </AuthProvider>
        </ThemeContextProvider>
    );
};

export default App;
