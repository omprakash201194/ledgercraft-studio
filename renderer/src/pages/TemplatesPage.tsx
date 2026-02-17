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
    Chip,
    Fade,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
    alpha,
    IconButton,
    Grid,
    Menu,
    MenuItem,
    Tooltip,
    Breadcrumbs,
    Link,
    TablePagination,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Description as DocIcon,
    Code as PlaceholderIcon,
    Close as CloseIcon,
    MoreVert as MoreIcon,
    DriveFileMove as MoveIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../components/AuthContext';
import { formatDate } from '../utils/dateUtils';
import CategoryTree from '../components/CategoryTree';

interface TemplateRecord {
    id: string;
    name: string;
    file_path: string;
    created_at: string;
    placeholder_count: number;
    category_id?: string | null;
}

interface TemplatePlaceholder {
    id: string;
    template_id: string;
    placeholder_key: string;
}

const TemplatesPage: React.FC = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const [templates, setTemplates] = useState<TemplateRecord[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<TemplateRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [autoCreateForm, setAutoCreateForm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalTemplates, setTotalTemplates] = useState(0);

    // Category State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | undefined>(undefined);
    const [treeRefreshTrigger, setTreeRefreshTrigger] = useState(0);

    // Placeholder dialog
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecord | null>(null);
    const [placeholders, setPlaceholders] = useState<TemplatePlaceholder[]>([]);
    const [loadingPlaceholders, setLoadingPlaceholders] = useState(false);

    // Context Menu (Move/Delete)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTarget, setMenuTarget] = useState<TemplateRecord | null>(null);

    // Breadcrumbs
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

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
    const [itemToMove, setItemToMove] = useState<TemplateRecord | null>(null);

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const result = await window.api.getTemplates(page + 1, rowsPerPage, selectedCategoryId);
            setTemplates(result.templates);
            setTotalTemplates(result.total);
            setFilteredTemplates(result.templates); // The result IS filtered by backend
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, selectedCategoryId]);

    useEffect(() => {
        if (user) {
            window.api.getUserPreferences(user.id).then(prefs => {
                if (prefs?.date_format) setDateFormat(prefs.date_format);
            });
        }
        loadTemplates();
    }, [loadTemplates, user]);

    // Reset page when category changes
    useEffect(() => {
        setPage(0);
    }, [selectedCategoryId]);

    // Filter templates when selection changes - NO LONGER NEEDED CLIENT SIDE
    // But we need to update filteredTemplates state to render
    /*
    useEffect(() => {
        if (selectedCategoryId === null) {
            setFilteredTemplates(templates);
        } else {
            setFilteredTemplates(templates.filter((t) => t.category_id === selectedCategoryId));
        }
    }, [templates, selectedCategoryId]);
    */

    // Upload Dialog State
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [analyzedTemplate, setAnalyzedTemplate] = useState<AnalyzeTemplateResult | null>(null);

    const handleUploadClick = async () => {
        setError('');
        setSuccess('');

        try {
            const result = await window.api.pickTemplate();
            if (result.canceled) return;

            if (result.error) {
                setError(result.error);
                return;
            }

            setAnalyzedTemplate(result);
            setUploadDialogOpen(true);
            // Default auto-create to false when opening dialog
            setAutoCreateForm(false);
        } catch (err) {
            console.error(err);
            setError('Failed to analyze template');
        }
    };

    const handleConfirmUpload = async () => {
        if (!analyzedTemplate?.filePath) return;

        setUploadDialogOpen(false);
        setUploading(true);
        setError('');
        setSuccess('');

        try {
            const result = await window.api.processTemplateUpload(analyzedTemplate.filePath, autoCreateForm, selectedCategoryId);
            if (result.success && result.template) {
                setSuccess(
                    autoCreateForm
                        ? 'Template uploaded and form auto-created successfully.'
                        : 'Template uploaded successfully.'
                );
                loadTemplates();
                // Optionally move to current category if selected - NOW HANDLED BY BACKEND
                /*
                if (selectedCategoryId && result.template) {
                     await window.api.moveItem({
                        itemId: result.template.id,
                        targetCategoryId: selectedCategoryId,
                        type: 'TEMPLATE',
                    });
                    loadTemplates();
                }
                */
            } else {
                setError(result.error || 'Upload failed');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to upload template');
        } finally {
            setUploading(false);
            setAnalyzedTemplate(null);
        }
    };

    const handleCloseUploadDialog = () => {
        setUploadDialogOpen(false);
        setAnalyzedTemplate(null);
    };

    const handleViewPlaceholders = async (template: TemplateRecord) => {
        setSelectedTemplate(template);
        setLoadingPlaceholders(true);

        try {
            const result = await window.api.getTemplatePlaceholders(template.id);
            setPlaceholders(result);
        } catch {
            setPlaceholders([]);
        } finally {
            setLoadingPlaceholders(false);
        }
    };

    const handleCloseDialog = () => {
        setSelectedTemplate(null);
        setPlaceholders([]);
    };

    // ─── Menu Handlers ───────────────────────────────────

    const handleMenuOpen = (event: React.MouseEvent, template: TemplateRecord) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget as HTMLElement);
        setMenuTarget(template);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuTarget(null);
    };

    const handleMoveStart = () => {
        if (!menuTarget) return;
        setItemToMove(menuTarget);
        setMoveTargetCategoryId(null); // Default to root
        setMoveDialogOpen(true);
        handleMenuClose();
    };

    const submitMove = async () => {
        if (!itemToMove) return;

        const result = await window.api.moveItem({
            itemId: itemToMove.id,
            targetCategoryId: moveTargetCategoryId,
            type: 'TEMPLATE',
        });

        if (result.success) {
            setMoveDialogOpen(false);
            loadTemplates();
            setTreeRefreshTrigger(prev => prev + 1);
        } else {
            alert(result.error); // Simple alert for now
        }
    };

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [cascadeDeleteDialogOpen, setCascadeDeleteDialogOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<TemplateRecord | null>(null);
    const [usageCount, setUsageCount] = useState<number>(0);

    const handleDeleteClick = () => {
        if (!menuTarget) return;
        setTemplateToDelete(menuTarget);
        setDeleteDialogOpen(true);
        handleMenuClose();
    };

    const handleConfirmDelete = async () => {
        if (!templateToDelete) return;

        try {
            const result = await window.api.deleteTemplate(templateToDelete.id, false);
            if (result.success) {
                loadTemplates();
                setSuccess(`Template "${templateToDelete.name}" deleted`);
                setDeleteDialogOpen(false);
                setTemplateToDelete(null);
            } else if (result.error === 'TEMPLATE_USED' && result.usageCount) {
                setUsageCount(result.usageCount);
                setDeleteDialogOpen(false);
                setCascadeDeleteDialogOpen(true);
            } else {
                setError(result.error || 'Failed to delete template');
                setDeleteDialogOpen(false);
                setTemplateToDelete(null);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to delete template');
            setDeleteDialogOpen(false);
            setTemplateToDelete(null);
        }
    };

    const handleConfirmCascadeDelete = async () => {
        if (!templateToDelete) return;

        try {
            const result = await window.api.deleteTemplate(templateToDelete.id, true);
            if (result.success) {
                loadTemplates();
                setSuccess(`Template "${templateToDelete.name}" and ${usageCount} associated forms deleted`);
            } else {
                setError(result.error || 'Failed to delete template');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to force delete template');
        } finally {
            setCascadeDeleteDialogOpen(false);
            setTemplateToDelete(null);
            setUsageCount(0);
        }
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setTemplateToDelete(null);
    };

    const handleCloseCascadeDeleteDialog = () => {
        setCascadeDeleteDialogOpen(false);
        setTemplateToDelete(null);
        setUsageCount(0);
    };

    return (
        <Fade in timeout={500}>
            <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5">Templates</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Inline checkbox removed */}
                        <Button
                            variant="contained"
                            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
                            onClick={handleUploadClick}
                            disabled={uploading}
                        >
                            {uploading ? 'Uploading...' : 'Upload Template'}
                        </Button>
                    </Box>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

                <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
                    {/* ... (Grid items same as before) ... */}
                    {/* Left Panel: Category Tree */}
                    <Grid item xs={12} md={3} sx={{ height: '100%' }}>
                        <CategoryTree
                            type="TEMPLATE"
                            selectedCategoryId={selectedCategoryId ?? null}
                            onSelectCategory={(id) => setSelectedCategoryId(id === null ? undefined : id)}
                            refreshTrigger={treeRefreshTrigger}
                        />
                    </Grid>

                    {/* Right Panel: Content */}
                    <Grid item xs={12} md={9} sx={{ height: '100%', overflow: 'hidden' }}>
                        <Paper
                            elevation={0}
                            sx={{
                                height: '100%',
                                border: `1px solid ${theme.palette.divider}`,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Breadcrumbs */}
                            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, backgroundColor: theme.palette.action.hover }}>
                                <Breadcrumbs aria-label="breadcrumb">
                                    <Link
                                        underline="hover"
                                        color="inherit"
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedCategoryId(undefined);
                                        }}
                                        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <Typography variant="body2">All Templates</Typography>
                                    </Link>
                                    {breadcrumbs.map((crumb, index) => {
                                        const isLast = index === breadcrumbs.length - 1;
                                        return isLast ? (
                                            <Typography key={crumb.id} color="text.primary" variant="body2" sx={{ fontWeight: 600 }}>
                                                {crumb.name}
                                            </Typography>
                                        ) : (
                                            <Link
                                                key={crumb.id}
                                                underline="hover"
                                                color="inherit"
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSelectedCategoryId(crumb.id);
                                                }}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <Typography variant="body2">{crumb.name}</Typography>
                                            </Link>
                                        );
                                    })}
                                </Breadcrumbs>
                            </Box>

                            <TableContainer sx={{ flexGrow: 1 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Placeholders</TableCell>
                                            <TableCell>Created</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredTemplates.map((template) => (
                                            <TableRow key={template.id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <DocIcon color="primary" fontSize="small" />
                                                        <Typography variant="body2">{template.name}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={template.placeholder_count}
                                                        size="small"
                                                        color={template.placeholder_count > 0 ? 'success' : 'warning'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(template.created_at, dateFormat)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        size="small"
                                                        onClick={() => handleViewPlaceholders(template)}
                                                    >
                                                        Details
                                                    </Button>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleMenuOpen(e, template)}
                                                    >
                                                        <MoreIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredTemplates.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                    No templates in this category.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={totalTemplates}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={(event, newPage) => setPage(newPage)}
                                onRowsPerPageChange={(event) => {
                                    setRowsPerPage(parseInt(event.target.value, 10));
                                    setPage(0);
                                }}
                            />
                        </Paper>
                    </Grid>
                </Grid>

                {/* Upload Confirmation Dialog */}
                <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>Confirm Upload</DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">File Name</Typography>
                            <Typography variant="body1">{analyzedTemplate?.originalName}</Typography>
                        </Box>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Placeholders Found</Typography>
                            <Chip
                                label={analyzedTemplate?.placeholderCount || 0}
                                size="small"
                                color={(analyzedTemplate?.placeholderCount || 0) > 0 ? 'success' : 'warning'}
                                sx={{ mt: 0.5 }}
                            />
                        </Box>
                        {analyzedTemplate?.placeholders && analyzedTemplate.placeholders.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                    Detected Placeholders:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {analyzedTemplate.placeholders.slice(0, 10).map((p) => (
                                        <Chip key={p} label={p} size="small" variant="outlined" style={{ fontSize: '0.7rem' }} />
                                    ))}
                                    {analyzedTemplate.placeholders.length > 10 && (
                                        <Chip label={`+${analyzedTemplate.placeholders.length - 10} more`} size="small" variant="outlined" style={{ fontSize: '0.7rem' }} />
                                    )}
                                </Box>
                            </Box>
                        )}

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={autoCreateForm}
                                    onChange={(e) => setAutoCreateForm(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body2">Auto-create form from this template</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Generates a corresponding form with fields for each placeholder.
                                    </Typography>
                                </Box>
                            }
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseUploadDialog}>Cancel</Button>
                        <Button onClick={handleConfirmUpload} variant="contained" disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Confirm & Upload'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Placeholders Dialog */}
                <Dialog open={!!selectedTemplate && !loadingPlaceholders && !anchorEl && !moveDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>{selectedTemplate?.name} Placeholders</DialogTitle>
                    <DialogContent dividers>
                        <List dense>
                            {placeholders.map(p => (
                                <ListItem key={p.id}>
                                    <ListItemIcon><PlaceholderIcon /></ListItemIcon>
                                    <ListItemText primary={`{{${p.placeholder_key}}}`} />
                                </ListItem>
                            ))}
                        </List>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Context Menu */}
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                    <MenuItem onClick={handleMoveStart}>
                        <ListItemIcon><MoveIcon fontSize="small" /></ListItemIcon>
                        Move
                    </MenuItem>
                    <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                        <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                        Delete
                    </MenuItem>
                </Menu>

                {/* Move Dialog */}
                <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Move Template</DialogTitle>
                    <DialogContent sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" sx={{ mb: 1 }}>Select destination category:</Typography>
                        <Box sx={{ flexGrow: 1, border: '1px solid #ddd' }}>
                            <CategoryTree
                                type="TEMPLATE"
                                selectedCategoryId={moveTargetCategoryId}
                                onSelectCategory={setMoveTargetCategoryId}
                                refreshTrigger={treeRefreshTrigger}
                                readOnly
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
                        <Button variant="contained" onClick={submitMove}>Move</Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={deleteDialogOpen}
                    onClose={handleCloseDeleteDialog}
                    aria-labelledby="delete-dialog-title"
                    aria-describedby="delete-dialog-description"
                >
                    <DialogTitle id="delete-dialog-title">
                        Delete Template?
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="delete-dialog-description">
                            Are you sure you want to delete template "{templateToDelete?.name}"? This action cannot be undone.
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

                {/* Cascade Delete Dialog */}
                <Dialog
                    open={cascadeDeleteDialogOpen}
                    onClose={handleCloseCascadeDeleteDialog}
                    aria-labelledby="cascade-delete-dialog-title"
                    aria-describedby="cascade-delete-dialog-description"
                >
                    <DialogTitle id="cascade-delete-dialog-title">
                        Template is in use
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="cascade-delete-dialog-description">
                            This template is used by <strong>{usageCount}</strong> forms (including archived ones).
                            <br /><br />
                            Deleting this template will also <strong>permanently delete all associated forms and their reports.</strong>
                            <br /><br />
                            Are you sure you want to proceed?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseCascadeDeleteDialog} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmCascadeDelete} color="error" variant="contained" autoFocus>
                            Delete Everything
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Fade>
    );
};

export default TemplatesPage;
