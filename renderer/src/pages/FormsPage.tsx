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
    Fade,
    Switch,
    FormControlLabel
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
    const [showArchived, setShowArchived] = useState(false);

    // Dialog & Menu State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [editFormId, setEditFormId] = useState<string | null>(null);
    const [viewingForm, setViewingForm] = useState<FormRecord | null>(null);
    const [loadingFields, setLoadingFields] = useState(false);
    const [formFields, setFormFields] = useState<any[]>([]);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTarget, setMenuTarget] = useState<FormRecord | null>(null);
    const [itemToDelete, setItemToDelete] = useState<FormRecord | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteReportCount, setDeleteReportCount] = useState(0);

    // Move Dialog
    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [moveTargetCategoryId, setMoveTargetCategoryId] = useState<string | null>(null);
    const [itemToMove, setItemToMove] = useState<FormRecord | null>(null);

    // Date preferences
    const [dateFormat] = useState('DD-MM-YYYY');

    // Load Data
    const loadForms = useCallback(async () => {
        setLoading(true);
        try {
            const result = await window.api.getForms(page + 1, rowsPerPage, selectedCategoryId, showArchived);
            setForms(result.forms);
            setTotalForms(result.total);
            setLoading(false);
        } catch (err: unknown) {
            setError('Failed to load forms.');
            setLoading(false);
        }
    }, [page, rowsPerPage, selectedCategoryId, showArchived]);

    // Initial load
    useEffect(() => {
        loadForms();
    }, [loadForms]);

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

    return (
        <Fade in timeout={500}>
            <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5">Forms</Typography>
                    <Box display="flex" gap={2}>
                        <FormControlLabel
                            control={<Switch checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
                            label="Show Archived"
                        />
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleCreate}
                        >
                            Create Form
                        </Button>
                    </Box>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

                <Grid container spacing={2} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <Grid item xs={12} md={3} sx={{ height: '100%', overflow: 'auto', borderRight: '1px solid rgba(0,0,0,0.12)' }}>
                        <CategoryTree
                            type="FORM"
                            onSelectCategory={setSelectedCategoryId}
                            selectedCategoryId={selectedCategoryId}
                            refreshTrigger={treeRefreshTrigger}
                        />
                    </Grid>

                    <Grid item xs={12} md={9} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Paper sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <Box p={2}>
                                <Breadcrumbs aria-label="breadcrumb">
                                    <Link
                                        color="inherit"
                                        component="button"
                                        variant="body2"
                                        onClick={() => setSelectedCategoryId(undefined)}
                                    >
                                        All Forms
                                    </Link>
                                    {breadcrumbs.map((crumb) => (
                                        <Typography key={crumb.id} color="text.primary" variant="body2">
                                            {crumb.name}
                                        </Typography>
                                    ))}
                                </Breadcrumbs>
                            </Box>

                            <TableContainer sx={{ flexGrow: 1 }}>
                                <Table stickyHeader aria-label="forms table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Form Name</TableCell>
                                            <TableCell>Template</TableCell>
                                            <TableCell>Fields</TableCell>
                                            <TableCell>Created Date</TableCell>
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
                                                <TableRow key={form.id} hover onClick={() => handleViewFields(form)} sx={{ cursor: 'pointer', opacity: (form as any).is_deleted ? 0.6 : 1 }}>
                                                    <TableCell>
                                                        <Box display="flex" alignItems="center">
                                                            <DescriptionIcon color={(form as any).is_deleted ? 'disabled' : 'primary'} sx={{ mr: 1, fontSize: 20 }} />
                                                            <Typography variant="body2" sx={{ textDecoration: (form as any).is_deleted ? 'line-through' : 'none' }}>
                                                                {form.name}
                                                            </Typography>
                                                            {(form as any).is_deleted === 1 && <Chip label="Archived" size="small" sx={{ ml: 1, height: 20 }} />}
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
