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
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');

    // Category State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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
        if (!selectedCategoryId) {
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
        try {
            const result = await window.api.getTemplates();
            setTemplates(result);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            window.api.getUserPreferences(user.id).then(prefs => {
                if (prefs?.date_format) setDateFormat(prefs.date_format);
            });
        }
        loadTemplates();
    }, [loadTemplates, user]);

    // Filter templates when selection changes
    useEffect(() => {
        if (selectedCategoryId === null) {
            setFilteredTemplates(templates);
        } else {
            setFilteredTemplates(templates.filter((t) => t.category_id === selectedCategoryId));
        }
    }, [templates, selectedCategoryId]);

    const handleUpload = async () => {
        setError('');
        setSuccess('');
        setUploading(true);

        try {
            const result = await window.api.uploadTemplate();
            if (result.success && result.template) {
                setSuccess(
                    `Template "${result.template.name}" uploaded. Please refresh to see changes or move it.`
                );
                // If we uploaded, refresh everything
                loadTemplates();
                // Optionally move to current category if selected?
                if (selectedCategoryId && result.template) {
                    await window.api.moveItem({
                        itemId: result.template.id,
                        targetCategoryId: selectedCategoryId,
                        type: 'TEMPLATE',
                    });
                    loadTemplates();
                }
            } else if (result.error && result.error !== 'No file selected') {
                setError(result.error);
            }
        } catch {
            setError('Failed to upload template');
        } finally {
            setUploading(false);
        }
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

    const handleDelete = async () => {
        if (!menuTarget) return;
        if (!confirm(`Are you sure you want to delete template "${menuTarget.name}"? This action cannot be undone.`)) {
            handleMenuClose();
            return;
        }

        const result = await window.api.deleteTemplate(menuTarget.id);
        if (result.success) {
            loadTemplates();
            setSuccess(`Template "${menuTarget.name}" deleted`);
        } else {
            setError(result.error || 'Failed to delete template');
        }
        handleMenuClose();
    };


    return (
        <Fade in timeout={500}>
            <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5">Templates</Typography>
                    <Button
                        variant="contained"
                        startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
                        onClick={handleUpload}
                        disabled={uploading}
                    >
                        {uploading ? 'Uploading...' : 'Upload Template'}
                    </Button>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

                <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
                    {/* Left Panel: Category Tree */}
                    <Grid item xs={12} md={3} sx={{ height: '100%' }}>
                        <CategoryTree
                            type="TEMPLATE"
                            selectedCategoryId={selectedCategoryId}
                            onSelectCategory={setSelectedCategoryId}
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
                                            setSelectedCategoryId(null);
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
                        </Paper>
                    </Grid>
                </Grid>

                {/* Placeholders Dialog */}
                <Dialog open={!!selectedTemplate && !loadingPlaceholders && !anchorEl && !moveDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                    {/* Reuse existing dialog content... simplifying for this edit */}
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
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
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
            </Box>
        </Fade>
    );
};

export default TemplatesPage;
