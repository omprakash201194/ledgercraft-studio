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
    useTheme,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Grid,
    Menu,
    MenuItem,
    Divider,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    DynamicForm as FormIcon,
    TextFields as FieldIcon,
    MoreVert as MoreIcon,
    DriveFileMove as MoveIcon,
    Edit as EditIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import CategoryTree from '../components/CategoryTree';
import FormWizard from '../components/FormWizard';

const FormsPage: React.FC = () => {
    const theme = useTheme();

    // ─── List View State ─────────────────────────────────
    const [forms, setForms] = useState<FormRecord[]>([]);
    const [filteredForms, setFilteredForms] = useState<FormRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Category State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [treeRefreshTrigger, setTreeRefreshTrigger] = useState(0);

    // ─── Wizard State ────────────────────────────────────
    const [wizardOpen, setWizardOpen] = useState(false);
    const [editFormId, setEditFormId] = useState<string | null>(null);

    // ─── Dialogs & Menus ─────────────────────────────────
    const [viewingForm, setViewingForm] = useState<FormRecord | null>(null);
    const [formFields, setFormFields] = useState<FormFieldRecord[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTarget, setMenuTarget] = useState<FormRecord | null>(null);

    const [moveDialogOpen, setMoveDialogOpen] = useState(false);
    const [moveTargetCategoryId, setMoveTargetCategoryId] = useState<string | null>(null);
    const [itemToMove, setItemToMove] = useState<FormRecord | null>(null);

    // ─── Effects ─────────────────────────────────────────
    const loadForms = useCallback(async () => {
        try {
            const result = await window.api.getForms();
            setForms(result);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadForms();
    }, [loadForms]);

    useEffect(() => {
        if (selectedCategoryId === null) {
            setFilteredForms(forms);
        } else {
            setFilteredForms(forms.filter((f) => f.category_id === selectedCategoryId));
        }
    }, [forms, selectedCategoryId]);

    // ─── Actions ─────────────────────────────────────────
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

    const handleDelete = async () => {
        if (!menuTarget) return;
        if (!confirm(`Are you sure you want to delete form "${menuTarget.name}"?`)) {
            handleMenuClose();
            return;
        }
        const result = await window.api.deleteForm(menuTarget.id);
        if (result.success) {
            setSuccess(`Form "${menuTarget.name}" deleted`);
            loadForms();
            // Force tree refresh if needed (though categories usually don't change on form delete)
        } else {
            setError(result.error || 'Failed to delete form');
        }
        handleMenuClose();
    };

    // ─── Renders ─────────────────────────────────────────

    return (
        <Fade in timeout={500}>
            <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5">Forms</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>Create Form</Button>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
                    {/* Left Panel */}
                    <Grid item xs={12} md={3} sx={{ height: '100%' }}>
                        <CategoryTree
                            type="FORM"
                            selectedCategoryId={selectedCategoryId}
                            onSelectCategory={setSelectedCategoryId}
                            refreshTrigger={treeRefreshTrigger}
                        />
                    </Grid>

                    {/* Right Panel */}
                    <Grid item xs={12} md={9} sx={{ height: '100%', overflow: 'hidden' }}>
                        <Paper elevation={0} sx={{ height: '100%', border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column' }}>
                            <TableContainer sx={{ flexGrow: 1 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Form Name</TableCell>
                                            <TableCell>Template</TableCell>
                                            <TableCell>Categories</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredForms.map((form) => (
                                            <TableRow key={form.id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <FormIcon color="primary" fontSize="small" />
                                                        <Typography variant="body2">{form.name}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{form.template_name}</TableCell>
                                                <TableCell>
                                                    <Chip label={form.field_count + ' fields'} size="small" />
                                                </TableCell>
                                                <TableCell>
                                                    <Button size="small" onClick={() => handleViewFields(form)}>View</Button>
                                                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, form)}><MoreIcon /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredForms.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                    No forms in this category.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Wizard Dialog */}
                <FormWizard
                    open={wizardOpen}
                    onClose={() => setWizardOpen(false)}
                    onSuccess={handleWizardSuccess}
                    editFormId={editFormId}
                    initialCategoryId={selectedCategoryId}
                />

                {/* Move Dialog */}
                <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Move Form</DialogTitle>
                    <DialogContent sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" sx={{ mb: 1 }}>Select destination category:</Typography>
                        <Box sx={{ flexGrow: 1, border: '1px solid #ddd' }}>
                            <CategoryTree
                                type="FORM"
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

                {/* Context Menu */}
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                    <MenuItem onClick={handleEdit}><ListItemIcon><EditIcon fontSize="small" /></ListItemIcon> Edit</MenuItem>
                    <MenuItem onClick={handleMoveStart}><ListItemIcon><MoveIcon fontSize="small" /></ListItemIcon> Move</MenuItem>
                    <Divider />
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}><ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon> Delete</MenuItem>
                </Menu>

                {/* View Fields Dialog */}
                <Dialog open={!!viewingForm} onClose={() => setViewingForm(null)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {viewingForm?.name}
                        <IconButton onClick={() => setViewingForm(null)}><CloseIcon /></IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        {loadingFields ? <CircularProgress size={24} /> : (
                            <List dense>
                                {formFields.map(ff => (
                                    <ListItem key={ff.id}>
                                        <ListItemIcon><FieldIcon color="primary" /></ListItemIcon>
                                        <ListItemText primary={ff.label} secondary={ff.data_type} />
                                        {ff.required === 1 && <Chip label="Req" size="small" color="error" variant="outlined" />}
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </DialogContent>
                </Dialog>
            </Box>
        </Fade>
    );
};

export default FormsPage;
