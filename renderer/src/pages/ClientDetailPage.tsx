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
    alpha
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

    const handleDeleteClient = () => {
        // Placeholder
        alert('Delete Client - Logic not implemented yet');
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
                            onClick={handleDeleteClient}
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
            </Box>
        </Fade>
    );
};

export default ClientDetailPage;
