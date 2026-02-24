export interface BulkReportRequest {
    clientIds: string[];
    formIds: string[];
    financialYear?: string;
}

export interface BulkReportItemResult {
    clientId: string;
    clientName: string;
    formId: string;
    formName: string;
    success: boolean;
    error?: string;
    filePath?: string;
}

export interface BulkReportResult {
    success: boolean;
    total: number;
    successful: number;
    failed: number;
    reports: BulkReportItemResult[];
    error?: string;
}

export interface BulkProgressPayload {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    currentItem: {
        clientName: string;
        formName: string;
    };
    isComplete: boolean;
}
