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
    Dns as DnsIcon
} from '@mui/icons-material';

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
    const [version, setVersion] = useState<string>('Loading...');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        window.api.getAppVersion().then(setVersion).catch(() => setVersion('Unknown'));
    }, []);

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
