import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Divider,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    IconButton,
    InputAdornment,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Snackbar,
    Alert,
    useTheme,
    Checkbox,
    ListItemText,
} from '@mui/material';
import {
    Search as SearchIcon,
    Visibility as VisibilityIcon,
    Add as AddIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CategoryTree from '../components/CategoryTree';
import { useAuth } from '../components/AuthContext';

interface Client {
    id: string;
    name: string;
    client_type_id: string;
    category_id: string | null;
    created_at: string;
    field_values?: Record<string, string>;
}

const ClientsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Search and Data State
    const [searchQuery, setSearchQuery] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);

    const handleDataChange = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const fetchClients = async (query: string) => {
        setLoading(true);
        try {
            // Use wildcard if query is empty to get initial list
            const q = query.trim() || '%';
            const results = await window.api.searchClients(q);
            setClients(results);
        } catch (error) {
            console.error('Failed to search clients:', error);
            setClients([]);
        } finally {
            setLoading(false);
        }
    };

    // deb-ounce not required per instructions, just call on change
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.target.value;
        setSearchQuery(query);
        fetchClients(query);
    };

    // Initial load
    useEffect(() => {
        fetchClients('');
    }, []);

    const handleClientClick = (clientId: string) => {
        navigate(`/clients/${clientId}`);
    };

    // Filter by selected category (client-side for now as API doesn't support it)
    // Note: searchClients limits to 50, so this is imperfect but consistent with current constraints
    const filteredClients = selectedCategoryId
        ? clients.filter(c => c.category_id === selectedCategoryId)
        : clients;

    // Create/Edit Client Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [originalClient, setOriginalClient] = useState<Client | null>(null);
    const [originalFieldValues, setOriginalFieldValues] = useState<Record<string, string>>({});
    const [clientTypes, setClientTypes] = useState<ClientType[]>([]);
    const [newClientName, setNewClientName] = useState('');
    const [selectedClientTypeId, setSelectedClientTypeId] = useState('');
    const [selectedDialogCategoryId, setSelectedDialogCategoryId] = useState<string>('');

    // Dynamic Columns Table State
    const [allCustomFields, setAllCustomFields] = useState<{ field_key: string; label: string; data_type: string }[]>([]);
    const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);

    // Dynamic Fields State
    const [typeFields, setTypeFields] = useState<ClientTypeField[]>([]);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    // Notifications
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
    };

    useEffect(() => {
        const loadClientTypesAndCategories = async () => {
            try {
                const types = await window.api.getAllClientTypes();
                setClientTypes(types);

                const customFields = await window.api.getAllClientTypeFields();
                setAllCustomFields(customFields);

                if (user?.id) {
                    const prefs = await window.api.getUserPreferences(user.id);
                    if (prefs.client_columns) {
                        try {
                            const parsed = JSON.parse(prefs.client_columns);
                            if (Array.isArray(parsed)) {
                                setSelectedColumnKeys(parsed);
                            }
                        } catch (e) {
                            console.error('Failed to parse client_columns preference', e);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load client types or preferences', err);
            }
        };
        loadClientTypesAndCategories();
    }, [user?.id]);

    // Fetch fields when Type changes
    useEffect(() => {
        if (!selectedClientTypeId) {
            setTypeFields([]);
            if (!editMode) setFieldValues({});
            setFieldErrors({});
            return;
        }

        const loadFields = async () => {
            try {
                const fields = await window.api.getClientTypeFields(selectedClientTypeId);
                setTypeFields(fields);
                // Prevent double initialization: only reset if not in edit mode
                if (!editMode) {
                    setFieldValues({});
                    setFieldErrors({});
                } else {
                    // Ensure dynamic fields load AFTER client type is loaded, pre-populated
                    setFieldValues(originalFieldValues);
                }
            } catch (err) {
                console.error('Failed to load type fields', err);
            }
        };
        loadFields();
    }, [selectedClientTypeId, editMode, originalFieldValues]);

    const handleCreateClientClick = () => {
        setEditMode(false);
        setEditingClientId(null);
        setOriginalClient(null);
        setOriginalFieldValues({});
        setNewClientName('');
        setSelectedClientTypeId('');
        setSelectedDialogCategoryId('');
        setTypeFields([]);
        setFieldValues({});
        setFieldErrors({});
        setOpenDialog(true);
    };

    const handleEditClientClick = async (client: Client) => {
        // DO NOT CLEAR FIELDS ON DIALOG OPEN
        setEditMode(true);
        setEditingClientId(client.id);
        setOriginalClient(client);

        setNewClientName(client.name);
        setSelectedClientTypeId(client.client_type_id);
        setSelectedDialogCategoryId(client.category_id || '');

        try {
            const fullClient = await window.api.getClientById(client.id);
            if (fullClient && fullClient.field_values) {
                setOriginalFieldValues(fullClient.field_values);
                setFieldValues(fullClient.field_values);
            } else {
                setOriginalFieldValues({});
                setFieldValues({});
            }
        } catch (err) {
            console.error('Failed to fetch client details for editing', err);
            setOriginalFieldValues({});
            setFieldValues({});
        }

        setFieldErrors({});
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleFieldChange = (fieldKey: string, value: string) => {
        setFieldValues(prev => ({ ...prev, [fieldKey]: value }));
        // Clear error if exists
        if (fieldErrors[fieldKey]) {
            setFieldErrors(prev => ({ ...prev, [fieldKey]: false }));
        }
    };

    const handleSave = async () => {
        // Validation
        const newErrors: Record<string, boolean> = {};
        let hasError = false;

        if (!newClientName.trim()) {
            hasError = true;
        }

        typeFields.forEach(field => {
            if (field.is_required) {
                const val = fieldValues[field.field_key];
                if (!val || val.toString().trim() === '') {
                    newErrors[field.field_key] = true;
                    hasError = true;
                }
            }
        });

        if (hasError) {
            setFieldErrors(newErrors);
            return;
        }

        try {
            const apiFieldValues = typeFields.map(field => ({
                field_id: field.id,
                value: String(fieldValues[field.field_key] || '')
            }));

            if (editMode && editingClientId) {
                await window.api.updateClient(editingClientId, {
                    name: newClientName,
                    category_id: selectedDialogCategoryId || null,
                    field_values: apiFieldValues
                });
                setSnackbarMessage('Client updated successfully');
            } else {
                await window.api.createClient({
                    name: newClientName,
                    client_type_id: selectedClientTypeId,
                    category_id: selectedDialogCategoryId || null,
                    field_values: apiFieldValues
                });
                setSnackbarMessage('Client created successfully');
            }

            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            setOpenDialog(false);

            // Refresh list
            handleDataChange();
            fetchClients(searchQuery);

        } catch (err: any) {
            console.error(editMode ? 'Failed to update client:' : 'Failed to create client:', err);
            setSnackbarMessage(err.message || (editMode ? 'Failed to update client' : 'Failed to create client'));
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const renderField = (field: ClientTypeField) => {
        const isError = !!fieldErrors[field.field_key];

        if (field.data_type === 'date') {
            return (
                <TextField
                    key={field.id}
                    label={field.label}
                    type="date"
                    value={fieldValues[field.field_key] || ''}
                    onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                    fullWidth
                    required={!!field.is_required}
                    error={isError}
                    helperText={isError ? 'Required' : ''}
                    InputLabelProps={{ shrink: true }}
                />
            );
        }

        return (
            <TextField
                key={field.id}
                label={field.label}
                type={field.data_type === 'number' ? 'number' : 'text'}
                value={fieldValues[field.field_key] || ''}
                onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                fullWidth
                required={!!field.is_required}
                error={isError}
                helperText={isError ? 'Required' : ''}
            />
        );
    };

    const hasChanges = () => {
        if (!editMode) return true; // Always allow save in create mode (if valid)
        if (!originalClient) return true;

        if (newClientName !== originalClient.name) return true;

        const currentCategoryId = selectedDialogCategoryId || null;
        if (currentCategoryId !== originalClient.category_id) return true;

        for (const field of typeFields) {
            const key = field.field_key;
            const origVal = originalFieldValues[key] || '';
            const currVal = fieldValues[key] || '';
            if (String(origVal) !== String(currVal)) {
                return true;
            }
        }
        return false;
    };

    return (
        <Box sx={{ flexGrow: 1, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h5" component="h1">
                    Clients
                </Typography>
            </Box>

            <Grid container spacing={3} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {/* Left Pane: Categories */}
                <Grid item xs={12} md={3} sx={{ height: '100%' }}>
                    <CategoryTree
                        type="CLIENT"
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategory={setSelectedCategoryId}
                        refreshTrigger={refreshTrigger}
                        onDataChange={handleDataChange}
                        readOnly={user?.role !== 'ADMIN'}
                    />
                </Grid>

                {/* Right Pane: Client List */}
                <Grid item xs={12} md={9} sx={{ height: '100%', overflow: 'hidden' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            height: '100%',
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Header: Search & Actions */}
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <TextField
                                    size="small"
                                    placeholder="Search clients..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ width: 300 }}
                                />

                                <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
                                    <InputLabel id="custom-column-label">Client Columns</InputLabel>
                                    <Select
                                        labelId="custom-column-label"
                                        label="Client Columns"
                                        multiple
                                        value={selectedColumnKeys}
                                        onChange={(e) => {
                                            const value = e.target.value as string[];
                                            setSelectedColumnKeys(value);
                                            if (user?.id) {
                                                window.api.updateUserPreferences(user.id, { client_columns: JSON.stringify(value) })
                                                    .catch(err => console.error('Failed to update columns preference', err));
                                            }
                                        }}
                                        renderValue={(selected) => {
                                            if (selected.length === 0) return <em>None</em>;
                                            return selected
                                                .map(key => allCustomFields.find(f => f.field_key === key)?.label || key)
                                                .join(', ');
                                        }}
                                    >
                                        {allCustomFields.map(f => (
                                            <MenuItem key={f.field_key} value={f.field_key}>
                                                <Checkbox checked={selectedColumnKeys.indexOf(f.field_key) > -1} />
                                                <ListItemText primary={f.label} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            {user?.role === 'ADMIN' && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleCreateClientClick}
                                >
                                    Create Client
                                </Button>
                            )}
                        </Box>

                        {/* Table */}
                        <TableContainer sx={{ flexGrow: 1 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Type</TableCell>
                                        {selectedColumnKeys.map(key => (
                                            <TableCell key={key}>
                                                {allCustomFields.find(f => f.field_key === key)?.label || key}
                                            </TableCell>
                                        ))}
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredClients.map((client) => (
                                        <TableRow
                                            key={client.id}
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => handleClientClick(client.id)}
                                        >
                                            <TableCell>{client.name}</TableCell>
                                            <TableCell>
                                                {clientTypes.find(t => t.id === client.client_type_id)?.name || 'Unknown'}
                                            </TableCell>
                                            {selectedColumnKeys.map(key => (
                                                <TableCell key={key}>
                                                    {client.field_values?.[key] || '-'}
                                                </TableCell>
                                            ))}
                                            <TableCell align="right">
                                                <Tooltip title="Edit Client">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClientClick(client);
                                                        }}
                                                        sx={{ mr: 1 }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleClientClick(client.id);
                                                        }}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && filteredClients.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                {searchQuery ? 'No clients found matching query.' : 'No clients found.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Create / Edit Client Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editMode ? 'Edit Client' : 'Create Client'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Client Name"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            fullWidth
                            autoFocus
                        />
                        <Box>
                            <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>Category (Optional)</Typography>
                            <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, height: 200, overflow: 'auto', mb: 2 }}>
                                <CategoryTree
                                    type="CLIENT"
                                    selectedCategoryId={selectedDialogCategoryId || null}
                                    onSelectCategory={(id) => setSelectedDialogCategoryId(id || '')}
                                    refreshTrigger={refreshTrigger}
                                    readOnly={true}
                                />
                            </Box>
                            {selectedDialogCategoryId && (
                                <Button size="small" onClick={() => setSelectedDialogCategoryId('')} sx={{ mt: -1, mb: 2 }}>
                                    Clear Selection
                                </Button>
                            )}
                        </Box>
                        <FormControl fullWidth disabled={editMode}>
                            <InputLabel>Client Type</InputLabel>
                            <Select
                                value={selectedClientTypeId}
                                label="Client Type"
                                onChange={(e) => setSelectedClientTypeId(e.target.value)}
                            >
                                {clientTypes.map((type) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Dynamic Fields */}
                        {typeFields.length > 0 && (
                            <>
                                <Divider sx={{ my: 1 }}>
                                    <Typography variant="caption" color="text.secondary">DETAILS</Typography>
                                </Divider>
                                {typeFields.map(field => renderField(field))}
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={!newClientName.trim() || !selectedClientTypeId || !hasChanges()}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ClientsPage;
