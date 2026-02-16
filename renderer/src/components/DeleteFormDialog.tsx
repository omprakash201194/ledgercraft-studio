import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Link,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Typography,
    Box
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// ...

interface DeleteFormDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (deleteReports: boolean) => void;
    reportCount: number | null; // null means loading or not checked yet
    formName: string;
    formId: string;
}

const DeleteFormDialog: React.FC<DeleteFormDialogProps> = ({
    open,
    onClose,
    onConfirm,
    reportCount,
    formName,
    formId
}) => {
    const hasReports = reportCount !== null && reportCount > 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {hasReports ? 'Delete or Archive Form?' : 'Delete Form?'}
            </DialogTitle>
            <DialogContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <WarningAmberIcon color="warning" fontSize="large" />
                    <Typography variant="h6" component="span">
                        {formName}
                    </Typography>
                </Box>

                {hasReports ? (
                    <DialogContentText>
                        This form has <strong>{reportCount} existing report(s)</strong>.
                        {' '}
                        <Link
                            component={RouterLink}
                            to={`/reports?formId=${formId}`}
                            onClick={onClose}
                            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            View Reports
                        </Link>
                        <br /><br />
                        <strong>Archive (Recommended):</strong> Hides the form from the list but keeps it in the database so existing reports remain accessible.
                        <br /><br />
                        <strong>Delete All:</strong> Permanently deletes the form AND all associated reports. <span style={{ color: 'red' }}>This cannot be undone.</span>
                    </DialogContentText>
                ) : (
                    <DialogContentText>
                        Are you sure you want to delete this form? This action cannot be undone.
                    </DialogContentText>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                {hasReports ? (
                    <>
                        <Button
                            onClick={() => onConfirm(true)}
                            color="error"
                            variant="outlined"
                        >
                            Delete All
                        </Button>
                        <Button
                            onClick={() => onConfirm(false)}
                            color="primary"
                            variant="contained"
                            autoFocus
                        >
                            Archive
                        </Button>
                    </>
                ) : (
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => onConfirm(true)}
                    >
                        Delete
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default DeleteFormDialog;
