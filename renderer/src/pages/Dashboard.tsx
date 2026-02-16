import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    CardActionArea,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Fade,
    useTheme,
    alpha,
    Button
} from '@mui/material';
import {
    Description as TemplatesIcon,
    DynamicForm as FormsIcon,
    Summarize as GenerateReportIcon,
    DescriptionOutlined as ReportIcon,
    RocketLaunch as RocketIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [recentReports, setRecentReports] = useState<any[]>([]);

    useEffect(() => {
        // Fetch recent reports (limit 5)
        window.api.getReports(1, 5).then(result => {
            setRecentReports(result.reports);
        }).catch(() => { });
    }, []);

    const actions = [
        {
            label: 'Manage Templates',
            icon: <TemplatesIcon fontSize="large" />,
            path: '/templates',
            color: theme.palette.primary.main,
            desc: 'Create and manage document templates'
        },
        {
            label: 'Manage Forms',
            icon: <FormsIcon fontSize="large" />,
            path: '/forms',
            color: theme.palette.secondary.main,
            desc: 'Configure data entry forms'
        },
        {
            label: 'Generate Report',
            icon: <GenerateReportIcon fontSize="large" />,
            path: '/generate-report',
            color: theme.palette.success.main,
            desc: 'Generate documents from templates'
        }
    ];

    return (
        <Fade in timeout={500}>
            <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>

                {/* Welcome Hero */}
                <Box sx={{ textAlign: 'center', mb: 8, mt: 4 }}>
                    <Box
                        sx={{
                            display: 'inline-flex',
                            p: 2,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            mb: 3
                        }}
                    >
                        <RocketIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                    </Box>
                    <Typography variant="h3" fontWeight="bold" gutterBottom>
                        LedgerCraft Studio
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                        Offline Document Automation for CA Firms
                    </Typography>
                </Box>

                {/* Action Cards */}
                <Grid container spacing={3} sx={{ mb: 8 }}>
                    {actions.map((action) => (
                        <Grid item xs={12} md={4} key={action.label}>
                            <Card
                                elevation={0}
                                sx={{
                                    height: '100%',
                                    border: `1px solid ${theme.palette.divider}`,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: theme.shadows[4],
                                        borderColor: action.color
                                    }
                                }}
                            >
                                <CardActionArea
                                    onClick={() => navigate(action.path)}
                                    sx={{ height: '100%', p: 2 }}
                                >
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <Box sx={{ color: action.color, mb: 2 }}>
                                            {action.icon}
                                        </Box>
                                        <Typography variant="h6" gutterBottom>
                                            {action.label}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {action.desc}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Recent Reports */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Typography variant="h5" fontWeight="600">
                            Recent Reports
                        </Typography>
                        <Button
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate('/reports')}
                        >
                            View All
                        </Button>
                    </Box>

                    <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                    <TableRow>
                                        <TableCell>Report Name</TableCell>
                                        <TableCell>Form</TableCell>
                                        <TableCell>Generated By</TableCell>
                                        <TableCell align="right">Date</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recentReports.length > 0 ? (
                                        recentReports.map((report) => (
                                            <TableRow
                                                key={report.id}
                                                hover
                                                sx={{ cursor: 'pointer' }}
                                                onClick={() => navigate('/reports')}
                                            >
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <ReportIcon color="action" fontSize="small" />
                                                        <Typography variant="body2" fontWeight="500">
                                                            {report.file_path.split(/[\\/]/).pop()}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={report.form_name}
                                                        size="small"
                                                        sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {report.generated_by_username}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" color="text.secondary">
                                                        {new Date(report.generated_at).toLocaleDateString()}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">No reports generated yet</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            </Box>
        </Fade>
    );
};

export default Dashboard;
