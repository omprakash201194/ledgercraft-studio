import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    IconButton,
    Divider,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Description as TemplatesIcon,
    DynamicForm as FormsIcon,
    Summarize as GenerateReportIcon,
    Assessment as ReportsIcon,
    People as UsersIcon,
    Settings as SettingsIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    AutoStories as LogoIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../components/ThemeContext';

const SIDEBAR_WIDTH = 260;

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactElement;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { label: 'Templates', path: '/templates', icon: <TemplatesIcon /> },
    { label: 'Forms', path: '/forms', icon: <FormsIcon /> },
    { label: 'Generate Report', path: '/generate-report', icon: <GenerateReportIcon /> },
    { label: 'Reports', path: '/reports', icon: <ReportsIcon /> },
    { label: 'Users', path: '/users', icon: <UsersIcon /> },
    { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

const AppLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const { mode, toggleTheme } = useThemeContext();

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: SIDEBAR_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: SIDEBAR_WIDTH,
                        boxSizing: 'border-box',
                        background:
                            mode === 'dark'
                                ? 'linear-gradient(180deg, #0F1525 0%, #0A0E1A 100%)'
                                : 'linear-gradient(180deg, #FFFFFF 0%, #F4F6FB 100%)',
                        borderRight: `1px solid ${theme.palette.divider}`,
                        px: 1.5,
                    },
                }}
            >
                {/* Logo Section */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 1.5,
                        py: 2.5,
                        mb: 1,
                    }}
                >
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                            boxShadow: '0 4px 12px rgba(124,77,255,0.3)',
                        }}
                    >
                        <LogoIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                            LedgerCraft
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            Studio
                        </Typography>
                    </Box>
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {/* Navigation */}
                <List sx={{ px: 0.5 }}>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <ListItemButton
                                key={item.path}
                                selected={isActive}
                                onClick={() => navigate(item.path)}
                                sx={{
                                    px: 1.5,
                                    py: 1,
                                    mb: 0.3,
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                        transform: 'translateX(2px)',
                                    },
                                    ...(isActive && {
                                        '& .MuiListItemIcon-root': {
                                            color: theme.palette.primary.main,
                                        },
                                        '& .MuiListItemText-primary': {
                                            color: theme.palette.primary.main,
                                            fontWeight: 600,
                                        },
                                    }),
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                    }}
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
            </Drawer>

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Topbar */}
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        backgroundColor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(12px)',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        color: 'text.primary',
                    }}
                >
                    <Toolbar sx={{ justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
                            LedgerCraft Studio
                        </Typography>
                        <IconButton
                            onClick={toggleTheme}
                            size="medium"
                            sx={{
                                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.16),
                                    transform: 'rotate(20deg)',
                                },
                            }}
                        >
                            {mode === 'dark' ? (
                                <LightModeIcon sx={{ color: '#FFD54F' }} />
                            ) : (
                                <DarkModeIcon sx={{ color: '#5C35D2' }} />
                            )}
                        </IconButton>
                    </Toolbar>
                </AppBar>

                {/* Page Content */}
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        overflow: 'auto',
                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};

export default AppLayout;
