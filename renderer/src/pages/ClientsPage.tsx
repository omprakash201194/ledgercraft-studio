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
} from '@mui/material';
import {
    Search as SearchIcon,
    Visibility as VisibilityIcon,
    Add as AddIcon,
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

    // Create Client Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [clientTypes, setClientTypes] = useState<ClientType[]>([]);
    const [newClientName, setNewClientName] = useState('');
    const [selectedClientTypeId, setSelectedClientTypeId] = useState('');

    useEffect(() => {
        const loadClientTypes = async () => {
            try {
                const types = await window.api.getAllClientTypes();
                setClientTypes(types);
            } catch (err) {
                console.error('Failed to load client types', err);
            }
        };
        loadClientTypes();
    }, []);

    const handleCreateClientClick = () => {
        setNewClientName('');
        setSelectedClientTypeId('');
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleNext = () => {
        // Placeholder for next step (dynamic fields)
        console.log('Next clicked. Client Type ID stored:', selectedClientTypeId);
        // We do not implement dynamic fields yet per instructions.
        // For now, we can just close the dialog or keep it open.
        // Instructions say "Store selected client_type_id in state". Done via state variable.
        // "Return only modified ClientsPage file"

        // Let's just alert for now so user knows it worked
        alert(`Next step would show fields for type: ${selectedClientTypeId}`);
        setOpenDialog(false);
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
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                                        <TableCell>Type ID</TableCell>
                                        <TableCell>Category</TableCell>
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
                                            <TableCell>{client.client_type_id}</TableCell>
                                            <TableCell>{client.category_id || '-'}</TableCell>
                                            <TableCell align="right">
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

            {/* Create Client Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Create Client</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Client Name"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            fullWidth
                            autoFocus
                        />
                        <FormControl fullWidth>
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
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleNext}
                        variant="contained"
                        disabled={!newClientName.trim() || !selectedClientTypeId}
                    >
                        Next
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ClientsPage;
