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
    Chip,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
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
    Logout as LogoutIcon,
    Info as InfoIcon,
    History as AuditIcon,
    Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useThemeContext } from '../components/ThemeContext';
import { useAuth } from '../components/AuthContext';

const SIDEBAR_WIDTH = 260;

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactElement;
    roles: string[]; // which roles can see this item
}

const allNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, roles: ['ADMIN', 'USER'] },
    { label: 'Templates', path: '/templates', icon: <TemplatesIcon />, roles: ['ADMIN'] },
    { label: 'Forms', path: '/forms', icon: <FormsIcon />, roles: ['ADMIN'] },
    { label: 'Generate Report', path: '/generate-report', icon: <GenerateReportIcon />, roles: ['ADMIN', 'USER'] },
    { label: 'Reports', path: '/reports', icon: <ReportsIcon />, roles: ['ADMIN', 'USER'] },
    { label: 'Analytics', path: '/analytics', icon: <AnalyticsIcon />, roles: ['ADMIN'] },
    { label: 'Audit Logs', path: '/audit', icon: <AuditIcon />, roles: ['ADMIN'] },
    { label: 'Users', path: '/users', icon: <UsersIcon />, roles: ['ADMIN'] },
    { label: 'Settings', path: '/settings', icon: <SettingsIcon />, roles: ['ADMIN', 'USER'] },
];

const AppLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const { mode, toggleTheme } = useThemeContext();
    const { user, logout } = useAuth();

    // DB Integrity
    const [dbStatus, setDbStatus] = React.useState<{ isCorrupted: boolean; error: string | null } | null>(null);

    React.useEffect(() => {
        window.api.getDbStatus().then(setDbStatus);
    }, []);

    const handleRestoreDb = async () => {
        const result = await window.api.restoreBackup();
        if (!result.success && result.error) {
            alert(`Restore failed: ${result.error}`);
        }
    };

    // Filter nav items by current user's role
    const navItems = allNavItems.filter((item) => user && item.roles.includes(user.role));

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

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
                        display: 'flex',
                        flexDirection: 'column',
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
                <List sx={{ px: 0.5, flex: 1 }}>
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

                {/* User Info + Logout at Bottom */}
                <Divider sx={{ mt: 1 }} />
                <Box sx={{ px: 1.5, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
                            {user?.username}
                        </Typography>
                        <Chip
                            label={user?.role}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                mt: 0.3,
                                backgroundColor:
                                    user?.role === 'ADMIN'
                                        ? alpha(theme.palette.warning.main, 0.15)
                                        : alpha(theme.palette.info.main, 0.15),
                                color:
                                    user?.role === 'ADMIN'
                                        ? theme.palette.warning.main
                                        : theme.palette.info.main,
                            }}
                        />
                    </Box>
                    <Tooltip title="Sign out">
                        <IconButton
                            id="logout-button"
                            onClick={handleLogout}
                            size="small"
                            sx={{
                                color: 'text.secondary',
                                '&:hover': {
                                    color: theme.palette.error.main,
                                    backgroundColor: alpha(theme.palette.error.main, 0.08),
                                },
                            }}
                        >
                            <LogoutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
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
            {/* Integrity Modal */}
            <Dialog open={!!dbStatus?.isCorrupted} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>Database Corrupted</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        The application database appears to be corrupted and cannot be opened.
                        <br /><br />
                        <strong>Error:</strong> {dbStatus?.error}
                        <br /><br />
                        You must restore from a backup to continue.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRestoreDb} variant="contained" color="primary">
                        Restore from Backup
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default AppLayout;
