import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    Grid,
    Divider,
    Fade,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    useTheme,
    alpha,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Snackbar,
    Stack
} from '@mui/material';
import {
    Person as PersonIcon,
    Description as ReportIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    OpenInNew as OpenIcon,
    Download as DownloadIcon,
    ArrowBack as BackIcon,
    MoreVert as MoreIcon
} from '@mui/icons-material';
import { useAuth } from '../components/AuthContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';

interface Client {
    id: string;
    name: string;
    client_type_id: string; // We might want to fetch Client Type Name if possible, but ID is what we have on Client object
    category_id: string | null;
    created_at: string;
    field_values?: Record<string, string>;
}

interface ReportRecord {
    id: string;
    form_id: string;
    generated_by: string;
    file_path: string;
    generated_at: string;
    form_name: string;
    generated_by_username: string;
}

const ClientDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const theme = useTheme();
    const { user } = useAuth();

    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Reports State
    const [reports, setReports] = useState<ReportRecord[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [reportsPage, setReportsPage] = useState(0);
    const [reportsRowsPerPage, setReportsRowsPerPage] = useState(5);
    const [totalReports, setTotalReports] = useState(0);

    // Deletion Dialog State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reportCount, setReportCount] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Snackbar State
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // Initial Load
    useEffect(() => {
        if (!id) return;

        const loadClient = async () => {
            setLoading(true);
            try {
                const data = await window.api.getClientById(id);
                if (data) {
                    setClient(data);
                } else {
                    setError('Client not found');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load client details');
            } finally {
                setLoading(false);
            }
        };

        loadClient();
    }, [id]);

    // Load Reports for Client
    const loadReports = useCallback(async () => {
        if (!id) return;
        setLoadingReports(true);
        try {
            // Passing clientId as the last argument
            const result = await window.api.getReports(
                reportsPage + 1,
                reportsRowsPerPage,
                undefined, // formId
                undefined, // search
                'generated_at',
                'DESC',
                id // clientId
            );
            setReports(result.reports);
            setTotalReports(result.total);
        } catch (err) {
            console.error('Failed to load client reports', err);
        } finally {
            setLoadingReports(false);
        }
    }, [id, reportsPage, reportsRowsPerPage]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleGenerateReport = () => {
        if (client) {
            navigate(`/generate-report?clientId=${client.id}`);
        }
    };

    const handleDeleteClick = async () => {
        if (!client) return;
        try {
            const count = await window.api.getClientReportCount(client.id);
            setReportCount(count);
            setDeleteDialogOpen(true);
        } catch (err) {
            console.error('Failed to get report count', err);
            setSnackbar({ open: true, message: 'Failed to verify client reports. Cannot proceed with deletion.', severity: 'error' });
        }
    };

    const closeDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setReportCount(null);
    };

    const confirmDeleteOnly = async () => {
        if (!client) return;
        setDeleting(true);
        try {
            const result = await window.api.deleteClientOnly(client.id);
            if (result.success) {
                setSnackbar({ open: true, message: 'Client deleted successfully.', severity: 'success' });
                setTimeout(() => navigate('/clients'), 1500);
            } else {
                throw new Error(result.error || 'Failed to delete client');
            }
        } catch (err: any) {
            console.error(err);
            setSnackbar({ open: true, message: err.message || 'Error deleting client', severity: 'error' });
            setDeleting(false);
            closeDeleteDialog();
        }
    };

    const confirmDeleteWithReports = async () => {
        if (!client) return;
        setDeleting(true);
        try {
            const result = await window.api.deleteClientWithReports(client.id);
            if (result.success) {
                setSnackbar({ open: true, message: 'Client and reports deleted successfully.', severity: 'success' });
                setTimeout(() => navigate('/clients'), 1500);
            } else {
                throw new Error(result.error || 'Failed to delete client and reports');
            }
        } catch (err: any) {
            console.error(err);
            setSnackbar({ open: true, message: err.message || 'Error deleting client and reports', severity: 'error' });
            setDeleting(false);
            closeDeleteDialog();
        }
    };

    const handleDownloadReportsZip = async () => {
        if (!client) return;
        setDeleting(true); // Re-using state to disable buttons
        try {
            const result = await window.api.exportClientReportsZip(client.id);
            if (result.success && result.zipPath) {
                setSnackbar({ open: true, message: 'Reports archived. Starting download...', severity: 'success' });
                try {
                    await window.api.downloadReport(result.zipPath);
                    setSnackbar({ open: true, message: 'Archive downloaded successfully.', severity: 'success' });
                } catch (dErr) {
                    console.error('Download failed', dErr);
                    setSnackbar({ open: true, message: 'Archive created but download failed.', severity: 'error' });
                }
            } else {
                throw new Error(result.error || 'Failed to create archive');
            }
        } catch (err: any) {
            console.error('Archive failed', err);
            setSnackbar({ open: true, message: err.message || 'Failed to create archive', severity: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const handleOpenFile = async (filePath: string) => {
        await window.api.openFile(filePath);
    };

    const handleDownload = async (filePath: string) => {
        try {
            await window.api.downloadReport(filePath);
        } catch {
            // ignore
        }
    };

    /** Extract just the filename from a full path. */
    const getFileName = (filePath: string): string => {
        return filePath.split(/[\\/]/).pop() || 'report.docx';
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !client) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">{error || 'Client not found'}</Alert>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/clients')} sx={{ mt: 2 }}>
                    Back to Clients
                </Button>
            </Box>
        );
    }

    return (
        <Fade in timeout={500}>
            <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
                {/* Header */}
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/clients')}>
                        <BackIcon />
                    </IconButton>
                    <Typography variant="h5" sx={{ flexGrow: 1 }}>
                        Client Details
                    </Typography>
                    {user?.role === 'ADMIN' && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleDeleteClick}
                        >
                            Delete Client
                        </Button>
                    )}
                </Box>

                <Grid container spacing={3}>
                    {/* Top Section: Client Info */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }} elevation={0}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: '50%',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <PersonIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h4">{client.name}</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                            <Chip label={client.client_type_id} size="small" />
                                            {client.category_id && <Chip label={`Category: ${client.category_id}`} size="small" variant="outlined" />}
                                        </Box>
                                    </Box>
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleGenerateReport}
                                    sx={{
                                        background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                                        boxShadow: '0 4px 12px rgba(124,77,255,0.3)',
                                    }}
                                >
                                    Generate Report
                                </Button>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                Client Details
                            </Typography>

                            <Grid container spacing={2}>
                                {client.field_values && Object.entries(client.field_values).map(([key, value]) => (
                                    <Grid item xs={12} sm={6} md={3} key={key}>
                                        <Box sx={{ p: 1.5, bgcolor: theme.palette.action.hover, borderRadius: 1 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block' }}>
                                                {key}
                                            </Typography>
                                            <Typography variant="body1" fontWeight={500}>
                                                {value || '-'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                                {(!client.field_values || Object.keys(client.field_values).length === 0) && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                            No additional details recorded.
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Bottom Section: Reports History */}
                    <Grid item xs={12}>
                        <Paper sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }} elevation={0}>
                            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ReportIcon color="action" />
                                <Typography variant="h6">Reports History</Typography>
                            </Box>

                            {loadingReports ? (
                                <Box sx={{ p: 4, textAlign: 'center' }}>
                                    <CircularProgress size={32} />
                                </Box>
                            ) : (
                                <>
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 600 }}>Report (File)</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Form</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Generated By</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {reports.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                                                            <Typography variant="body2" color="text.secondary">
                                                                No reports generated for this client yet.
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    reports.map((report) => (
                                                        <TableRow key={report.id} hover>
                                                            <TableCell>
                                                                <Chip
                                                                    icon={<ReportIcon />}
                                                                    label={getFileName(report.file_path)}
                                                                    variant="outlined"
                                                                    size="small"
                                                                    onClick={() => handleOpenFile(report.file_path)}
                                                                    sx={{ cursor: 'pointer' }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>{report.form_name}</TableCell>
                                                            <TableCell>{report.generated_by_username}</TableCell>
                                                            <TableCell>{formatDateTime(report.generated_at, 'DD-MM-YYYY')}</TableCell>
                                                            <TableCell align="right">
                                                                <Button
                                                                    size="small"
                                                                    startIcon={<OpenIcon />}
                                                                    onClick={() => handleOpenFile(report.file_path)}
                                                                    sx={{ mr: 1 }}
                                                                >
                                                                    Open
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    startIcon={<DownloadIcon />}
                                                                    onClick={() => handleDownload(report.file_path)}
                                                                >
                                                                    Download
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <TablePagination
                                        rowsPerPageOptions={[5, 10, 25]}
                                        component="div"
                                        count={totalReports}
                                        rowsPerPage={reportsRowsPerPage}
                                        page={reportsPage}
                                        onPageChange={(e, newPage) => setReportsPage(newPage)}
                                        onRowsPerPageChange={(e) => {
                                            setReportsRowsPerPage(parseInt(e.target.value, 10));
                                            setReportsPage(0);
                                        }}
                                    />
                                </>
                            )}
                        </Paper>
                    </Grid>
                </Grid>

                {/* Deletion Dialogs */}
                <Dialog open={deleteDialogOpen && reportCount === 0} onClose={!deleting ? closeDeleteDialog : undefined}>
                    <DialogTitle>Delete Client</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete this client? This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeDeleteDialog} disabled={deleting}>Cancel</Button>
                        <Button onClick={confirmDeleteOnly} color="error" variant="contained" disabled={deleting}>
                            {deleting ? <CircularProgress size={24} color="inherit" /> : 'Delete'}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteDialogOpen && reportCount !== null && reportCount > 0} onClose={!deleting ? closeDeleteDialog : undefined} maxWidth="sm" fullWidth>
                    <DialogTitle>Delete Client</DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2}>
                            <Alert severity="warning">
                                This client has {reportCount} associated report{reportCount !== 1 ? 's' : ''}.
                            </Alert>
                            <Typography>
                                Choose how you would like to proceed.
                            </Typography>
                            <Stack spacing={2}>
                                {/* Section 1 (Safe Option) */}
                                <Button
                                    onClick={confirmDeleteOnly}
                                    color="primary"
                                    variant="outlined"
                                    disabled={deleting}
                                    fullWidth
                                >
                                    Detach Reports (Keep Files)
                                </Button>

                                {/* Section 2 (Destructive Option) */}
                                <Button
                                    onClick={confirmDeleteWithReports}
                                    color="error"
                                    variant="contained"
                                    disabled={deleting}
                                    fullWidth
                                >
                                    {deleting ? <CircularProgress size={24} color="inherit" /> : 'Delete Client + Reports'}
                                </Button>
                            </Stack>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownloadReportsZip}
                            disabled={deleting}
                            sx={{ mr: 'auto' }}
                        >
                            Download Reports
                        </Button>
                        <Button onClick={closeDeleteDialog} disabled={deleting}>
                            Cancel
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Fade >
    );
};

export default ClientDetailPage;
