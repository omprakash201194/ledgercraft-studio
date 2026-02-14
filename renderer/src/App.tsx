import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeContextProvider } from './components/ThemeContext';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import PlaceholderPage from './pages/PlaceholderPage';

const App: React.FC = () => {
    return (
        <ThemeContextProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<AppLayout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="templates" element={<PlaceholderPage title="Templates" />} />
                        <Route path="forms" element={<PlaceholderPage title="Forms" />} />
                        <Route path="generate-report" element={<PlaceholderPage title="Generate Report" />} />
                        <Route path="reports" element={<PlaceholderPage title="Reports" />} />
                        <Route path="users" element={<PlaceholderPage title="Users" />} />
                        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
                    </Route>
                </Routes>
            </HashRouter>
        </ThemeContextProvider>
    );
};

export default App;
