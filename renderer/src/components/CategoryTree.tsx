import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    styled,
    alpha,
    useTheme,
    Tooltip,
} from '@mui/material';
import {
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    MoreVert as MoreIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

// ─── Types ───────────────────────────────────────────────

interface CategoryNode {
    id: string;
    name: string;
    parent_id: string | null;
    type: 'TEMPLATE' | 'FORM';
    children: CategoryNode[];
}

interface CategoryTreeProps {
    type: 'TEMPLATE' | 'FORM';
    selectedCategoryId: string | null;
    onSelectCategory: (categoryId: string | null) => void;
    refreshTrigger: number;
    readOnly?: boolean;
    onDataChange?: () => void;
}

// ─── Styled Components ───────────────────────────────────

const TreeContainer = styled(Paper)(({ theme }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${theme.palette.divider}`,
    borderRadius: 0,
    backgroundColor: theme.palette.background.default,
}));

const Header = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
}));

// ─── Component ───────────────────────────────────────────

const CategoryTree: React.FC<CategoryTreeProps> = ({
    type,
    selectedCategoryId,
    onSelectCategory,
    refreshTrigger,
    readOnly = false,
    onDataChange
}) => {
    const theme = useTheme();
    const [tree, setTree] = useState<CategoryNode[]>([]);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [categoryName, setCategoryName] = useState('');
    const [targetCategory, setTargetCategory] = useState<CategoryNode | null>(null);

    // Context Menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuTarget, setMenuTarget] = useState<CategoryNode | null>(null);

    const loadTree = async () => {
        try {
            const data = await window.api.getCategoryTree(type);
            setTree(data);
        } catch (err) {
            console.error('Failed to load category tree', err);
        }
    };

    useEffect(() => {
        loadTree();
    }, [type, refreshTrigger]);

    // ─── Handlers ────────────────────────────────────────

    const handleMenuOpen = (event: React.MouseEvent, node: CategoryNode) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget as HTMLElement);
        setMenuTarget(node);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuTarget(null);
    };

    const handleCreateRoot = () => {
        setTargetCategory(null);
        setCategoryName('');
        setCreateDialogOpen(true);
    };

    const handleCreateSub = () => {
        if (!menuTarget) return;
        setTargetCategory(menuTarget);
        setCategoryName('');
        setCreateDialogOpen(true);
        handleMenuClose();
    };

    const handleRenameStart = () => {
        if (!menuTarget) return;
        setTargetCategory(menuTarget);
        setCategoryName(menuTarget.name);
        setRenameDialogOpen(true);
        handleMenuClose();
    };

    const handleDelete = async () => {
        if (!menuTarget) return;
        if (!confirm(`Are you sure you want to delete category "${menuTarget.name}"?`)) {
            handleMenuClose();
            return;
        }

        const result = await window.api.deleteCategory(menuTarget.id, type);
        if (result.success) {
            if (selectedCategoryId === menuTarget.id) {
                onSelectCategory(null);
            }
            loadTree();
            if (onDataChange) onDataChange();
        } else {
            alert(result.error);
        }
        handleMenuClose();
    };

    const submitCreate = async () => {
        const result = await window.api.createCategory({
            name: categoryName,
            parentId: targetCategory ? targetCategory.id : null,
            type,
        });

        if (result.success) {
            setCreateDialogOpen(false);
            loadTree();
            if (targetCategory) {
                setExpandedIds((prev) => [...prev, targetCategory.id]);
            }
            if (onDataChange) onDataChange();
        } else {
            alert(result.error);
        }
    };

    const submitRename = async () => {
        if (!targetCategory) return;

        const result = await window.api.renameCategory(targetCategory.id, categoryName);
        if (result.success) {
            setRenameDialogOpen(false);
            loadTree();
            if (onDataChange) onDataChange();
        } else {
            alert(result.error);
        }
    };

    const renderTree = (nodes: CategoryNode[]) => {
        return nodes.map((node) => (
            <TreeItem
                key={node.id}
                itemId={node.id}
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {node.name}
                        </Typography>
                        {!readOnly && (
                            <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, node)}
                                sx={{
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                    '.MuiTreeItem-content:hover &': { opacity: 1 },
                                }}
                            >
                                <MoreIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Box>
                }
            >
                {Array.isArray(node.children) ? renderTree(node.children) : null}
            </TreeItem>
        ));
    };

    return (
        <TreeContainer elevation={0}>
            {!readOnly && (
                <Header>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Categories
                    </Typography>
                    <Tooltip title="Create Root Category">
                        <IconButton size="small" onClick={handleCreateRoot}>
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Header>
            )}
            <Box sx={{ p: 1, flexGrow: 1, overflowY: 'auto' }}>
                <SimpleTreeView
                    expandedItems={expandedIds}
                    onExpandedItemsChange={(event, itemIds) => setExpandedIds(itemIds)}
                    selectedItems={(selectedCategoryId === null || selectedCategoryId === undefined) ? 'root' : selectedCategoryId}
                    onSelectedItemsChange={(event, itemId) => onSelectCategory(itemId === 'root' ? null : itemId)}
                >
                    <TreeItem
                        itemId="root"
                        label="All Items"
                        sx={{
                            '& .MuiTreeItem-content': {
                                py: 1,
                                px: 1,
                                borderRadius: 1,
                                '&.Mui-selected': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                },
                            },
                        }}
                    />
                    {renderTree(tree)}
                </SimpleTreeView>
            </Box>

            {/* Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleCreateSub}>
                    <ListItemIcon>
                        <AddIcon fontSize="small" />
                    </ListItemIcon>
                    Add Subcategory
                </MenuItem>
                <MenuItem onClick={handleRenameStart}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    Rename
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    Delete
                </MenuItem>
            </Menu>

            {/* Dialogs */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    {targetCategory ? `Add Subcategory to "${targetCategory.name}"` : 'Create Root Category'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Category Name"
                        fullWidth
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={submitCreate} variant="contained" disabled={!categoryName.trim()}>Create</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Rename Category</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="New Name"
                        fullWidth
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
                    <Button onClick={submitRename} variant="contained" disabled={!categoryName.trim()}>Save</Button>
                </DialogActions>
            </Dialog>
        </TreeContainer>
    );
};

export default CategoryTree;
