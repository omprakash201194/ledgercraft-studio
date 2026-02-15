import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
    Fade,
    IconButton,
    InputAdornment
} from '@mui/material';
import {
    AutoStories as LogoIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    Visibility,
    VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../components/AuthContext';
import { useThemeContext } from '../components/ThemeContext';

const LoginPage: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { login } = useAuth();
    const { mode, toggleTheme } = useThemeContext();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password);
        setLoading(false);

        if (result.success) {
            navigate('/dashboard', { replace: true });
        } else {
            setError(result.error || 'Login failed');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                    mode === 'dark'
                        ? 'linear-gradient(135deg, #0A0E1A 0%, #1A1040 50%, #0A0E1A 100%)'
                        : 'linear-gradient(135deg, #F4F6FB 0%, #E8EAF6 50%, #F4F6FB 100%)',
                position: 'relative',
            }}
        >
            {/* Theme Toggle - Top Right */}
            <IconButton
                onClick={toggleTheme}
                sx={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.16),
                    },
                }}
            >
                {mode === 'dark' ? (
                    <LightModeIcon sx={{ color: '#FFD54F' }} />
                ) : (
                    <DarkModeIcon sx={{ color: '#5C35D2' }} />
                )}
            </IconButton>

            <Fade in timeout={600}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 5,
                        width: 420,
                        maxWidth: '90vw',
                        border: `1px solid ${theme.palette.divider}`,
                        background:
                            mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha('#121829', 0.95)} 0%, ${alpha('#1A1040', 0.9)} 100%)`
                                : theme.palette.background.paper,
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Logo */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: 2.5,
                                mx: 'auto',
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                                boxShadow: '0 6px 20px rgba(124,77,255,0.35)',
                            }}
                        >
                            <LogoIcon sx={{ color: '#fff', fontSize: 28 }} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            LedgerCraft Studio
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            Sign in to continue
                        </Typography>
                    </Box>

                    {/* Error Alert */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Login Form */}
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            id="login-username"
                            label="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            fullWidth
                            required
                            autoFocus
                            sx={{ mb: 2 }}
                            disabled={loading}
                        />
                        <TextField
                            id="login-password"
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                            required
                            sx={{ mb: 3 }}
                            disabled={loading}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            id="login-submit"
                            type="submit"
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={loading || !username || !password}
                            sx={{
                                py: 1.4,
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                                boxShadow: '0 4px 16px rgba(124,77,255,0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #6A3DE8 0%, #3D7CE8 100%)',
                                    boxShadow: '0 6px 20px rgba(124,77,255,0.4)',
                                },
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                        </Button>
                    </Box>
                </Paper>
            </Fade>
        </Box>
    );
};

export default LoginPage;
