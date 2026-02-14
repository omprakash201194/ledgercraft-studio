import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
    useTheme,
    alpha,
    Fade,
} from '@mui/material';
import {
    CheckCircleOutline as CheckIcon,
    RocketLaunch as RocketIcon,
    Info as InfoIcon,
    FolderOpen as FolderIcon,
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
    const theme = useTheme();
    const [pingResult, setPingResult] = useState<string>('...');
    const [appDataPath, setAppDataPath] = useState<string>('...');

    useEffect(() => {
        try {
            const result = window.api?.ping();
            setPingResult(result || 'API not available');
        } catch {
            setPingResult('API not available (running in browser)');
        }

        (async () => {
            try {
                const path = await window.api?.getAppDataPath();
                setAppDataPath(path || 'Not available');
            } catch {
                setAppDataPath('Not available (running in browser)');
            }
        })();
    }, []);

    const cardSx = (gradientStart: string, gradientEnd: string, hoverColor: string) => ({
        p: 3,
        border: `1px solid ${theme.palette.divider}`,
        background:
            theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${alpha(gradientStart, 0.06)} 0%, ${alpha(gradientEnd, 0.04)} 100%)`
                : `linear-gradient(135deg, ${alpha(gradientStart, 0.04)} 0%, ${alpha(gradientEnd, 0.02)} 100%)`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 24px ${alpha(hoverColor, 0.12)}`,
        },
    });

    return (
        <Fade in timeout={500}>
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                {/* Hero Section */}
                <Box sx={{ mb: 4, textAlign: 'center', pt: 2 }}>
                    <Box
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: 3,
                            mx: 'auto',
                            mb: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 50%, #00E5FF 100%)',
                            boxShadow: '0 8px 32px rgba(124,77,255,0.35)',
                        }}
                    >
                        <RocketIcon sx={{ color: '#fff', fontSize: 36 }} />
                    </Box>
                    <Typography variant="h4" sx={{ mb: 0.5 }}>
                        LedgerCraft Studio
                    </Typography>
                    <Chip
                        label="v1.0.0-alpha"
                        size="small"
                        variant="outlined"
                        sx={{
                            borderColor: alpha(theme.palette.primary.main, 0.4),
                            color: theme.palette.primary.main,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                        }}
                    />
                </Box>

                {/* Status Cards */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 2.5,
                        mb: 2.5,
                    }}
                >
                    {/* IPC Status Card */}
                    <Paper elevation={0} sx={cardSx('#7C4DFF', '#448AFF', theme.palette.primary.main)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <CheckIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
                            <Typography variant="overline" sx={{ fontWeight: 600, letterSpacing: 1 }}>
                                IPC Bridge
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                            Electron ↔ Renderer communication
                        </Typography>
                        <Box
                            sx={{
                                px: 2,
                                py: 1,
                                borderRadius: 2,
                                backgroundColor: alpha(theme.palette.success.main, 0.1),
                                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                fontSize: '0.85rem',
                            }}
                        >
                            <Typography
                                component="span"
                                sx={{ color: 'text.secondary', fontFamily: 'inherit', fontSize: 'inherit' }}
                            >
                                ping() →{' '}
                            </Typography>
                            <Typography
                                component="span"
                                sx={{
                                    color: theme.palette.success.main,
                                    fontWeight: 600,
                                    fontFamily: 'inherit',
                                    fontSize: 'inherit',
                                }}
                            >
                                "{pingResult}"
                            </Typography>
                        </Box>
                    </Paper>

                    {/* App Info Card */}
                    <Paper elevation={0} sx={cardSx('#00E5FF', '#7C4DFF', theme.palette.secondary.main)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <InfoIcon sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />
                            <Typography variant="overline" sx={{ fontWeight: 600, letterSpacing: 1 }}>
                                Application Info
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                            {[
                                { label: 'Stack', value: 'Electron + React + TypeScript' },
                                { label: 'UI Framework', value: 'Material UI v6' },
                                { label: 'Database', value: 'SQLite (better-sqlite3)' },
                                { label: 'Milestone', value: '2 — Database' },
                            ].map((item) => (
                                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {item.label}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {item.value}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Box>

                {/* App Data Path Card — Full Width */}
                <Paper elevation={0} sx={cardSx('#FF9800', '#7C4DFF', '#FF9800')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <FolderIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                        <Typography variant="overline" sx={{ fontWeight: 600, letterSpacing: 1 }}>
                            App Data Location
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        Local storage directory (database, templates, reports, logs)
                    </Typography>
                    <Box
                        sx={{
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            backgroundColor: alpha('#FF9800', 0.08),
                            border: `1px solid ${alpha('#FF9800', 0.2)}`,
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            fontSize: '0.8rem',
                            wordBreak: 'break-all',
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: 'inherit',
                                fontSize: 'inherit',
                                color: 'text.primary',
                                fontWeight: 500,
                            }}
                        >
                            {appDataPath}
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Fade>
    );
};

export default Dashboard;
