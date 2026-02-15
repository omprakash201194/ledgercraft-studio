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
    TablePagination,
    TextField,
    MenuItem,
    Chip,
    CircularProgress,
    IconButton,
    Tooltip,
    Collapse
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useAuth } from '../components/AuthContext';
import { formatDate } from '../utils/dateUtils';

const ACTION_TYPES = [
    'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATE',
    'FORM_CREATE', 'FORM_DELETE',
    'TEMPLATE_UPLOAD', 'TEMPLATE_DELETE',
    'REPORT_GENERATE',
    'ITEM_MOVE'
];

interface LogRowProps {
    log: AuditLog;
    dateFormat: string;
}

const LogRow: React.FC<LogRowProps> = ({ log, dateFormat }) => {
    const [open, setOpen] = useState(false);
    const hasMetadata = log.metadata_json && log.metadata_json !== '{}';

    return (
        <>
            <TableRow hover>
                <TableCell>
                    {hasMetadata && (
                        <IconButton size="small" onClick={() => setOpen(!open)}>
                            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell>{formatDate(log.created_at, dateFormat)}</TableCell>
                <TableCell>{log.username || log.user_id}</TableCell>
                <TableCell>
                    <Chip label={log.action_type} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>{log.entity_type}</TableCell>
                <TableCell>{log.entity_id || '-'}</TableCell>
            </TableRow>
            {hasMetadata && (
                <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 1 }}>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                    {log.metadata_json}
                                </Typography>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

const AuditPage: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');

    // Pagination
    const [page, setPage] = useState(0); // MUI is 0-indexed
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filters
    const [filterAction, setFilterAction] = useState('');
    const [filterUser, setFilterUser] = useState(''); // User ID or username search? Backend expects userId. 
    // Implementing user filter might require fetching users first. For now, let's filter by Action.

    // Implementing user filter might require fetching users first. For now, let's filter by Action.

    useEffect(() => {
        if (user) {
            window.api.getUserPreferences(user.id).then(prefs => {
                if (prefs?.date_format) setDateFormat(prefs.date_format);
            });
        }
    }, [user]);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (filterAction) filters.actionType = filterAction;

            // Backend page is 1-indexed
            const result = await window.api.getAuditLogs({
                page: page + 1,
                pageSize: rowsPerPage,
                filters
            });
            setLogs(result.logs);
            setTotal(result.total);
        } catch (err) {
            console.error('Failed to load logs', err);
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, filterAction]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Audit Logs</Typography>
                <IconButton onClick={loadLogs} disabled={loading}>
                    <RefreshIcon />
                </IconButton>
            </Box>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        select
                        label="Filter by Action"
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
                        size="small"
                        sx={{ minWidth: 200 }}
                    >
                        <MenuItem value="">All Actions</MenuItem>
                        {ACTION_TYPES.map(action => (
                            <MenuItem key={action} value={action}>{action}</MenuItem>
                        ))}
                    </TextField>
                </Box>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell width={50} />
                            <TableCell>Date</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Entity Type</TableCell>
                            <TableCell>Entity ID</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">No logs found</TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <LogRow key={log.id} log={log} dateFormat={dateFormat} />
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={total}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </TableContainer>
        </Box>
    );
};

export default AuditPage;
