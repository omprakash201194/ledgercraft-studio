import { useState } from 'react';
import { Box, Typography, Grid, Paper, Divider } from '@mui/material';
import CategoryTree from '../components/CategoryTree';
import { useAuth } from '../components/AuthContext';

const ClientsPage: React.FC = () => {
    const { user } = useAuth();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleDataChange = () => {
        setRefreshTrigger(prev => prev + 1);
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
                <Grid item xs={12} md={9} sx={{ height: '100%' }}>
                    <Paper
                        elevation={0}
                        sx={{
                            height: '100%',
                            border: '1px solid',
                            borderColor: 'divider',
                            p: 2
                        }}
                    >
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            All Clients
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                            Client List Placeholder {selectedCategoryId ? `(Category: ${selectedCategoryId})` : '(All)'}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ClientsPage;
