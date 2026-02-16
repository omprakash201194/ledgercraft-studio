import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    TableSortLabel,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    Fade,
    CircularProgress,
    Breadcrumbs,
    Link,
    TablePagination,
    useTheme,
    alpha,

    TextField,
    InputAdornment,
    IconButton,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@mui/material';
import {
    Description as ReportIcon,
    OpenInNew as OpenIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Clear as ClearIcon
} from '@mui/icons-material';
import { useAuth } from '../components/AuthContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';

interface ReportRecord {
    id: string;
    form_id: string;
    generated_by: string;
    file_path: string;
    generated_at: string;
    form_name: string;
    generated_by_username: string;
}

const ReportsPage: React.FC = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const formIdFilter = queryParams.get('formId');

    const [reports, setReports] = useState<ReportRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalReports, setTotalReports] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(0); // Reset to first page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);



    // Sorting
    const [sortBy, setSortBy] = useState<string>('generated_at');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

    // Delete Dialog
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean, type: 'single' | 'bulk', id?: string }>({ open: false, type: 'single' });

    // Load Data
    const loadReports = useCallback(async () => {
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            if (user) {
                const prefs = await window.api.getUserPreferences(user.id);
                if (prefs?.date_format) setDateFormat(prefs.date_format);
            }
            const result = await window.api.getReports(page + 1, rowsPerPage, formIdFilter || undefined, debouncedSearch || undefined, sortBy, sortOrder);
            setReports(result.reports);
            setTotalReports(result.total);
            // Clear selection on page change/reload if desired, or keep it?
            // Usually simpler to clear or strict to only current page items.
            // For now, let's keep it simple and clear it to avoid deleting invisible items.
            setSelectedIds([]);
        } catch (err: unknown) {
            console.error("Failed to load reports:", err);
            setError('Failed to load reports.');
        } finally {
            setLoading(false);
        }
    }, [user, page, rowsPerPage, formIdFilter, debouncedSearch, sortBy, sortOrder]);

    useEffect(() => {
        setPage(0);
        setSelectedIds([]);
    }, [formIdFilter]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = reports.map((n) => n.id);
            setSelectedIds(newSelected);
            return;
        }
        setSelectedIds([]);
    };

    const handleSelectOne = (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
        const selectedIndex = selectedIds.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedIds, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedIds.slice(1));
        } else if (selectedIndex === selectedIds.length - 1) {
            newSelected = newSelected.concat(selectedIds.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selectedIds.slice(0, selectedIndex),
                selectedIds.slice(selectedIndex + 1),
            );
        }
        setSelectedIds(newSelected);
    };


    // ... (keep existing selection handlers) ...

    const handleDeleteClick = (reportId: string) => {
        setDeleteDialog({ open: true, type: 'single', id: reportId });
    };

    const handleBulkDeleteClick = () => {
        if (selectedIds.length === 0) return;
        setDeleteDialog({ open: true, type: 'bulk' });
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialog((prev) => ({ ...prev, open: false }));
    };

    const handleConfirmDelete = async () => {
        handleCloseDeleteDialog();

        if (deleteDialog.type === 'single' && deleteDialog.id) {
            try {
                const result = await window.api.deleteReport(deleteDialog.id);
                if (result.success) {
                    loadReports();
                } else {
                    alert(result.error);
                }
            } catch (err) {
                console.error(err);
                alert('Failed to delete report');
            }
        } else if (deleteDialog.type === 'bulk') {
            try {
                const result = await window.api.deleteReports(selectedIds);
                if (result.success) {
                    loadReports();
                    setSelectedIds([]);
                } else {
                    alert(result.error || 'Failed to delete some reports');
                    loadReports();
                }
            } catch (err) {
                console.error(err);
                alert('Failed to delete reports');
            }
        }
    };

    const handleOpenFile = async (filePath: string) => {
        await window.api.openFile(filePath);
    };

    const handleDownload = async (filePath: string) => {
        try {
            await window.api.downloadReport(filePath);
        } catch {
            // ignore error
        }
    };

    const handleSort = (property: string) => {
        const isAsc = sortBy === property && sortOrder === 'ASC';
        setSortOrder(isAsc ? 'DESC' : 'ASC');
        setSortBy(property);
        setPage(0); // Reset to first page
    };

    /** Extract just the filename from a full path. */
    const getFileName = (filePath: string): string => {
        return filePath.split(/[\\/]/).pop() || 'report.docx';
    };

    return (
        <Fade in timeout={500}>
            <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
                {/* Header */}
                {/* Header & Search */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h5">Generated Reports</Typography>
                            {selectedIds.length > 0 && (
                                <Fade in>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        size="small"
                                        startIcon={<DeleteIcon />}
                                        onClick={handleBulkDeleteClick}
                                    >
                                        Delete Selected ({selectedIds.length})
                                    </Button>
                                </Fade>
                            )}
                        </Box>
                        <TextField
                            size="small"
                            placeholder="Search reports..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ width: 300 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Box>

                    {formIdFilter && (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 1,
                                px: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                borderColor: alpha(theme.palette.primary.main, 0.2)
                            }}
                        >
                            <Typography variant="body2" color="primary">
                                <strong>Filter Active:</strong> Showing reports for a specific form.
                            </Typography>
                            <Button size="small" variant="text" onClick={() => navigate('/reports')}>
                                Clear Filter
                            </Button>
                        </Paper>
                    )}
                </Box>

                {/* Reports Table */}
                <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider} `, overflow: 'hidden' }}>
                    {loading ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : (
                        <>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    color="primary"
                                                    indeterminate={selectedIds.length > 0 && selectedIds.length < reports.length}
                                                    checked={reports.length > 0 && selectedIds.length === reports.length}
                                                    onChange={handleSelectAll}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Report (File)</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Form</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Generated By</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                                <TableSortLabel
                                                    active={sortBy === 'generated_at'}
                                                    direction={sortBy === 'generated_at' ? (sortOrder === 'ASC' ? 'asc' : 'desc') : 'asc'}
                                                    onClick={() => handleSort('generated_at')}
                                                >
                                                    Date
                                                </TableSortLabel>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {reports.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                                                    <Typography variant="subtitle1" color="text.secondary">
                                                        No reports yet
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ color: 'text.disabled', mt: 0.5 }}
                                                    >
                                                        Generate a report from the Generate Report page
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            reports.map((report) => {
                                                const isSelected = selectedIds.indexOf(report.id) !== -1;
                                                return (
                                                    <TableRow key={report.id} hover selected={isSelected}>
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                color="primary"
                                                                checked={isSelected}
                                                                onChange={(event) => handleSelectOne(event, report.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                icon={<ReportIcon />}
                                                                label={getFileName(report.file_path)}
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={() => handleOpenFile(report.file_path)}
                                                                sx={{
                                                                    borderColor: alpha(theme.palette.primary.main, 0.4),
                                                                    color: theme.palette.text.primary,
                                                                    cursor: 'pointer'
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link
                                                                component="button"
                                                                variant="body2"
                                                                onClick={() => navigate(`/ generate - report ? formId = ${report.form_id}& reportId=${report.id} `)}
                                                                sx={{ fontWeight: 'bold', textDecoration: 'none' }}
                                                            >
                                                                {report.form_name}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>{report.generated_by_username}</TableCell>
                                                        <TableCell>{formatDateTime(report.generated_at, dateFormat)}</TableCell>
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
                                                                sx={{ mr: 1 }}
                                                            >
                                                                Download
                                                            </Button>
                                                            {(user?.role === 'ADMIN' || user?.id === report.generated_by) && (
                                                                <Button
                                                                    size="small"
                                                                    color="error"
                                                                    startIcon={<DeleteIcon />}
                                                                    onClick={() => handleDeleteClick(report.id)}
                                                                >
                                                                    Delete
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={totalReports}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                            />
                        </>
                    )}
                </Paper>

                {/* Confirm Delete Dialog */}
                <Dialog
                    open={deleteDialog.open}
                    onClose={handleCloseDeleteDialog}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {deleteDialog.type === 'bulk'
                            ? `Delete ${selectedIds.length} Reports ? `
                            : 'Delete Report?'}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            {deleteDialog.type === 'bulk'
                                ? `Are you sure you want to delete ${selectedIds.length} reports ? This action cannot be undone.`
                                : 'Are you sure you want to delete this report? This action cannot be undone.'}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade>
    );
};

export default ReportsPage;
