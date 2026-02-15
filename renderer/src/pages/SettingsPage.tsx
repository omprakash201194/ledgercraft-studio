import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Divider,
    Alert,
    Stack
} from '@mui/material';
import {
    Backup as BackupIcon,
    Restore as RestoreIcon,
    Info as InfoIcon,
    Code as CodeIcon,
    Storage as StorageIcon,
    Dns as DnsIcon,
    Palette as PaletteIcon,
    CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useAuth } from '../components/AuthContext';
import { useThemeContext } from '../components/ThemeContext';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
    SelectChangeEvent
} from '@mui/material';

const TechnicalDetails: React.FC = () => {
    const [appPath, setAppPath] = useState('Loading...');
    const [dbStatus, setDbStatus] = useState<any>(null);

    useEffect(() => {
        window.api.getAppDataPath().then(setAppPath).catch(() => setAppPath('Unknown'));
        window.api.getDbStatus().then(setDbStatus).catch(() => { });
    }, []);

    return (
        <Stack spacing={1}>
            <Box>
                <Typography variant="caption" color="text.secondary">App Data Path</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{appPath}</Typography>
            </Box>
            <Box>
                <Typography variant="caption" color="text.secondary">Database Status</Typography>
                <Typography variant="body2" color={dbStatus?.isCorrupted ? 'error' : 'success.main'}>
                    {dbStatus?.isCorrupted ? 'Corrupted' : 'Healthy'}
                </Typography>
                {dbStatus?.path && (
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', wordBreak: 'break-all' }}>
                        {dbStatus.path}
                    </Typography>
                )}
            </Box>
            <Box>
                <Typography variant="caption" color="text.secondary">Tech Stack</Typography>
                <Typography variant="body2">Electron, React, TypeScript, SQLite (better-sqlite3)</Typography>
            </Box>
        </Stack>
    );
};

const SettingsPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { mode, setMode } = useThemeContext();
    const [version, setVersion] = useState<string>('Loading...');
    const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        window.api.getAppVersion().then(setVersion).catch(() => setVersion('Unknown'));
        // Load initial prefs
        if (currentUser) {
            window.api.getUserPreferences(currentUser.id).then((prefs: any) => {
                setDateFormat(prefs.date_format || 'DD-MM-YYYY');
            });
        }
    }, [currentUser]);

    const handleThemeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'light' | 'dark' | null) => {
        if (newMode !== null) {
            setMode(newMode); // Context updates immediately
            if (currentUser) {
                window.api.updateUserPreferences(currentUser.id, { theme: newMode });
            }
        }
    };

    const handleDateFormatChange = (event: SelectChangeEvent) => {
        const newFormat = event.target.value;
        setDateFormat(newFormat);
        // Note: Global context for date format needed? Or just save to DB?
        // For now save to DB. Components using it should fetch or use a context.
        // Ideally we'd have a PreferencesContext but I'll update DB.
        if (currentUser) {
            window.api.updateUserPreferences(currentUser.id, { date_format: newFormat });
        }
    };

    const handleExport = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const result = await window.api.exportBackup();
            if (result.success) {
                setMessage({ type: 'success', text: 'Backup exported successfully.' });
            } else if (result.cancelled) {
                // do nothing
            } else {
                setMessage({ type: 'error', text: result.error || 'Export failed.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const result = await window.api.restoreBackup();
            if (result.success) {
                // App will restart, but just in case
                setMessage({ type: 'success', text: 'Restoring... Application will restart.' });
            } else if (result.cancelled) {
                // do nothing
            } else {
                setMessage({ type: 'error', text: result.error || 'Restore failed.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>Settings</Typography>

            {message && (
                <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}

            {/* About Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <InfoIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">About</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Application Info</Typography>
                        <Stack spacing={1}>
                            <Typography variant="body2"><strong>Name:</strong> LedgerCraft Studio</Typography>
                            <Typography variant="body2"><strong>Version:</strong> v{version}</Typography>
                            <Typography variant="body2"><strong>Tagline:</strong> Offline Document Automation for CA Firms</Typography>
                        </Stack>

                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>Developer Contact</Typography>
                        <Stack spacing={1}>
                            <Typography variant="body2">Designed and Developed by <strong>Omprakash Gautam</strong></Typography>
                            <Typography variant="body2">Email: <a href="mailto:omprakash201194@gmail.com">omprakash201194@gmail.com</a></Typography>
                        </Stack>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Technical Information</Typography>
                        <Stack spacing={1}>
                            <TechnicalDetails />
                        </Stack>
                    </Box>
                </Box>
            </Paper>

            {/* Preferences Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PaletteIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Preferences</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Theme</Typography>
                        <ToggleButtonGroup
                            value={mode}
                            exclusive
                            onChange={handleThemeChange}
                            aria-label="theme"
                            size="small"
                            fullWidth
                        >
                            <ToggleButton value="light">
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#f5f5f5', border: '1px solid #ddd' }} />
                                    <Typography variant="body2">Light</Typography>
                                </Stack>
                            </ToggleButton>
                            <ToggleButton value="dark">
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#121829', border: '1px solid #444' }} />
                                    <Typography variant="body2">Dark</Typography>
                                </Stack>
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Date Format</Typography>
                        <FormControl fullWidth size="small">
                            <Select
                                value={dateFormat}
                                onChange={handleDateFormatChange}
                                startAdornment={<CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
                            >
                                <MenuItem value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</MenuItem>
                                <MenuItem value="MM-DD-YYYY">MM-DD-YYYY (12-31-2024)</MenuItem>
                                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Paper>

            {/* Data Management Section */}
            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BackupIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Data Management</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" paragraph>
                    Manage your application data. You can export a full backup of your database, templates, and reports, or restore from a previous backup.
                </Typography>

                <Stack direction="row" spacing={2} mt={3}>
                    <Button
                        variant="outlined"
                        startIcon={<BackupIcon />}
                        onClick={handleExport}
                        disabled={loading}
                    >
                        Export Backup
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        startIcon={<RestoreIcon />}
                        onClick={handleRestore}
                        disabled={loading}
                    >
                        Restore Backup
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default SettingsPage;
