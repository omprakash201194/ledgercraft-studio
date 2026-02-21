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
    AutoStories as LogoIcon,
    Logout as LogoutIcon,
    Info as InfoIcon,
    History as AuditIcon,
    Analytics as AnalyticsIcon,
    Menu as MenuIcon,
    ChevronLeft as ChevronLeftIcon,
    SettingsApplications as ClientTypesIcon,
} from '@mui/icons-material'; import { useAuth } from '../components/AuthContext';

const SIDEBAR_WIDTH = 260;
const COLLAPSED_SIDEBAR_WIDTH = 70;

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
    { label: 'Clients', path: '/clients', icon: <UsersIcon />, roles: ['ADMIN', 'USER'] },
    { label: 'Client Types', path: '/client-types', icon: <ClientTypesIcon />, roles: ['ADMIN'] },
    { label: 'Analytics', path: '/analytics', icon: <AnalyticsIcon />, roles: ['ADMIN'] },
    { label: 'Audit Logs', path: '/audit', icon: <AuditIcon />, roles: ['ADMIN'] },
    { label: 'Users', path: '/users', icon: <UsersIcon />, roles: ['ADMIN'] },
    { label: 'Settings', path: '/settings', icon: <SettingsIcon />, roles: ['ADMIN', 'USER'] },
];

const AppLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const { user, logout } = useAuth();

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

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

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: isSidebarOpen ? SIDEBAR_WIDTH : COLLAPSED_SIDEBAR_WIDTH,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    transition: theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    '& .MuiDrawer-paper': {
                        width: isSidebarOpen ? SIDEBAR_WIDTH : COLLAPSED_SIDEBAR_WIDTH,
                        boxSizing: 'border-box',
                        background:
                            theme.palette.mode === 'dark'
                                ? 'linear-gradient(180deg, #0F1525 0%, #0A0E1A 100%)'
                                : 'linear-gradient(180deg, #FFFFFF 0%, #F4F6FB 100%)',
                        borderRight: `1px solid ${theme.palette.divider}`,
                        px: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        overflowX: 'hidden',
                    },
                }}
            >
                {/* Logo Section */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: isSidebarOpen ? 1.5 : 1,
                        py: 2.5,
                        mb: 1,
                        justifyContent: isSidebarOpen ? 'flex-start' : 'center',
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
                            flexShrink: 0,
                            background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                            boxShadow: '0 4px 12px rgba(124,77,255,0.3)',
                        }}
                    >
                        <LogoIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                    {isSidebarOpen && (
                        <Box sx={{ minWidth: 0, opacity: isSidebarOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }} noWrap>
                                LedgerCraft
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }} noWrap>
                                Studio
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {/* Navigation */}
                <List sx={{ px: 0.5, flex: 1 }}>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Tooltip title={!isSidebarOpen ? item.label : ''} placement="right" key={item.path}>
                                <ListItemButton
                                    selected={isActive}
                                    onClick={() => navigate(item.path)}
                                    sx={{
                                        px: 1.5,
                                        py: 1,
                                        mb: 0.3,
                                        justifyContent: isSidebarOpen ? 'initial' : 'center',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
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
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 0,
                                            mr: isSidebarOpen ? 2 : 0,
                                            justifyContent: 'center',
                                            color: 'text.secondary'
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    {isSidebarOpen && (
                                        <ListItemText
                                            primary={item.label}
                                            primaryTypographyProps={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                noWrap: true
                                            }}
                                            sx={{ opacity: isSidebarOpen ? 1 : 0 }}
                                        />
                                    )}
                                </ListItemButton>
                            </Tooltip>
                        );
                    })}
                </List>

                {/* User Info + Logout at Bottom */}
                <Divider sx={{ mt: 1 }} />
                <Box sx={{ px: 1.5, py: 2, display: 'flex', alignItems: 'center', gap: 1, justifyContent: isSidebarOpen ? 'flex-start' : 'center', flexDirection: isSidebarOpen ? 'row' : 'column' }}>
                    {isSidebarOpen ? (
                        <>
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
                        </>
                    ) : (
                        <Tooltip title="Sign out">
                            <IconButton
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
                    )}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton
                                onClick={toggleSidebar}
                                edge="start"
                                sx={{ color: 'text.secondary' }}
                            >
                                {isSidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
                            </IconButton>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
                                LedgerCraft Studio
                            </Typography>
                        </Box>
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
