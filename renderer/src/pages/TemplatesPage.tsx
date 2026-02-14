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
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
    alpha,
    IconButton,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Description as DocIcon,
    Code as PlaceholderIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

interface TemplateRecord {
    id: string;
    name: string;
    file_path: string;
    created_at: string;
    placeholder_count: number;
}

interface TemplatePlaceholder {
    id: string;
    template_id: string;
    placeholder_key: string;
}

const TemplatesPage: React.FC = () => {
    const theme = useTheme();
    const [templates, setTemplates] = useState<TemplateRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Placeholder dialog
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecord | null>(null);
    const [placeholders, setPlaceholders] = useState<TemplatePlaceholder[]>([]);
    const [loadingPlaceholders, setLoadingPlaceholders] = useState(false);

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
        loadTemplates();
    }, [loadTemplates]);

    const handleUpload = async () => {
        setError('');
        setSuccess('');
        setUploading(true);

        try {
            const result = await window.api.uploadTemplate();
            if (result.success && result.template) {
                setSuccess(
                    `Template "${result.template.name}" uploaded with ${result.template.placeholders.length} placeholder(s)`
                );
                loadTemplates();
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

    return (
        <Fade in timeout={500}>
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5">Templates</Typography>
                    <Button
                        id="upload-template-btn"
                        variant="contained"
                        startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
                        onClick={handleUpload}
                        disabled={uploading}
                        sx={{
                            px: 3,
                            background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #6A3DE8 0%, #3D7CE8 100%)',
                            },
                        }}
                    >
                        {uploading ? 'Uploading...' : 'Upload Template'}
                    </Button>
                </Box>

                {/* Alerts */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                {/* Templates Table */}
                <Paper
                    elevation={0}
                    sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        overflow: 'hidden',
                    }}
                >
                    {loading ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Template Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Placeholders</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {templates.map((template) => (
                                        <TableRow key={template.id} hover>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <DocIcon
                                                        sx={{
                                                            color: theme.palette.primary.main,
                                                            fontSize: 20,
                                                        }}
                                                    />
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {template.name}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={template.placeholder_count}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem',
                                                        backgroundColor: alpha(
                                                            template.placeholder_count > 0
                                                                ? theme.palette.success.main
                                                                : theme.palette.warning.main,
                                                            0.15
                                                        ),
                                                        color:
                                                            template.placeholder_count > 0
                                                                ? theme.palette.success.main
                                                                : theme.palette.warning.main,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    {new Date(template.created_at).toLocaleDateString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    onClick={() => handleViewPlaceholders(template)}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    View Placeholders
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {templates.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ textAlign: 'center', py: 6 }}>
                                                <UploadIcon
                                                    sx={{
                                                        fontSize: 48,
                                                        color: 'text.disabled',
                                                        mb: 1,
                                                    }}
                                                />
                                                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                                    No templates yet
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>
                                                    Upload a .docx file to get started
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>

                {/* Placeholders Dialog */}
                <Dialog
                    open={!!selectedTemplate}
                    onClose={handleCloseDialog}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            border: `1px solid ${theme.palette.divider}`,
                        },
                    }}
                >
                    {selectedTemplate && (
                        <>
                            <DialogTitle
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    pb: 1,
                                }}
                            >
                                <Box>
                                    <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>
                                        {selectedTemplate.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Detected Placeholders
                                    </Typography>
                                </Box>
                                <IconButton onClick={handleCloseDialog} size="small">
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </DialogTitle>
                            <DialogContent dividers>
                                {loadingPlaceholders ? (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <CircularProgress size={28} />
                                    </Box>
                                ) : placeholders.length > 0 ? (
                                    <List dense disablePadding>
                                        {placeholders.map((ph) => (
                                            <ListItem key={ph.id} sx={{ py: 0.8 }}>
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    <PlaceholderIcon
                                                        sx={{
                                                            fontSize: 18,
                                                            color: theme.palette.primary.main,
                                                        }}
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Typography
                                                            sx={{
                                                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                                                fontSize: '0.85rem',
                                                                fontWeight: 500,
                                                            }}
                                                        >
                                                            {`{{${ph.placeholder_key}}}`}
                                                        </Typography>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            No placeholders detected in this template
                                        </Typography>
                                    </Box>
                                )}
                            </DialogContent>
                        </>
                    )}
                </Dialog>
            </Box>
        </Fade>
    );
};

export default TemplatesPage;
