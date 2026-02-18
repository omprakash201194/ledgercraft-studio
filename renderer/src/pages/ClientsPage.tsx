import React from 'react';
import { Box, Typography, Grid, Paper, Divider } from '@mui/material';

const ClientsPage: React.FC = () => {
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
                            Categories
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                            Client Category Tree Placeholder
                        </Typography>
                    </Paper>
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
                            Client List Placeholder
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ClientsPage;
