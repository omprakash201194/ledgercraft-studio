import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Breadcrumbs,
    Link,
    Alert,
    CircularProgress,
    Chip,
    DialogContentText,
    TablePagination,
    Grid,
    Fade
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';

import FormWizard from '../components/FormWizard';
import CategoryTree from '../components/CategoryTree';
import DeleteFormDialog from '../components/DeleteFormDialog';

export default function FormsPage() {
    const [forms, setForms] = useState<FormRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalForms, setTotalForms] = useState(0);

    // Filters & Breadcrumbs
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | undefined>(undefined);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string, name: string }[]>([]);
    const [treeRefreshTrigger, setTreeRefreshTrigger] = useState(0);

    // Wizard
    const [wizardOpen, setWizardOpen] = useState(false);
    const [editFormId, setEditFormId] = useState<string | null>(null);

    // Delete Dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<FormRecord | null>(null);
    const [deleteReportCount, setDeleteReportCount] = useState<number | null>(null);

    // View Fields
    const [viewingForm, setViewingForm] = useState<FormRecord | null>(null);
    const [formFields, setFormFields] = useState<FormFieldRecord[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);

    // Menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTarget, setMenuTarget] = useState<FormRecord | null>(null);

    // Load Data
    const loadForms = useCallback(async () => {
        setLoading(true);
        try {
            const result = await window.api.getForms(page + 1, rowsPerPage, selectedCategoryId);
            setForms(result.forms);
            setTotalForms(result.total);
            setLoading(false);
        } catch (err: unknown) {
            setError('Failed to load forms.');
            setLoading(false);
        }
    }, [page, rowsPerPage, selectedCategoryId]);

    // Load breadcrumbs
    useEffect(() => {
        if (selectedCategoryId === undefined || selectedCategoryId === null) {
            setBreadcrumbs([]);
            return;
        }
        window.api.getCategoryChain(selectedCategoryId)
            .then(setBreadcrumbs)
            .catch(() => setBreadcrumbs([]));
    }, [selectedCategoryId]);

    // Move Dialog
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [moveTargetCategoryId, setMoveTargetCategoryId] = useState<string | null>(null);
    const [itemToMove, setItemToMove] = useState<FormRecord | null>(null);

    useEffect(() => {
        loadForms();
    }, [loadForms]);

    // Handlers
    const handleCreate = () => {
        setEditFormId(null);
        setWizardOpen(true);
    };

    const handleEdit = () => {
        if (!menuTarget) return;
        setEditFormId(menuTarget.id);
        setWizardOpen(true);
        handleMenuClose();
    };

    const handleWizardSuccess = () => {
        setWizardOpen(false);
        setSuccess(editFormId ? 'Form updated successfully' : 'Form created successfully');
        loadForms();
    };

    const handleViewFields = async (form: FormRecord) => {
        setViewingForm(form);
        setLoadingFields(true);
        try {
            const result = await window.api.getFormFields(form.id);
            setFormFields(result);
        } catch {
            setFormFields([]);
        } finally {
            setLoadingFields(false);
        }
    };

    const handleMenuOpen = (event: React.MouseEvent, form: FormRecord) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget as HTMLElement);
        setMenuTarget(form);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuTarget(null);
    };

    const handleMoveStart = () => {
        if (!menuTarget) return;
        setItemToMove(menuTarget);
        setMoveTargetCategoryId(null);
        setMoveDialogOpen(true);
        handleMenuClose();
    };

    const submitMove = async () => {
        if (!itemToMove) return;
        const result = await window.api.moveItem({
            itemId: itemToMove.id,
            targetCategoryId: moveTargetCategoryId,
            type: 'FORM',
        });
        if (result.success) {
            setMoveDialogOpen(false);
            loadForms();
            setTreeRefreshTrigger(prev => prev + 1);
        } else {
            alert(result.error);
        }
    };

    const handleDeleteClick = async () => {
        if (!menuTarget) return;
        setItemToDelete(menuTarget);
        handleMenuClose();

        // Fetch report count
        try {
            const count = await window.api.getFormReportCount(menuTarget.id);
            setDeleteReportCount(count);
            setDeleteDialogOpen(true);
        } catch (e) {
            console.error(e);
            alert('Failed to check reports for this form');
        }
    };

    const confirmDelete = async (deleteReports: boolean) => {
        if (!itemToDelete) return;

        const result = await window.api.deleteForm(itemToDelete.id, deleteReports);
        if (result.success) {
            setSuccess(deleteReports ? 'Form and reports deleted successfully' : 'Form archived successfully');
            loadForms();
            // Also refresh tree in case we support form counts in tree later
            setTreeRefreshTrigger(prev => prev + 1);
        } else {
            setError(result.error || 'Failed to delete form');
        }
        setDeleteDialogOpen(false);
        setItemToDelete(null);
    }

    const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');
    const { user } = window.api ? { user: { id: 'dummy' } } : { user: null }; // Mock or useAuth if available

    useEffect(() => {
        // Fetch date format preference if needed or use default
        // window.api.getUserPreferences...
    }, []);

    return (
        <Fade in timeout={500}>
            <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5">Forms</Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleCreate}
                    >
                        Create Form
                    </Button>
                </Box>

                {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

                <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
                    {/* Left Panel: Category Tree */}
                    <Grid item xs={12} md={3} sx={{ height: '100%' }}>
                        <CategoryTree
                            type="FORM"
                            onSelectCategory={(id) => setSelectedCategoryId(id === null ? undefined : id)}
                            refreshTrigger={treeRefreshTrigger}
                            selectedCategoryId={selectedCategoryId ?? null}
                        />
                    </Grid>

                    {/* Right Panel: Content */}
                    <Grid item xs={12} md={9} sx={{ height: '100%', overflow: 'hidden' }}>
                        <Paper
                            elevation={0}
                            sx={{
                                height: '100%',
                                border: '1px solid #e0e0e0', // theme.palette.divider hardcoded or use theme
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Breadcrumbs */}
                            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f5f5f5' }}> {/* match theme.palette.action.hover if possible */}
                                <Breadcrumbs aria-label="breadcrumb">
                                    <Link
                                        color="inherit"
                                        underline="hover"
                                        onClick={() => setSelectedCategoryId(null)}
                                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        <Typography variant="body2">All Forms</Typography>
                                    </Link>
                                    {breadcrumbs.map((crumb, index) => (
                                        <Typography key={crumb.id} color={index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'} variant="body2">
                                            {crumb.name}
                                        </Typography>
                                    ))}
                                </Breadcrumbs>
                            </Box>

                            <TableContainer sx={{ flexGrow: 1 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Template</TableCell>
                                            <TableCell>Fields</TableCell>
                                            <TableCell>Created At</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                                    <CircularProgress />
                                                </TableCell>
                                            </TableRow>
                                        ) : forms.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                                    <Typography color="textSecondary">
                                                        No forms found in this category.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            forms.map((form) => (
                                                <TableRow key={form.id} hover onClick={() => handleViewFields(form)} sx={{ cursor: 'pointer' }}>
                                                    <TableCell>
                                                        <Box display="flex" alignItems="center">
                                                            <DescriptionIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
                                                            <Typography variant="body2">
                                                                {form.name}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>{form.template_name}</TableCell>
                                                    <TableCell>
                                                        <Chip label={form.field_count} size="small" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(form.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, form)}>
                                                            <MoreVertIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <TablePagination
                                component="div"
                                count={totalForms}
                                page={page}
                                onPageChange={(e, newPage) => setPage(newPage)}
                                rowsPerPage={rowsPerPage}
                                onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                            />
                        </Paper>
                    </Grid>
                </Grid>

                {/* Dialogs and Menus */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                >
                    <MenuItem onClick={handleEdit}>
                        <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                    <MenuItem onClick={handleMoveStart}>
                        <DriveFileMoveIcon fontSize="small" sx={{ mr: 1 }} /> Move
                    </MenuItem>
                    <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                </Menu>

                <FormWizard
                    open={wizardOpen}
                    onClose={() => setWizardOpen(false)}
                    onSuccess={handleWizardSuccess}
                    editFormId={editFormId}
                />

                <Dialog open={!!viewingForm} onClose={() => setViewingForm(null)} maxWidth="md" fullWidth>
                    <DialogTitle>
                        Fields in "{viewingForm?.name}"
                    </DialogTitle>
                    <DialogContent dividers>
                        {loadingFields ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Label</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Required</TableCell>
                                        <TableCell>Placeholder</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {formFields.map((field) => (
                                        <TableRow key={field.id}>
                                            <TableCell>{field.label}</TableCell>
                                            <TableCell>{field.data_type}</TableCell>
                                            <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
                                            <TableCell>{field.placeholder_mapping || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setViewingForm(null)}>Close</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)}>
                    <DialogTitle>Move Form</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Select the new category for "{itemToMove?.name}".
                        </DialogContentText>
                        <Box mt={2} sx={{ minWidth: 300, border: '1px solid #ddd' }}>
                            <CategoryTree
                                type="FORM"
                                onSelectCategory={setMoveTargetCategoryId}
                                selectedCategoryId={moveTargetCategoryId}
                                refreshTrigger={treeRefreshTrigger}
                            />
                        </Box>
                        <Box mt={1}>
                            <Typography variant="caption" color="textSecondary">
                                Selected: {moveTargetCategoryId === null ? 'Uncategorized (Root)' : 'Category ID: ' + moveTargetCategoryId}
                            </Typography>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={submitMove} variant="contained" color="primary">
                            Move
                        </Button>
                    </DialogActions>
                </Dialog>

                {itemToDelete && (
                    <DeleteFormDialog
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                        onConfirm={confirmDelete}
                        reportCount={deleteReportCount}
                        formName={itemToDelete.name}
                        formId={itemToDelete.id}
                    />
                )}
            </Box>
        </Fade>
    );
}
