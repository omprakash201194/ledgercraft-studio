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
    useTheme,
    alpha,
    TextField,
    MenuItem,
    Switch,
    FormControlLabel,
    Divider,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    DynamicForm as FormIcon,
    TextFields as FieldIcon,
    ArrowBack as BackIcon,
    Close as CloseIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';

// ─── Types ───────────────────────────────────────────────

interface FieldDraft {
    id: number;
    label: string;
    data_type: string;
    required: boolean;
    placeholder_mapping: string;
    options_csv: string;
}

interface TemplateRecord {
    id: string;
    name: string;
    placeholder_count: number;
}

interface TemplatePlaceholder {
    id: string;
    template_id: string;
    placeholder_key: string;
}

interface FormRecord {
    id: string;
    name: string;
    template_id: string;
    template_name: string;
    field_count: number;
    created_at: string;
}

interface FormFieldRecord {
    id: string;
    form_id: string;
    label: string;
    field_key: string;
    data_type: string;
    required: number;
    placeholder_mapping: string | null;
    options_json: string | null;
}

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'currency', label: 'Currency' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'multiline', label: 'Multi-line Text' },
];

/** Convert label to snake_case field key */
function toFieldKey(label: string): string {
    return label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
}

let nextFieldId = 1;

const FormsPage: React.FC = () => {
    const theme = useTheme();

    // ─── List View State ─────────────────────────────────
    const [forms, setForms] = useState<FormRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ─── Create View State ───────────────────────────────
    const [creating, setCreating] = useState(false);
    const [step, setStep] = useState(1);
    const [formName, setFormName] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [templates, setTemplates] = useState<TemplateRecord[]>([]);
    const [placeholders, setPlaceholders] = useState<TemplatePlaceholder[]>([]);
    const [fields, setFields] = useState<FieldDraft[]>([]);
    const [saving, setSaving] = useState(false);

    // ─── Detail Dialog State ─────────────────────────────
    const [viewingForm, setViewingForm] = useState<FormRecord | null>(null);
    const [formFields, setFormFields] = useState<FormFieldRecord[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);

    // ─── Load Forms ──────────────────────────────────────
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

    // ─── Load Templates (for create) ────────────────────
    const loadTemplates = useCallback(async () => {
        try {
            const result = await window.api.getTemplates();
            setTemplates(result);
        } catch {
            // ignore
        }
    }, []);

    // ─── Load Placeholders for Selected Template ────────
    const loadPlaceholders = useCallback(async (templateId: string) => {
        if (!templateId) {
            setPlaceholders([]);
            return;
        }
        try {
            const result = await window.api.getTemplatePlaceholders(templateId);
            setPlaceholders(result);
        } catch {
            setPlaceholders([]);
        }
    }, []);

    useEffect(() => {
        if (selectedTemplateId) {
            loadPlaceholders(selectedTemplateId);
        }
    }, [selectedTemplateId, loadPlaceholders]);

    // ─── Create Mode ────────────────────────────────────
    const startCreating = () => {
        setCreating(true);
        setStep(1);
        setFormName('');
        setSelectedTemplateId('');
        setPlaceholders([]);
        setFields([]);
        setError('');
        setSuccess('');
        loadTemplates();
    };

    const goToStep2 = () => {
        if (!formName.trim()) {
            setError('Form name is required');
            return;
        }
        if (!selectedTemplateId) {
            setError('Please select a template');
            return;
        }
        setError('');
        setStep(2);
    };

    const addField = () => {
        setFields((prev) => [
            ...prev,
            {
                id: nextFieldId++,
                label: '',
                data_type: 'text',
                required: false,
                placeholder_mapping: '',
                options_csv: '',
            },
        ]);
    };

    const updateField = (id: number, key: keyof FieldDraft, value: string | boolean) => {
        setFields((prev) =>
            prev.map((f) => (f.id === id ? { ...f, [key]: value } : f))
        );
    };

    const removeField = (id: number) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
    };

    const getUsedPlaceholders = (): Set<string> => {
        return new Set(fields.map((f) => f.placeholder_mapping).filter((m) => m !== ''));
    };

    const handleSave = async () => {
        setError('');

        if (fields.length === 0) {
            setError('At least one field is required');
            return;
        }

        for (const f of fields) {
            if (!f.label.trim()) {
                setError('All fields must have a label');
                return;
            }
            if (f.data_type === 'dropdown' && !f.options_csv.trim()) {
                setError(`Dropdown field "${f.label}" must have options`);
                return;
            }
        }

        // Check for duplicate placeholders
        const mappings = fields.map((f) => f.placeholder_mapping).filter((m) => m !== '');
        const uniqueMappings = new Set(mappings);
        if (mappings.length !== uniqueMappings.size) {
            setError('Placeholder mappings must be unique across fields');
            return;
        }

        setSaving(true);

        try {
            const result = await window.api.createForm({
                name: formName.trim(),
                template_id: selectedTemplateId,
                fields: fields.map((f) => ({
                    label: f.label.trim(),
                    field_key: toFieldKey(f.label),
                    data_type: f.data_type,
                    required: f.required,
                    placeholder_mapping: f.placeholder_mapping || null,
                    options_json:
                        f.data_type === 'dropdown' && f.options_csv
                            ? JSON.stringify(f.options_csv.split(',').map((o) => o.trim()).filter(Boolean))
                            : null,
                })),
            });

            if (result.success) {
                setSuccess(`Form "${formName}" created with ${fields.length} field(s)`);
                setCreating(false);
                setStep(1);
                loadForms();
            } else {
                setError(result.error || 'Failed to create form');
            }
        } catch {
            setError('Failed to create form');
        } finally {
            setSaving(false);
        }
    };

    const cancelCreate = () => {
        setCreating(false);
        setStep(1);
        setError('');
    };

    // ─── View Fields Dialog ─────────────────────────────
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

    // ─── Create View ─────────────────────────────────────
    if (creating) {
        return (
            <Fade in timeout={400}>
                <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                        <IconButton onClick={cancelCreate} size="small">
                            <BackIcon />
                        </IconButton>
                        <Typography variant="h5">Create Form</Typography>
                        <Chip
                            label={`Step ${step} of 2`}
                            size="small"
                            sx={{
                                fontWeight: 600,
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                            }}
                        />
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}

                    {/* Step 1: Name + Template */}
                    {step === 1 && (
                        <Paper
                            elevation={0}
                            sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}
                        >
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                Basic Information
                            </Typography>
                            <TextField
                                label="Form Name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                                sx={{ mb: 2.5 }}
                            />
                            <TextField
                                select
                                label="Select Template"
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                fullWidth
                                required
                                helperText={
                                    templates.length === 0
                                        ? 'No templates available. Upload a template first.'
                                        : undefined
                                }
                            >
                                {templates.map((t) => (
                                    <MenuItem key={t.id} value={t.id}>
                                        {t.name} ({t.placeholder_count} placeholder{t.placeholder_count !== 1 ? 's' : ''})
                                    </MenuItem>
                                ))}
                            </TextField>

                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                                <Button onClick={cancelCreate} color="inherit">
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={goToStep2}
                                    disabled={!formName.trim() || !selectedTemplateId}
                                    sx={{
                                        background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                                        '&:hover': { background: 'linear-gradient(135deg, #6A3DE8 0%, #3D7CE8 100%)' },
                                    }}
                                >
                                    Next: Add Fields
                                </Button>
                            </Box>
                        </Paper>
                    )}

                    {/* Step 2: Dynamic Fields */}
                    {step === 2 && (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    Form Fields
                                </Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="outlined"
                                    size="small"
                                    onClick={addField}
                                >
                                    Add Field
                                </Button>
                            </Box>

                            {fields.length === 0 && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        textAlign: 'center',
                                        border: `1px dashed ${theme.palette.divider}`,
                                    }}
                                >
                                    <FieldIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                        No fields added yet
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>
                                        Click "Add Field" to start building your form
                                    </Typography>
                                </Paper>
                            )}

                            {fields.map((field, index) => {
                                const usedPlaceholders = getUsedPlaceholders();
                                return (
                                    <Paper
                                        key={field.id}
                                        elevation={0}
                                        sx={{
                                            p: 2.5,
                                            mb: 2,
                                            border: `1px solid ${theme.palette.divider}`,
                                            position: 'relative',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                                Field {index + 1}
                                            </Typography>
                                            <IconButton onClick={() => removeField(field.id)} size="small" color="error">
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>

                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                                            <TextField
                                                label="Label"
                                                value={field.label}
                                                onChange={(e) => updateField(field.id, 'label', e.target.value)}
                                                size="small"
                                                required
                                            />
                                            <TextField
                                                select
                                                label="Field Type"
                                                value={field.data_type}
                                                onChange={(e) => updateField(field.id, 'data_type', e.target.value)}
                                                size="small"
                                            >
                                                {FIELD_TYPES.map((ft) => (
                                                    <MenuItem key={ft.value} value={ft.value}>
                                                        {ft.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Box>

                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'center' }}>
                                            <TextField
                                                select
                                                label="Map to Placeholder"
                                                value={field.placeholder_mapping}
                                                onChange={(e) => updateField(field.id, 'placeholder_mapping', e.target.value)}
                                                size="small"
                                                helperText={
                                                    placeholders.length === 0
                                                        ? 'No placeholders in template'
                                                        : undefined
                                                }
                                            >
                                                <MenuItem value="">
                                                    <em>None</em>
                                                </MenuItem>
                                                {placeholders.map((ph) => (
                                                    <MenuItem
                                                        key={ph.id}
                                                        value={ph.placeholder_key}
                                                        disabled={
                                                            usedPlaceholders.has(ph.placeholder_key) &&
                                                            field.placeholder_mapping !== ph.placeholder_key
                                                        }
                                                    >
                                                        {`{{${ph.placeholder_key}}}`}
                                                        {usedPlaceholders.has(ph.placeholder_key) &&
                                                            field.placeholder_mapping !== ph.placeholder_key &&
                                                            ' (used)'}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={field.required}
                                                        onChange={(e) => updateField(field.id, 'required', e.target.checked)}
                                                        size="small"
                                                    />
                                                }
                                                label="Required"
                                                sx={{ ml: 0 }}
                                            />
                                        </Box>

                                        {field.data_type === 'dropdown' && (
                                            <TextField
                                                label="Options (comma-separated)"
                                                value={field.options_csv}
                                                onChange={(e) => updateField(field.id, 'options_csv', e.target.value)}
                                                size="small"
                                                fullWidth
                                                placeholder="Option 1, Option 2, Option 3"
                                                sx={{ mt: 2 }}
                                            />
                                        )}
                                    </Paper>
                                );
                            })}

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Button onClick={() => setStep(1)} color="inherit" startIcon={<BackIcon />}>
                                    Back
                                </Button>
                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    <Button onClick={cancelCreate} color="inherit">
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleSave}
                                        disabled={saving || fields.length === 0}
                                        sx={{
                                            px: 3,
                                            background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                                            '&:hover': { background: 'linear-gradient(135deg, #6A3DE8 0%, #3D7CE8 100%)' },
                                        }}
                                    >
                                        {saving ? <CircularProgress size={22} color="inherit" /> : 'Save Form'}
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Fade>
        );
    }

    // ─── List View ───────────────────────────────────────
    return (
        <Fade in timeout={500}>
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5">Forms</Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={startCreating}
                        sx={{
                            px: 3,
                            background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                            '&:hover': { background: 'linear-gradient(135deg, #6A3DE8 0%, #3D7CE8 100%)' },
                        }}
                    >
                        Create Form
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

                {/* Forms Table */}
                <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                    {loading ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Form Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Template</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Fields</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }} align="right">
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {forms.map((form) => (
                                        <TableRow key={form.id} hover>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <FormIcon
                                                        sx={{ color: theme.palette.primary.main, fontSize: 20 }}
                                                    />
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {form.name}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    {form.template_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={form.field_count}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: '0.75rem',
                                                        backgroundColor: alpha(theme.palette.info.main, 0.12),
                                                        color: theme.palette.info.main,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    {new Date(form.created_at).toLocaleDateString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    startIcon={<ViewIcon />}
                                                    onClick={() => handleViewFields(form)}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    View Fields
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {forms.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                                                <FormIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                                    No forms yet
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>
                                                    Create a form to map template placeholders to input fields
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>

                {/* View Fields Dialog */}
                <Dialog
                    open={!!viewingForm}
                    onClose={() => setViewingForm(null)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { border: `1px solid ${theme.palette.divider}` } }}
                >
                    {viewingForm && (
                        <>
                            <DialogTitle
                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}
                            >
                                <Box>
                                    <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>
                                        {viewingForm.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Template: {viewingForm.template_name}
                                    </Typography>
                                </Box>
                                <IconButton onClick={() => setViewingForm(null)} size="small">
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </DialogTitle>
                            <DialogContent dividers>
                                {loadingFields ? (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <CircularProgress size={28} />
                                    </Box>
                                ) : formFields.length > 0 ? (
                                    <List dense disablePadding>
                                        {formFields.map((ff) => (
                                            <ListItem key={ff.id} sx={{ py: 1 }}>
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    <FieldIcon
                                                        sx={{ fontSize: 18, color: theme.palette.primary.main }}
                                                    />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                {ff.label}
                                                            </Typography>
                                                            <Chip
                                                                label={ff.data_type}
                                                                size="small"
                                                                sx={{
                                                                    fontSize: '0.7rem',
                                                                    height: 20,
                                                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                                    color: theme.palette.primary.main,
                                                                }}
                                                            />
                                                            {ff.required === 1 && (
                                                                <Chip
                                                                    label="Required"
                                                                    size="small"
                                                                    sx={{
                                                                        fontSize: '0.7rem',
                                                                        height: 20,
                                                                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                                                                        color: theme.palette.error.main,
                                                                    }}
                                                                />
                                                            )}
                                                        </Box>
                                                    }
                                                    secondary={
                                                        ff.placeholder_mapping
                                                            ? `Mapped to: {{${ff.placeholder_mapping}}}`
                                                            : 'No placeholder mapping'
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            No fields in this form
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

export default FormsPage;
