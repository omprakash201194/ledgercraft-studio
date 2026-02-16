import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
    Grid,
    IconButton,
    InputBase,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Breadcrumbs,
    Link,
    Divider
} from '@mui/material';
import {
    Description as ReportIcon,
    OpenInNew as OpenIcon,
    Search as SearchIcon,
    History as HistoryIcon,
    Folder as FolderIcon,
    InsertDriveFile as FormIcon,
    ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

// ─── Types (local mirrors of window.api types) ──────────

interface FormRecord {
    id: string;
    name: string;
    template_id: string;
    template_name: string;
    field_count: number;
    created_at: string;
    usage_count?: number;
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

interface HierarchyNode {
    id: string;
    name: string;
    parent_id: string | null;
    type: 'CATEGORY' | 'FORM';
    children?: HierarchyNode[];
}

const GenerateReportPage: React.FC = () => {
    const theme = useTheme();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialReportId = queryParams.get('reportId');
    const initialFormId = queryParams.get('formId');


    const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
    const [flatItems, setFlatItems] = useState<HierarchyNode[]>([]);
    const [recentForms, setRecentForms] = useState<FormRecord[]>([]);

    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
    const [selectedFormName, setSelectedFormName] = useState('');
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


    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    // Helper to build tree from flat list
    const buildTree = (items: HierarchyNode[]) => {
        const itemMap = new Map<string, HierarchyNode>();
        const roots: HierarchyNode[] = [];

        // Create copies
        items.forEach(item => {
            itemMap.set(item.id, { ...item, children: [] });
        });

        items.forEach(item => {
            const node = itemMap.get(item.id)!;
            if (item.parent_id && itemMap.has(item.parent_id)) {
                itemMap.get(item.parent_id)!.children!.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    };

    // ─── Load Data ──────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load hierarchy
            const rawHierarchy = await window.api.getFormsWithHierarchy();
            setFlatItems(rawHierarchy);

            // Build tree
            const tree = buildTree(rawHierarchy);
            setHierarchy(tree);

            // Load recent
            const recent = await window.api.getRecentForms(5);
            setRecentForms(recent);

            // Handle Regeneration / Pre-selection
            if (initialReportId) {
                const report = await window.api.getReportById(initialReportId);
                if (report) {
                    setSelectedFormId(report.form_id);
                    // Fetch fields for this form
                    const formFields = await window.api.getFormFields(report.form_id);
                    setFields(formFields);

                    // Pre-fill values
                    if (report.input_values) {
                        try {
                            setValues(JSON.parse(report.input_values));
                            setSnackbar({ open: true, message: 'Values pre-filled from report', filePath: report.file_path });
                        } catch (e) {
                            console.error('Failed to parse input values', e);
                        }
                    }

                    // Also get form name for display
                    const formItem = rawHierarchy.find(i => i.id === report.form_id);
                    if (formItem) setSelectedFormName(formItem.name);
                }
            } else if (initialFormId) {
                const formItem = rawHierarchy.find(i => i.id === initialFormId);
                if (formItem) {
                    setSelectedFormId(initialFormId);
                    setSelectedFormName(formItem.name);
                    const items = await window.api.getFormFields(initialFormId);
                    setFields(items);

                    // Init empty values
                    const initial: Record<string, string | number | boolean> = {};
                    for (const f of items) {
                        if (f.data_type === 'checkbox') {
                            initial[f.field_key] = false;
                        } else {
                            initial[f.field_key] = '';
                        }
                    }
                    setValues(initial);
                }
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [initialReportId, initialFormId]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    // ─── Filter Tree ─────────────────────────────────────
    const filteredHierarchy = useMemo(() => {
        if (!searchQuery.trim()) return hierarchy;

        const lowerQuery = searchQuery.toLowerCase();

        const filterNode = (node: HierarchyNode): HierarchyNode | null => {
            const matches = node.name.toLowerCase().includes(lowerQuery);

            if (node.type === 'FORM' && matches) return node;

            if (node.children) {
                const filteredChildren = node.children
                    .map(filterNode)
                    .filter((n): n is HierarchyNode => n !== null);

                if (filteredChildren.length > 0) {
                    return { ...node, children: filteredChildren };
                }
            }

            if (matches) return node;

            return null;
        };

        return hierarchy.map(filterNode).filter((n): n is HierarchyNode => n !== null);
    }, [hierarchy, searchQuery]);

    // Auto-expand when searching
    useEffect(() => {
        if (searchQuery.trim()) {
            const allIds: string[] = [];
            const collectIds = (nodes: HierarchyNode[]) => {
                for (const node of nodes) {
                    allIds.push(node.id);
                    if (node.children) collectIds(node.children);
                }
            };
            collectIds(filteredHierarchy);
            setExpandedItems(allIds);
        } else {
            setExpandedItems([]);
        }
    }, [searchQuery, filteredHierarchy]);

    // ─── Load Fields when Form Selected ─────────────────
    const handleSelectForm = useCallback(async (formId: string) => {
        // Find form name
        const form = flatItems.find(i => i.id === formId);
        if (form && form.type === 'FORM') {
            setSelectedFormId(formId);
            setSelectedFormName(form.name);
            setLoadingFields(true);
            try {
                const result = await window.api.getFormFields(formId);
                setFields(result);
                // Initialize values
                const initial: Record<string, string | number | boolean> = {};
                for (const f of result) {
                    if (f.data_type === 'checkbox') {
                        initial[f.field_key] = false;
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
        }
    }, [flatItems]);

    const updateValue = (key: string, val: string | number | boolean) => {
        setValues((prev) => ({ ...prev, [key]: val }));
    };

    // ─── Generate Report ─────────────────────────────────
    const handleGenerate = async () => {
        if (!selectedFormId) return;
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
                // Reload recent forms
                const recent = await window.api.getRecentForms(5);
                setRecentForms(recent);

                // Reset values -- OR NOT? Maybe user wants to generate another one?
                // Requirements say: "of required the user can alter any form field from here directly to generate a new report with the old values and the updated values."
                // So maybe DON'T reset values? Or maybe keep them?
                // Usually wizards reset, but here it's "Generate" button.
                // I will keep values to resolve "can alter... to generate a new report".

                // const reset: Record<string, string | number | boolean> = {};
                // for (const f of fields) {
                //     reset[f.field_key] = f.data_type === 'checkbox' ? false : '';
                // }
                // setValues(reset);
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

    // ─── Render Components ───────────────────────────────

    // Recursive Tree Item Renderer
    const renderTree = (node: HierarchyNode) => (
        <TreeItem
            key={node.id}
            itemId={node.id}
            label={
                <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5, pr: 1 }}>
                    {node.type === 'CATEGORY' ? (
                        <FolderIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                    ) : (
                        <FormIcon sx={{ mr: 1, fontSize: 18, color: theme.palette.primary.main }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: node.type === 'CATEGORY' ? 600 : 400 }}>
                        {node.name}
                    </Typography>
                </Box>
            }
            onClick={(e) => {
                if (node.type === 'FORM') {
                    e.stopPropagation();
                    handleSelectForm(node.id);
                }
            }}
            sx={{
                '& .MuiTreeItem-content': {
                    borderRadius: 1,
                    mb: 0.5,
                    px: 1,
                },
                '& .MuiTreeItem-groupTransition': {
                    ml: 1.5,
                    pl: 1,
                    borderLeft: `1px solid ${theme.palette.divider}`,
                }
            }}
        >
            {Array.isArray(node.children) ? node.children.map((child) => renderTree(child)) : null}
        </TreeItem>
    );

    // Render Field
    const renderField = (field: FormFieldRecord) => {
        const val = values[field.field_key];
        const isRequired = field.required === 1;

        switch (field.data_type) {
            case 'text':
                return <TextField key={field.id} label={field.label} value={val ?? ''} onChange={(e) => updateValue(field.field_key, e.target.value)} fullWidth required={isRequired} sx={{ mb: 2 }} />;
            case 'number':
                return <TextField key={field.id} label={field.label} value={val ?? ''} onChange={(e) => updateValue(field.field_key, e.target.value)} type="number" fullWidth required={isRequired} sx={{ mb: 2 }} />;
            case 'date':
                return <TextField key={field.id} label={field.label} value={val ?? ''} onChange={(e) => updateValue(field.field_key, e.target.value)} type="date" fullWidth required={isRequired} InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />;
            case 'currency':
                return <TextField key={field.id} label={field.label} value={val ?? ''} onChange={(e) => updateValue(field.field_key, e.target.value)} type="number" fullWidth required={isRequired} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} sx={{ mb: 2 }} />;
            case 'dropdown': {
                let options: string[] = [];
                try { if (field.options_json) options = JSON.parse(field.options_json); } catch { }
                return (
                    <TextField key={field.id} select label={field.label} value={val ?? ''} onChange={(e) => updateValue(field.field_key, e.target.value)} fullWidth required={isRequired} sx={{ mb: 2 }}>
                        <MenuItem value=""><em>Select...</em></MenuItem>
                        {options.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                );
            }
            case 'checkbox':
                return <FormControlLabel key={field.id} control={<Checkbox checked={!!val} onChange={(e) => updateValue(field.field_key, e.target.checked)} />} label={field.label} sx={{ mb: 2, display: 'block' }} />;
            case 'multiline':
                return <TextField key={field.id} label={field.label} value={val ?? ''} onChange={(e) => updateValue(field.field_key, e.target.value)} multiline minRows={3} fullWidth required={isRequired} sx={{ mb: 2 }} />;
            default:
                return <TextField key={field.id} label={field.label} value={val ?? ''} onChange={(e) => updateValue(field.field_key, e.target.value)} fullWidth required={isRequired} sx={{ mb: 2 }} />;
        }
    };

    return (
        <Fade in timeout={500}>
            <Box sx={{ flexGrow: 1, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <ReportIcon sx={{ fontSize: 28, color: theme.palette.primary.main }} />
                    <Typography variant="h5">Generate Report</Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={3} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    {/* Left Pane: Search & Selection */}
                    <Grid item xs={12} md={4} sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <Paper elevation={0} sx={{ height: '100%', border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column' }}>
                            {/* Search */}
                            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: '2px 4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        bgcolor: theme.palette.action.hover,
                                        border: `1px solid ${theme.palette.divider}`,
                                    }}
                                >
                                    <IconButton sx={{ p: '10px' }} aria-label="search">
                                        <SearchIcon />
                                    </IconButton>
                                    <InputBase
                                        sx={{ ml: 1, flex: 1 }}
                                        placeholder="Search forms..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </Paper>
                            </Box>

                            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                                {/* Recent Forms */}
                                {recentForms.length > 0 && !searchQuery && (
                                    <Box>
                                        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                            <HistoryIcon fontSize="small" color="primary" />
                                            <Typography variant="subtitle2" color="primary" fontWeight={600}>
                                                Recently Used
                                            </Typography>
                                        </Box>
                                        <List dense>
                                            {recentForms.map(form => (
                                                <ListItemButton key={form.id} onClick={() => handleSelectForm(form.id)} selected={selectedFormId === form.id}>
                                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                                        <FormIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={form.name}
                                                        secondary={form.template_name}
                                                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                                    />
                                                </ListItemButton>
                                            ))}
                                        </List>
                                        <Divider />
                                    </Box>
                                )}

                                {/* Tree View */}
                                <Box sx={{ p: 2 }}>
                                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                                        All Forms
                                    </Typography>
                                    {loading ? (
                                        <CircularProgress size={20} sx={{ display: 'block', mt: 2 }} />
                                    ) : (
                                        <SimpleTreeView
                                            slots={{ expandIcon: ChevronRightIcon, collapseIcon: ExpandMoreIcon }}
                                            expandedItems={expandedItems}
                                            onExpandedItemsChange={(_, itemIds) => setExpandedItems(itemIds)}
                                        >
                                            {filteredHierarchy.map(node => renderTree(node))}
                                        </SimpleTreeView>
                                    )}
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Right Pane: Form Fields */}
                    <Grid item xs={12} md={8} sx={{ height: '100%', overflow: 'hidden' }}>
                        <Paper elevation={0} sx={{ height: '100%', border: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', p: 3, overflowY: 'auto' }}>
                            {selectedFormId ? (
                                <>
                                    <Box sx={{ mb: 3 }}>
                                        <Breadcrumbs maxItems={3}>
                                            <Typography color="inherit">Forms</Typography>
                                            <Typography color="text.primary" fontWeight={600}>{selectedFormName}</Typography>
                                        </Breadcrumbs>
                                        <Box sx={{ mt: 1 }}>
                                            <Typography variant="h5" gutterBottom>{selectedFormName}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Please fill in the required fields below to generate the report.
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ mb: 3 }} />

                                    {loadingFields ? (
                                        <Box sx={{ textAlign: 'center', py: 5 }}>
                                            <CircularProgress />
                                        </Box>
                                    ) : fields.length > 0 ? (
                                        <Box sx={{ maxWidth: 600 }}>
                                            {fields.map(renderField)}
                                            <Box sx={{ mt: 4 }}>
                                                <Button
                                                    variant="contained"
                                                    onClick={handleGenerate}
                                                    disabled={generating}
                                                    size="large"
                                                    startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <ReportIcon />}
                                                    sx={{
                                                        px: 4,
                                                        py: 1.5,
                                                        background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
                                                        boxShadow: '0 4px 12px rgba(124,77,255,0.3)',
                                                    }}
                                                >
                                                    {generating ? 'Generating...' : 'Generate Report'}
                                                </Button>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Alert severity="info">This form has no fields defined.</Alert>
                                    )}
                                </>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                                    <FormIcon sx={{ fontSize: 64, mb: 2, opacity: 0.2 }} />
                                    <Typography variant="h6">No Form Selected</Typography>
                                    <Typography variant="body2">Select a form from the list on the left to start.</Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>

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
                                <Button color="inherit" size="small" startIcon={<OpenIcon />} onClick={() => handleOpenFile(snackbar.filePath!)}>
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
