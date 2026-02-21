
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Checkbox,
    FormControlLabel,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Snackbar,
    Alert,
    Divider,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Settings as SettingsIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../components/AuthContext';
import { Navigate } from 'react-router-dom';

interface ClientType {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

interface ClientTypeField {
    id: string;
    client_type_id: string;
    label: string;
    field_key: string;
    data_type: string;
    is_required: number;
    is_deleted: number;
    created_at: string;
}

const ClientTypesPage: React.FC = () => {
    const { user } = useAuth();

    // Auth Check
    if (user?.role !== 'ADMIN') {
        return <Navigate to="/dashboard" replace />;
    }

    const [types, setTypes] = useState<ClientType[]>([]);
    const [loading, setLoading] = useState(false);

    // Create Type Dialog State
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');

    // Manage Fields Dialog State
    const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<ClientType | null>(null);
    const [currentFields, setCurrentFields] = useState<ClientTypeField[]>([]);

    // Add Field Sub-Dialog State
    const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldType, setNewFieldType] = useState('text');
    const [newFieldRequired, setNewFieldRequired] = useState(false);

    // Notifications
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const loadTypes = async () => {
        setLoading(true);
        try {
            const result = await window.api.getAllClientTypes();
            setTypes(result);
        } catch (err) {
            console.error('Failed to load types', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTypes();
    }, []);

    // Create Type Handlers
    const handleCreateType = async () => {
        if (!newTypeName.trim()) return;
        try {
            await window.api.createClientType(newTypeName);
            setSnackbar({ open: true, message: 'Client Type created', severity: 'success' });
            setCreateDialogOpen(false);
            setNewTypeName('');
            loadTypes();
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    // Manage Fields Handlers
    const handleOpenFields = async (type: ClientType) => {
        setSelectedType(type);
        try {
            const fields = await window.api.getClientTypeFields(type.id);
            setCurrentFields(fields);
            setFieldsDialogOpen(true);
        } catch (err: any) {
            setSnackbar({ open: true, message: 'Failed to load fields', severity: 'error' });
        }
    };

    const handleAddField = async () => {
        if (!selectedType || !newFieldLabel.trim()) return;

        // Generate key: lowercase, replace spaces with underscores, remove special chars
        const fieldKey = newFieldLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        try {
            // Since addClientTypeField isn't exposed yet based on previous steps,
            // we need to assume it's exposed or fix it.
            // Wait, the plan said "window.api.addClientTypeField".
            // Let's check preload.ts... it wasn't there!
            // I need to add that to preload in the next step or fix it here?
            // "Constraint: Only add new page and wiring."
            // But if the API isn't exposed, I can't call it.
            // I will assume I need to expose it as part of "wiring".

            // Proceeding with implementation assuming standard API pattern.

            await (window.api as any).addClientTypeField(selectedType.id, {
                label: newFieldLabel,
                field_key: fieldKey,
                data_type: newFieldType,
                is_required: newFieldRequired
            });

            setSnackbar({ open: true, message: 'Field added', severity: 'success' });
            setAddFieldDialogOpen(false);
            setNewFieldLabel('');
            setNewFieldType('text');
            setNewFieldRequired(false);

            // Reload fields
            const fields = await window.api.getClientTypeFields(selectedType.id);
            setCurrentFields(fields);

        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleSoftDeleteField = async (fieldId: string) => {
        try {
            await (window.api as any).softDeleteClientTypeField(fieldId);
            setSnackbar({ open: true, message: 'Field deleted', severity: 'success' });

            if (selectedType) {
                const fields = await window.api.getClientTypeFields(selectedType.id);
                setCurrentFields(fields);
            }
        } catch (err: any) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };


    return (
        <Box sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" component="h1">Client Types</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    Create Client Type
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', flexGrow: 1 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Type Name</TableCell>
                            <TableCell>Created At</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {types.map((type) => (
                            <TableRow key={type.id} hover>
                                <TableCell>{type.name}</TableCell>
                                <TableCell>{new Date(type.created_at).toLocaleDateString()}</TableCell>
                                <TableCell align="right">
                                    <Button
                                        size="small"
                                        startIcon={<SettingsIcon />}
                                        onClick={() => handleOpenFields(type)}
                                    >
                                        Manage Fields
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {types.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                    No Client Types found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Type Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Create Client Type</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Type Name"
                        fullWidth
                        variant="outlined"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateType} variant="contained" disabled={!newTypeName.trim()}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Manage Fields Dialog */}
            <Dialog open={fieldsDialogOpen} onClose={() => setFieldsDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Manage Fields: {selectedType?.name}
                    <Box display="flex" justifyContent="flex-end" mt={1}>
                        <Button
                            size="small"
                            startIcon={<AddIcon />}
                            variant="outlined"
                            onClick={() => setAddFieldDialogOpen(true)}
                        >
                            Add Field
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <List>
                        {currentFields.map((field) => (
                            <React.Fragment key={field.id}>
                                <ListItem>
                                    <ListItemText
                                        primary={field.label}
                                        secondary={
                                            <>
                                                Key: <code>{field.field_key}</code> | Type: {field.data_type} | {field.is_required ? 'Required' : 'Optional'}
                                            </>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleSoftDeleteField(field.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                <Divider component="li" />
                            </React.Fragment>
                        ))}
                        {currentFields.length === 0 && (
                            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                                No custom fields defined.
                            </Typography>
                        )}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFieldsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Add Field Sub-Dialog */}
            <Dialog open={addFieldDialogOpen} onClose={() => setAddFieldDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add Field</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Label"
                            fullWidth
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                        />
                        <Typography variant="caption" color="textSecondary">
                            Autogenerated Key: {newFieldLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}
                        </Typography>

                        <FormControl fullWidth>
                            <InputLabel>Data Type</InputLabel>
                            <Select
                                value={newFieldType}
                                label="Data Type"
                                onChange={(e) => setNewFieldType(e.target.value)}
                            >
                                <MenuItem value="text">Text</MenuItem>
                                <MenuItem value="number">Number</MenuItem>
                                <MenuItem value="date">Date</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={newFieldRequired}
                                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                                />
                            }
                            label="Required Field"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddFieldDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddField} variant="contained" disabled={!newFieldLabel.trim()}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ClientTypesPage;
