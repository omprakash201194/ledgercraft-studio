import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    MenuItem,
    Checkbox,
    FormControlLabel,
    InputAdornment,
    Fade,
    Alert,
    CircularProgress,
    Snackbar,
    useTheme,
    alpha,
    Chip,
} from '@mui/material';
import {
    Description as ReportIcon,
    OpenInNew as OpenIcon,
} from '@mui/icons-material';

// ─── Types (local mirrors of window.api types) ──────────

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

const GenerateReportPage: React.FC = () => {
    const theme = useTheme();

    const [forms, setForms] = useState<FormRecord[]>([]);
    const [selectedFormId, setSelectedFormId] = useState('');
    const [fields, setFields] = useState<FormFieldRecord[]>([]);
    const [values, setValues] = useState<Record<string, string | number | boolean>>({});
    const [loading, setLoading] = useState(true);
    const [loadingFields, setLoadingFields] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; filePath?: string }>({
        open: false,
        message: '',
    });

    // ─── Load Forms ──────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const result = await window.api.getForms();
                setForms(result);
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ─── Load Fields when Form Selected ─────────────────
    const loadFields = useCallback(async (formId: string) => {
        if (!formId) {
            setFields([]);
            setValues({});
            return;
        }
        setLoadingFields(true);
        try {
            const result = await window.api.getFormFields(formId);
            setFields(result);
            // Initialize values
            const initial: Record<string, string | number | boolean> = {};
            for (const f of result) {
                if (f.data_type === 'checkbox') {
                    initial[f.field_key] = false;
                } else if (f.data_type === 'number' || f.data_type === 'currency') {
                    initial[f.field_key] = '';
                } else {
                    initial[f.field_key] = '';
                }
            }
            setValues(initial);
        } catch {
            setFields([]);
        } finally {
            setLoadingFields(false);
        }
    }, []);

    useEffect(() => {
        if (selectedFormId) {
            loadFields(selectedFormId);
        }
    }, [selectedFormId, loadFields]);

    const updateValue = (key: string, val: string | number | boolean) => {
        setValues((prev) => ({ ...prev, [key]: val }));
    };

    // ─── Generate Report ─────────────────────────────────
    const handleGenerate = async () => {
        setError('');

        // Validate required fields
        for (const f of fields) {
            if (f.required === 1) {
                const val = values[f.field_key];
                if (val === '' || val === undefined || val === null) {
                    setError(`"${f.label}" is required`);
                    return;
                }
            }
        }

        setGenerating(true);
        try {
            const result = await window.api.generateReport({
                form_id: selectedFormId,
                values,
            });

            if (result.success && result.report) {
                setSnackbar({
                    open: true,
                    message: 'Report generated successfully!',
                    filePath: result.report.file_path,
                });
                // Reset values
                const reset: Record<string, string | number | boolean> = {};
                for (const f of fields) {
                    reset[f.field_key] = f.data_type === 'checkbox' ? false : '';
                }
                setValues(reset);
            } else {
                setError(result.error || 'Failed to generate report');
            }
        } catch {
            setError('Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    const handleOpenFile = async (filePath: string) => {
        await window.api.openFile(filePath);
    };

    // ─── Render Field ────────────────────────────────────
    const renderField = (field: FormFieldRecord) => {
        const val = values[field.field_key];
        const isRequired = field.required === 1;

        switch (field.data_type) {
            case 'text':
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        value={val ?? ''}
                        onChange={(e) => updateValue(field.field_key, e.target.value)}
                        fullWidth
                        required={isRequired}
                        sx={{ mb: 2 }}
                    />
                );
            case 'number':
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        value={val ?? ''}
                        onChange={(e) => updateValue(field.field_key, e.target.value)}
                        type="number"
                        fullWidth
                        required={isRequired}
                        sx={{ mb: 2 }}
                    />
                );
            case 'date':
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        value={val ?? ''}
                        onChange={(e) => updateValue(field.field_key, e.target.value)}
                        type="date"
                        fullWidth
                        required={isRequired}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2 }}
                    />
                );
            case 'currency':
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        value={val ?? ''}
                        onChange={(e) => updateValue(field.field_key, e.target.value)}
                        type="number"
                        fullWidth
                        required={isRequired}
                        InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        sx={{ mb: 2 }}
                    />
                );
            case 'dropdown': {
                let options: string[] = [];
                try {
                    if (field.options_json) {
                        options = JSON.parse(field.options_json);
                    }
                } catch {
                    // ignore
                }
                return (
                    <TextField
                        key={field.id}
                        select
                        label={field.label}
                        value={val ?? ''}
                        onChange={(e) => updateValue(field.field_key, e.target.value)}
                        fullWidth
                        required={isRequired}
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">
                            <em>Select...</em>
                        </MenuItem>
                        {options.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                                {opt}
                            </MenuItem>
                        ))}
                    </TextField>
                );
            }
            case 'checkbox':
                return (
                    <FormControlLabel
                        key={field.id}
                        control={
                            <Checkbox
                                checked={!!val}
                                onChange={(e) => updateValue(field.field_key, e.target.checked)}
                            />
                        }
                        label={field.label}
                        sx={{ mb: 2, display: 'block' }}
                    />
                );
            case 'multiline':
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        value={val ?? ''}
                        onChange={(e) => updateValue(field.field_key, e.target.value)}
                        multiline
                        minRows={3}
                        fullWidth
                        required={isRequired}
                        sx={{ mb: 2 }}
                    />
                );
            default:
                return (
                    <TextField
                        key={field.id}
                        label={field.label}
                        value={val ?? ''}
                        onChange={(e) => updateValue(field.field_key, e.target.value)}
                        fullWidth
                        required={isRequired}
                        sx={{ mb: 2 }}
                    />
                );
        }
    };

    return (
        <Fade in timeout={500}>
            <Box sx={{ maxWidth: 700, mx: 'auto' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <ReportIcon sx={{ fontSize: 28, color: theme.palette.primary.main }} />
                    <Typography variant="h5">Generate Report</Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {/* Form Selection */}
                <Paper elevation={0} sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        Select Form
                    </Typography>
                    {loading ? (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : (
                        <TextField
                            select
                            label="Form"
                            value={selectedFormId}
                            onChange={(e) => setSelectedFormId(e.target.value)}
                            fullWidth
                            helperText={forms.length === 0 ? 'No forms available. Create a form first.' : undefined}
                        >
                            <MenuItem value="">
                                <em>Select a form...</em>
                            </MenuItem>
                            {forms.map((f) => (
                                <MenuItem key={f.id} value={f.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {f.name}
                                        <Chip
                                            label={f.template_name}
                                            size="small"
                                            sx={{
                                                fontSize: '0.7rem',
                                                height: 20,
                                                backgroundColor: alpha(theme.palette.info.main, 0.1),
                                                color: theme.palette.info.main,
                                            }}
                                        />
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                </Paper>

                {/* Dynamic Fields */}
                {selectedFormId && (
                    <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                            Fill In Fields
                        </Typography>
                        {loadingFields ? (
                            <Box sx={{ textAlign: 'center', py: 3 }}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : fields.length > 0 ? (
                            <>
                                {fields.map(renderField)}
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        size="large"
                                        sx={{
                                            px: 4,
                                            background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #6A3DE8 0%, #3D7CE8 100%)',
                                            },
                                        }}
                                    >
                                        {generating ? (
                                            <CircularProgress size={22} color="inherit" />
                                        ) : (
                                            'Generate Report'
                                        )}
                                    </Button>
                                </Box>
                            </>
                        ) : (
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                                This form has no fields.
                            </Typography>
                        )}
                    </Paper>
                )}

                {/* Success Snackbar */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={10000}
                    onClose={() => setSnackbar({ open: false, message: '' })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        onClose={() => setSnackbar({ open: false, message: '' })}
                        severity="success"
                        sx={{ width: '100%', borderRadius: 2 }}
                        action={
                            snackbar.filePath ? (
                                <Button
                                    color="inherit"
                                    size="small"
                                    startIcon={<OpenIcon />}
                                    onClick={() => handleOpenFile(snackbar.filePath!)}
                                >
                                    Open File
                                </Button>
                            ) : undefined
                        }
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Fade>
    );
};

export default GenerateReportPage;
