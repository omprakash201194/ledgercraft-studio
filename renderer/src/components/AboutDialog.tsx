import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Divider,
    Link
} from '@mui/material';
import { AutoStories as LogoIcon } from '@mui/icons-material';

interface AboutDialogProps {
    open: boolean;
    onClose: () => void;
    version: string;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ open, onClose, version }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>About</DialogTitle>
            <DialogContent>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <LogoIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom fontWeight="bold">
                        LedgerCraft Studio
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        Offline Document Automation for CA Firms
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.disabled' }}>
                        Version {version}
                    </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom fontSize="1rem">
                    Developer Contact
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Designed and Developed by <strong>Omprakash Gautam</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Email:</strong> <Link href="mailto:omprakash201194@gmail.com">omprakash201194@gmail.com</Link>
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
