import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    MenuItem,
    Switch,
    FormControlLabel,
    IconButton,
    Fade,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Chip,
    useTheme,
    alpha
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    ArrowBack as BackIcon,
    Close as CloseIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import CategoryTree from './CategoryTree'; // Assuming it's in the same directory or accessible

// ─── Types ───────────────────────────────────────────────

interface FieldDraft {
    id: number;
    label: string;
    field_key?: string; // For editing existing fields
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

interface FormWizardProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editFormId?: string | null; // If present, we are in Edit mode
    initialCategoryId?: string | null;
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

const FormWizard: React.FC<FormWizardProps> = ({ open, onClose, onSuccess, editFormId, initialCategoryId }) => {
    const theme = useTheme();

    // ─── State ───────────────────────────────────────────
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Form Data
    const [formName, setFormName] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategoryId || null);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [fields, setFields] = useState<FieldDraft[]>([]);

    // Resources
    const [templates, setTemplates] = useState<TemplateRecord[]>([]);
    const [placeholders, setPlaceholders] = useState<TemplatePlaceholder[]>([]);

    // ─── Initialization ──────────────────────────────────

    // Load templates on mount
    useEffect(() => {
        if (open) {
            loadTemplates();
        }
    }, [open]);

    // Load form data if editing
    useEffect(() => {
        if (open && editFormId) {
            loadFormDetails(editFormId);
        } else if (open && !editFormId) {
            // Reset for create mode
            setStep(1);
            setFormName('');
            setSelectedCategoryId(initialCategoryId || null);
            setSelectedTemplateId('');
            setFields([]);
            setPlaceholders([]);
            setError('');
        }
    }, [open, editFormId, initialCategoryId]);

    // Load placeholders when template changes
    useEffect(() => {
        if (selectedTemplateId) {
            loadPlaceholders(selectedTemplateId);
        } else {
            setPlaceholders([]);
        }
    }, [selectedTemplateId]);

    const loadTemplates = async () => {
        try {
            const result = await window.api.getTemplates();
            setTemplates(result);
        } catch (err) {
            console.error('Failed to load templates', err);
        }
    };

    const loadPlaceholders = async (templateId: string) => {
        try {
            const result = await window.api.getTemplatePlaceholders(templateId);
            setPlaceholders(result);
        } catch (err) {
            console.error('Failed to load placeholders', err);
        }
    };

    const loadFormDetails = async (id: string) => {
        setLoading(true);
        try {
            const [form, dbFields] = await Promise.all([
                window.api.getFormById(id),
                window.api.getFormFields(id)
            ]);

            if (form) {
                setFormName(form.name);
                setSelectedCategoryId(form.category_id || null);
                setSelectedTemplateId(form.template_id);

                // Map db fields to drafts
                const draftedFields: FieldDraft[] = dbFields.map(f => ({
                    id: nextFieldId++,
                    label: f.label,
                    field_key: f.field_key,
                    data_type: f.data_type,
                    required: f.required === 1,
                    placeholder_mapping: f.placeholder_mapping || '',
                    options_csv: f.options_json ? (JSON.parse(f.options_json) as string[]).join(', ') : '',
                }));
                setFields(draftedFields);
            }
        } catch (err) {
            setError('Failed to load form details');
        } finally {
            setLoading(false);
        }
    };

    // ─── Actions ─────────────────────────────────────────

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

    const handleSave = async () => {
        setError('');
        // Validations
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
        // Unique mappings
        const mappings = fields.map((f) => f.placeholder_mapping).filter((m) => m !== '');
        const uniqueMappings = new Set(mappings);
        if (mappings.length !== uniqueMappings.size) {
            setError('Placeholder mappings must be unique across fields');
            return;
        }

        setSaving(true);
        try {
            const apiFields = fields.map((f) => ({
                label: f.label.trim(),
                field_key: f.field_key || toFieldKey(f.label),
                data_type: f.data_type,
                required: f.required,
                placeholder_mapping: f.placeholder_mapping || null,
                options_json:
                    f.data_type === 'dropdown' && f.options_csv
                        ? JSON.stringify(f.options_csv.split(',').map((o) => o.trim()).filter(Boolean))
                        : null,
            }));

            let result;
            if (editFormId) {
                result = await window.api.updateForm({
                    id: editFormId,
                    name: formName.trim(),
                    template_id: selectedTemplateId,
                    category_id: selectedCategoryId,
                    fields: apiFields
                });
            } else {
                result = await window.api.createForm({
                    name: formName.trim(),
                    template_id: selectedTemplateId,
                    category_id: selectedCategoryId,
                    fields: apiFields
                });
            }

            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'Operation failed');
            }
        } catch (err: unknown) {
            console.error('Save failed', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    // ─── Render ──────────────────────────────────────────

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editFormId ? 'Edit Form' : 'Create Form'}
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box>
                        {/* Progress Indicator */}
                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                            <Chip label="1. Details" color={step === 1 ? 'primary' : 'default'} onClick={() => setStep(1)} sx={{ mr: 1, cursor: 'pointer' }} />
                            <Chip label="2. Fields" color={step === 2 ? 'primary' : 'default'} disabled={step === 1 && !editFormId} />
                        </Box>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        {step === 1 && (
                            <Box>
                                <TextField
                                    label="Form Name"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    fullWidth required autoFocus sx={{ mb: 2.5 }}
                                />

                                <TextField
                                    select label="Template"
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                    fullWidth required sx={{ mb: 2.5 }}
                                >
                                    {templates.map((t) => (
                                        <MenuItem key={t.id} value={t.id}>{t.name} ({t.placeholder_count} placeholders)</MenuItem>
                                    ))}
                                </TextField>

                                <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>Category (Optional)</Typography>
                                <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, height: 200, overflow: 'auto', mb: 2 }}>
                                    <CategoryTree
                                        type="FORM"
                                        selectedCategoryId={selectedCategoryId}
                                        onSelectCategory={setSelectedCategoryId}
                                        readOnly
                                        refreshTrigger={0}
                                    />
                                </Box>
                            </Box>
                        )}

                        {step === 2 && (
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="subtitle1">Form Fields</Typography>
                                    <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={addField}>Add Field</Button>
                                </Box>

                                {fields.length === 0 && <Alert severity="info">Add at least one field.</Alert>}

                                {fields.map((field, index) => (
                                    <Paper key={field.id} sx={{ p: 2, mb: 1.5, border: `1px solid ${theme.palette.divider}` }} elevation={0}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Field {index + 1}</Typography>
                                            <IconButton size="small" color="error" onClick={() => removeField(field.id)}><DeleteIcon fontSize="small" /></IconButton>
                                        </Box>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, my: 1 }}>
                                            <TextField label="Label" value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)} size="small" required />
                                            <TextField select label="Type" value={field.data_type} onChange={e => updateField(field.id, 'data_type', e.target.value)} size="small">
                                                {FIELD_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                            </TextField>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                            <TextField select label="Map to Placeholder" value={field.placeholder_mapping} onChange={e => updateField(field.id, 'placeholder_mapping', e.target.value)} size="small" sx={{ flexGrow: 1 }}>
                                                <MenuItem value=""><em>None</em></MenuItem>
                                                {placeholders.map(p => <MenuItem key={p.id} value={p.placeholder_key}>{`{{${p.placeholder_key}}}`}</MenuItem>)}
                                            </TextField>
                                            <FormControlLabel control={<Switch checked={field.required} onChange={e => updateField(field.id, 'required', e.target.checked)} size="small" />} label="Required" />
                                        </Box>
                                        {field.data_type === 'dropdown' && (
                                            <TextField label="Options (comma-separated)" value={field.options_csv} onChange={e => updateField(field.id, 'options_csv', e.target.value)} size="small" fullWidth sx={{ mt: 1 }} />
                                        )}
                                    </Paper>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                {step === 2 && <Button onClick={() => setStep(1)} startIcon={<BackIcon />}>Back</Button>}
                <Box sx={{ flexGrow: 1 }} />
                <Button onClick={onClose}>Cancel</Button>
                {step === 1 ? (
                    <Button variant="contained" onClick={goToStep2} disabled={loading}>Next</Button>
                ) : (
                    <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={<SaveIcon />}>
                        {editFormId ? 'Update Form' : 'Create Form'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default FormWizard;
