import React from 'react';
import { Box, Typography, Paper, useTheme, alpha, Fade } from '@mui/material';
import { Construction as ConstructionIcon } from '@mui/icons-material';

interface PlaceholderPageProps {
    title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
    const theme = useTheme();

    return (
        <Fade in timeout={400}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        p: 5,
                        textAlign: 'center',
                        border: `1px solid ${theme.palette.divider}`,
                        maxWidth: 400,
                    }}
                >
                    <ConstructionIcon
                        sx={{
                            fontSize: 48,
                            color: alpha(theme.palette.primary.main, 0.4),
                            mb: 2,
                        }}
                    />
                    <Typography variant="h5" sx={{ mb: 1 }}>
                        {title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        This page will be implemented in a future milestone.
                    </Typography>
                </Paper>
            </Box>
        </Fade>
    );
};

export default PlaceholderPage;
