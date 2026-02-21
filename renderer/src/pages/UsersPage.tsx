import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    TextField,


    MenuItem,
    Alert,
    Chip,
    Fade,
    useTheme,
    alpha,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Snackbar,
    IconButton,
} from '@mui/material';
import { PersonAdd as PersonAddIcon, LockReset as LockResetIcon } from '@mui/icons-material';

interface SafeUser {
    id: string;
    username: string;
    role: string;
    created_at: string;
}

const UsersPage: React.FC = () => {
    const theme = useTheme();
    const [users, setUsers] = useState<SafeUser[]>([]);
    const [loading, setLoading] = useState(true);

    // New user form
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('USER');
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadUsers = useCallback(async () => {
        try {
            const result = await window.api.getAllUsers();
            if (result.success) {
                setUsers(result.users);
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setSubmitting(true);

        const result = await window.api.createUser(username, password, role);
        setSubmitting(false);

        if (result.success) {
            setFormSuccess(`User "${username}" created successfully`);
            setUsername('');
            setPassword('');
            setRole('USER');
            loadUsers();
        } else {
            setFormError(result.error || 'Failed to create user');
        }
    };

    // Password Reset State
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [snackbarMsg, setSnackbarMsg] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    const openResetDialog = (user: SafeUser) => {
        setSelectedUser(user);
        setNewPassword('');
        setResetDialogOpen(true);
    };

    const handleResetPassword = async () => {
        if (!selectedUser || !newPassword) return;

        try {
            const result = await window.api.resetUserPassword(selectedUser.id, newPassword);
            if (result.success) {
                setSnackbarMsg(`Password for ${selectedUser.username} reset successfully`);
                setSnackbarSeverity('success');
                setResetDialogOpen(false);
            } else {
                setSnackbarMsg(result.error || 'Failed to reset password');
                setSnackbarSeverity('error');
            }
        } catch (err) {
            console.error(err);
            setSnackbarMsg('An unexpected error occurred');
            setSnackbarSeverity('error');
        }
    };

    return (
        <>
            <Fade in timeout={500}>
                <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                    <Typography variant="h5" sx={{ mb: 3 }}>
                        User Management
                    </Typography>

                    {/* Add User Form */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            border: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <PersonAddIcon sx={{ color: theme.palette.primary.main }} />
                            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                                Add New User
                            </Typography>
                        </Box>

                        {formError && (
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setFormError('')}>
                                {formError}
                            </Alert>
                        )}
                        {formSuccess && (
                            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setFormSuccess('')}>
                                {formSuccess}
                            </Alert>
                        )}

                        <Box
                            component="form"
                            onSubmit={handleAddUser}
                            sx={{
                                display: 'flex',
                                gap: 2,
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                            }}
                        >
                            <TextField
                                id="new-user-username"
                                label="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                size="small"
                                sx={{ flex: 1, minWidth: 160 }}
                                disabled={submitting}
                            />
                            <TextField
                                id="new-user-password"
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                size="small"
                                sx={{ flex: 1, minWidth: 160 }}
                                disabled={submitting}
                            />
                            <TextField
                                id="new-user-role"
                                label="Role"
                                select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                size="small"
                                sx={{ minWidth: 130 }}
                                disabled={submitting}
                            >
                                <MenuItem value="USER">USER</MenuItem>
                                <MenuItem value="ADMIN">ADMIN</MenuItem>
                            </TextField>
                            <Button
                                id="add-user-submit"
                                type="submit"
                                variant="contained"
                                disabled={submitting || !username || !password}
                                sx={{
                                    height: 40,
                                    px: 3,
                                    background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #6A3DE8 0%, #3D7CE8 100%)',
                                    },
                                }}
                            >
                                {submitting ? <CircularProgress size={20} color="inherit" /> : 'Add User'}
                            </Button>
                        </Box>
                    </Paper>

                    {/* Users Table */}
                    <Paper
                        elevation={0}
                        sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            overflow: 'hidden',
                        }}
                    >
                        {loading ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <CircularProgress size={32} />
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                                            <TableCell sx={{ fontWeight: 600, width: 100 }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {users.map((user) => (
                                            <TableRow key={user.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {user.username}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={user.role}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem',
                                                            backgroundColor:
                                                                user.role === 'ADMIN'
                                                                    ? alpha(theme.palette.warning.main, 0.15)
                                                                    : alpha(theme.palette.info.main, 0.15),
                                                            color:
                                                                user.role === 'ADMIN'
                                                                    ? theme.palette.warning.main
                                                                    : theme.palette.info.main,
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton
                                                        onClick={() => openResetDialog(user)}
                                                        size="small"
                                                        title="Reset Password"
                                                        color="primary"
                                                    >
                                                        <LockResetIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {users.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                        No users found
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>
                </Box>
            </Fade>

            {/* Password Reset Dialog */}
            <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Enter a new password for user <strong>{selectedUser?.username}</strong>.
                    </DialogContentText>
                    <TextField
                        margin="dense"
                        id="reset-password"
                        label="New Password"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleResetPassword} variant="contained" color="primary" disabled={!newPassword}>
                        Reset Password
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success/Error Snackbar */}
            <Snackbar open={!!snackbarMsg} autoHideDuration={6000} onClose={() => setSnackbarMsg('')}>
                <Alert onClose={() => setSnackbarMsg('')} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMsg}
                </Alert>
            </Snackbar>
        </>
    );
};

export default UsersPage;
