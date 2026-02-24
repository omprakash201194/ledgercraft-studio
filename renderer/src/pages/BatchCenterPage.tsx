import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, List, ListItem, ListItemText,
    Checkbox, Button, Dialog, DialogTitle, DialogContent, LinearProgress,
    ListItemSecondaryAction, Divider, Alert
} from '@mui/material';
import { PlayArrow as PlayIcon, CheckCircle as SuccessIcon, Error as ErrorIcon, Folder as FolderIcon, Person as PersonIcon } from '@mui/icons-material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

export default function BatchCenterPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
    const [expandedItems, setExpandedItems] = useState<string[]>(['root']);

    // Progress State
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<any | null>(null);
    const [result, setResult] = useState<any | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const formsRes = await window.api.getForms(1, 100);
            setForms(formsRes.forms || []);

            const initialClients = await window.api.getAllClients();
            setClients(initialClients || []);

            const catTree = await window.api.getCategoryTree('CLIENT');
            setCategories(catTree || []);
        } catch (err) {
            console.error('Failed to load data', err);
        }
    };

    const toggleForm = (id: string) => {
        const next = new Set(selectedFormIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedFormIds(next);
    };

    const toggleClient = (id: string) => {
        const next = new Set(selectedClientIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedClientIds(next);
    };

    const handleGenerate = async () => {
        if (selectedFormIds.size === 0 || selectedClientIds.size === 0) return;

        setIsGenerating(true);
        setProgress(null);
        setResult(null);

        try {
            const req = {
                clientIds: Array.from(selectedClientIds),
                formIds: Array.from(selectedFormIds)
            };

            const finalResult = await window.api.generateBulkReports(req, (payload) => {
                setProgress(payload);
            });

            setIsGenerating(false);
            setResult(finalResult);
        } catch (err: any) {
            setIsGenerating(false);
            setResult({ success: false, error: err.message || 'Generation failed' });
        }
    };

    // Tree Helpers
    const getDescendants = (node: any): string[] => {
        return [node.id, ...(node.children || []).flatMap((c: any) => getDescendants(c))];
    };

    const getClientIdsForCategoryNode = (node: any) => {
        const catIds = getDescendants(node);
        return clients.filter(c => c.category_id && catIds.includes(c.category_id)).map(c => c.id);
    };

    const handleCategoryToggle = (node: any, checked: boolean) => {
        const catIds = getDescendants(node);
        const cIds = clients.filter(c => c.category_id && catIds.includes(c.category_id)).map(c => c.id);

        const nextClients = new Set(selectedClientIds);
        cIds.forEach(id => checked ? nextClients.add(id) : nextClients.delete(id));
        setSelectedClientIds(nextClients);

        const nextCats = new Set(selectedCategoryIds);
        catIds.forEach(id => checked ? nextCats.add(id) : nextCats.delete(id));
        setSelectedCategoryIds(nextCats);
    };

    const isCategoryChecked = (node: any) => {
        const catIds = getDescendants(node);
        const cIds = clients.filter(c => c.category_id && catIds.includes(c.category_id)).map(c => c.id);

        if (cIds.length > 0) return cIds.every(id => selectedClientIds.has(id));
        return selectedCategoryIds.has(node.id);
    };

    const isCategoryIndeterminate = (node: any) => {
        const catIds = getDescendants(node);
        const cIds = clients.filter(c => c.category_id && catIds.includes(c.category_id)).map(c => c.id);
        if (cIds.length === 0) return false;
        const checkedCount = cIds.filter(id => selectedClientIds.has(id)).length;
        return checkedCount > 0 && checkedCount < cIds.length;
    };

    const handleRootToggle = (checked: boolean) => {
        if (checked) {
            setSelectedClientIds(new Set(clients.map(c => c.id)));
            const allCats = new Set<string>();
            const traverse = (nodes: any[]) => {
                nodes.forEach(n => { allCats.add(n.id); if (n.children) traverse(n.children); });
            };
            traverse(categories);
            setSelectedCategoryIds(allCats);
        } else {
            setSelectedClientIds(new Set());
            setSelectedCategoryIds(new Set());
        }
    };

    const handleExpandAll = () => {
        const allIds = ['root'];
        const traverse = (nodes: any[]) => {
            nodes.forEach(n => {
                allIds.push(n.id);
                if (n.children && n.children.length > 0) traverse(n.children);
            });
        };
        traverse(categories);
        setExpandedItems(allIds);
    };

    const handleCollapseAll = () => {
        setExpandedItems([]);
    };

    // Find all flattened category ids to correctly map top level clients
    const getAllCategoryIds = (nodes: any[]): string[] => {
        let ids: string[] = [];
        nodes.forEach(n => {
            ids.push(n.id);
            if (n.children) ids = ids.concat(getAllCategoryIds(n.children));
        });
        return ids;
    };
    const allKnownCatIds = getAllCategoryIds(categories);
    const rootClients = clients.filter(c => !c.category_id || !allKnownCatIds.includes(c.category_id));

    const isRootChecked = () => {
        if (categories.length === 0 && rootClients.length === 0) return false;

        const allCatsChecked = categories.every(cat => isCategoryChecked(cat));
        const allRootClientsChecked = rootClients.length === 0 || rootClients.every(c => selectedClientIds.has(c.id));

        return allCatsChecked && allRootClientsChecked;
    };

    const isRootIndeterminate = () => {
        if (categories.length === 0 && rootClients.length === 0) return false;
        if (isRootChecked()) return false;

        const anyCatCheckedOrIndeterminate = categories.some(cat => isCategoryChecked(cat) || isCategoryIndeterminate(cat));
        const anyRootClientChecked = rootClients.some(c => selectedClientIds.has(c.id));

        return anyCatCheckedOrIndeterminate || anyRootClientChecked;
    };

    const renderTree = (nodes: any[]) => {
        return nodes.map((node: any) => {
            const nodeClients = clients.filter(c => c.category_id === node.id);
            const childrenNodes = node.children ? renderTree(node.children) : null;

            return (
                <TreeItem
                    key={node.id}
                    itemId={node.id}
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox
                                size="small"
                                checked={isCategoryChecked(node)}
                                indeterminate={isCategoryIndeterminate(node)}
                                onChange={(e) => handleCategoryToggle(node, e.target.checked)}
                                onClick={e => e.stopPropagation()}
                            />
                            <FolderIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                            <Typography variant="body2">{node.name}</Typography>
                        </Box>
                    }
                >
                    {childrenNodes}
                    {nodeClients.map(client => (
                        <TreeItem
                            key={client.id}
                            itemId={client.id}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Checkbox
                                        size="small"
                                        checked={selectedClientIds.has(client.id)}
                                        onChange={() => toggleClient(client.id)}
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <PersonIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />
                                    <Typography variant="body2">{client.name}</Typography>
                                </Box>
                            }
                        />
                    ))}
                </TreeItem>
            );
        });
    };

    const totalOperations = selectedFormIds.size * selectedClientIds.size;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">Batch Center</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    disabled={totalOperations === 0 || isGenerating}
                    startIcon={<PlayIcon />}
                    onClick={handleGenerate}
                >
                    Generate {totalOperations > 0 ? totalOperations : ''} Reports
                </Button>
            </Box>

            <Grid container spacing={3}>
                {/* Forms Column */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="h6">Select Forms</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {selectedFormIds.size} selected
                            </Typography>
                        </Box>
                        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                            {forms.map(form => (
                                <ListItem key={form.id} disablePadding onClick={() => toggleForm(form.id)}>
                                    <ListItemText primary={form.name} sx={{ pl: 2 }} />
                                    <ListItemSecondaryAction>
                                        <Checkbox
                                            edge="end"
                                            checked={selectedFormIds.has(form.id)}
                                            onChange={() => toggleForm(form.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Clients Tree Column */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h6">Select Clients</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selectedClientIds.size} selected
                                </Typography>
                            </Box>
                            <Box>
                                <Button size="small" onClick={handleExpandAll} sx={{ minWidth: 'auto', p: 0.5, mr: 1, fontSize: '0.75rem' }}>Expand All</Button>
                                <Button color="secondary" size="small" onClick={handleCollapseAll} sx={{ minWidth: 'auto', p: 0.5, fontSize: '0.75rem' }}>Collapse</Button>
                            </Box>
                        </Box>
                        <Box sx={{ p: 1, flexGrow: 1, overflow: 'auto' }}>
                            <SimpleTreeView
                                expandedItems={expandedItems}
                                onExpandedItemsChange={(_, itemIds) => setExpandedItems(itemIds)}
                            >
                                <TreeItem
                                    itemId="root"
                                    label={
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Checkbox
                                                size="small"
                                                checked={isRootChecked()}
                                                indeterminate={isRootIndeterminate()}
                                                onChange={(e) => handleRootToggle(e.target.checked)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <FolderIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                                            <Typography variant="body2" fontWeight="medium">All Categories</Typography>
                                        </Box>
                                    }
                                >
                                    {renderTree(categories)}
                                    {rootClients.map(client => (
                                        <TreeItem
                                            key={client.id}
                                            itemId={client.id}
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Checkbox
                                                        size="small"
                                                        checked={selectedClientIds.has(client.id)}
                                                        onChange={() => toggleClient(client.id)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <PersonIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />
                                                    <Typography variant="body2">{client.name}</Typography>
                                                </Box>
                                            }
                                        />
                                    ))}
                                </TreeItem>
                            </SimpleTreeView>
                        </Box>
                    </Paper>
                </Grid>

                {/* Preview Summary Column */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ height: 600, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                            <Typography variant="h6">Preview</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Generation Summary
                            </Typography>
                        </Box>

                        <Box sx={{ p: 3 }}>
                            <Paper sx={{ p: 4, textAlign: 'center', mb: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                                <Typography variant="h1" fontWeight="bold">
                                    {totalOperations}
                                </Typography>
                                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                                    Total Reports
                                </Typography>
                            </Paper>

                            <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                                <ListItem>
                                    <ListItemText primary="Forms Selected" primaryTypographyProps={{ color: 'text.secondary' }} />
                                    <Typography variant="h6">{selectedFormIds.size}</Typography>
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText primary="Clients Selected" primaryTypographyProps={{ color: 'text.secondary' }} />
                                    <Typography variant="h6">{selectedClientIds.size}</Typography>
                                </ListItem>
                            </List>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Progress Modal */}
            <Dialog open={isGenerating} disableEscapeKeyDown fullWidth maxWidth="sm">
                <DialogTitle>Generating Bulk Reports</DialogTitle>
                <DialogContent>
                    {progress ? (
                        <Box sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">
                                    Progress: {progress.completed} / {progress.total}
                                </Typography>
                                <Typography variant="body2" color="success.main">
                                    Success: {progress.successful} | Failed: {progress.failed}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={(progress.completed / progress.total) * 100}
                                sx={{ height: 10, borderRadius: 5 }}
                            />
                            <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                                Currently processing: {progress.currentItem.clientName} - {progress.currentItem.formName}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography>Preparing batch generation...</Typography>
                    )}
                </DialogContent>
            </Dialog>

            {/* Result Modal */}
            <Dialog open={!!result} onClose={() => setResult(null)} fullWidth maxWidth="md" scroll="paper">
                <DialogTitle>
                    Bulk Generation Summary
                </DialogTitle>
                <DialogContent dividers>
                    {result?.error ? (
                        <Alert severity="error">{result.error}</Alert>
                    ) : (
                        <Box>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={4}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                                        <Typography variant="h3">{result?.total}</Typography>
                                        <Typography>Total Attempted</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={4}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                                        <Typography variant="h3">{result?.successful}</Typography>
                                        <Typography>Successful</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={4}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: result?.failed > 0 ? 'error.light' : 'background.paper', color: result?.failed > 0 ? 'error.contrastText' : 'text.primary' }}>
                                        <Typography variant="h3">{result?.failed}</Typography>
                                        <Typography>Failed</Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            <Typography variant="h6" gutterBottom>Detailed Results</Typography>
                            <List dense>
                                {result?.reports?.map((r: any, idx: number) => (
                                    <React.Fragment key={idx}>
                                        <ListItem>
                                            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                                                {r.success ? <SuccessIcon color="success" /> : <ErrorIcon color="error" />}
                                            </Box>
                                            <ListItemText
                                                primary={`${r.clientName} - ${r.formName}`}
                                                secondary={r.success ? r.filePath : r.error}
                                                secondaryTypographyProps={{
                                                    color: r.success ? 'text.secondary' : 'error.main',
                                                    sx: { wordBreak: 'break-all' }
                                                }}
                                            />
                                        </ListItem>
                                        {idx < result.reports.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </Box>
                    )}
                </DialogContent>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={() => setResult(null)} variant="contained">Close</Button>
                </Box>
            </Dialog>
        </Box>
    );
}
