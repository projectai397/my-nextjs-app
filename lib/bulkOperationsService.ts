/**
 * Advanced Bulk Operations Service
 * Handle bulk user management operations
 */

export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  failureCount: number;
  errors: BulkOperationError[];
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  metadata?: Record<string, any>;
}

export type BulkOperationType =
  | 'import_users'
  | 'update_status'
  | 'adjust_credits'
  | 'update_permissions'
  | 'send_email'
  | 'send_sms'
  | 'reset_passwords'
  | 'delete_users';

export interface BulkOperationError {
  row: number;
  field?: string;
  value?: any;
  error: string;
}

export interface CSVImportResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: BulkOperationError[];
  data: any[];
}

export interface BulkUpdateRequest {
  userIds: string[];
  updates: Record<string, any>;
  validateOnly?: boolean;
}

export interface BulkCreditAdjustment {
  userId: string;
  amount: number;
  reason: string;
  type: 'credit' | 'debit';
}

// In-memory storage for demo (use database in production)
const operations = new Map<string, BulkOperation>();

/**
 * Parse and validate CSV file
 */
export function parseCSV(csvContent: string): CSVImportResult {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const errors: BulkOperationError[] = [];
  const data: any[] = [];
  
  // Required fields for user import
  const requiredFields = ['email', 'name', 'role'];
  const missingFields = requiredFields.filter(f => !headers.includes(f));
  
  if (missingFields.length > 0) {
    errors.push({
      row: 0,
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
    return {
      valid: false,
      totalRows: lines.length - 1,
      validRows: 0,
      invalidRows: lines.length - 1,
      errors,
      data: []
    };
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // Validate row
    const rowErrors = validateUserRow(row, i + 1);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      data.push(row);
    }
  }
  
  return {
    valid: errors.length === 0,
    totalRows: lines.length - 1,
    validRows: data.length,
    invalidRows: errors.length,
    errors,
    data
  };
}

/**
 * Validate a single user row
 */
function validateUserRow(row: any, rowNumber: number): BulkOperationError[] {
  const errors: BulkOperationError[] = [];
  
  // Email validation
  if (!row.email || !isValidEmail(row.email)) {
    errors.push({
      row: rowNumber,
      field: 'email',
      value: row.email,
      error: 'Invalid email address'
    });
  }
  
  // Name validation
  if (!row.name || row.name.length < 2) {
    errors.push({
      row: rowNumber,
      field: 'name',
      value: row.name,
      error: 'Name must be at least 2 characters'
    });
  }
  
  // Role validation
  const validRoles = ['admin', 'user', 'trader', 'viewer'];
  if (!row.role || !validRoles.includes(row.role.toLowerCase())) {
    errors.push({
      row: rowNumber,
      field: 'role',
      value: row.role,
      error: `Role must be one of: ${validRoles.join(', ')}`
    });
  }
  
  // Phone validation (if provided)
  if (row.phone && !isValidPhone(row.phone)) {
    errors.push({
      row: rowNumber,
      field: 'phone',
      value: row.phone,
      error: 'Invalid phone number format'
    });
  }
  
  return errors;
}

/**
 * Create a new bulk operation
 */
export function createBulkOperation(
  type: BulkOperationType,
  totalRecords: number,
  createdBy: string,
  metadata?: Record<string, any>
): BulkOperation {
  const operation: BulkOperation = {
    id: generateOperationId(),
    type,
    status: 'pending',
    totalRecords,
    processedRecords: 0,
    successCount: 0,
    failureCount: 0,
    errors: [],
    createdBy,
    metadata
  };
  
  operations.set(operation.id, operation);
  return operation;
}

/**
 * Update bulk operation progress
 */
export function updateOperationProgress(
  operationId: string,
  processed: number,
  success: number,
  failure: number,
  errors: BulkOperationError[] = []
): BulkOperation | null {
  const operation = operations.get(operationId);
  if (!operation) return null;
  
  operation.processedRecords = processed;
  operation.successCount = success;
  operation.failureCount = failure;
  operation.errors.push(...errors);
  
  if (processed >= operation.totalRecords) {
    operation.status = failure === 0 ? 'completed' : 'partial';
    operation.completedAt = new Date();
  } else {
    operation.status = 'processing';
  }
  
  return operation;
}

/**
 * Get bulk operation status
 */
export function getOperationStatus(operationId: string): BulkOperation | null {
  return operations.get(operationId) || null;
}

/**
 * Import users from CSV
 */
export async function importUsersFromCSV(
  csvContent: string,
  createdBy: string
): Promise<BulkOperation> {
  const parseResult = parseCSV(csvContent);
  
  const operation = createBulkOperation(
    'import_users',
    parseResult.totalRows,
    createdBy,
    { parseResult }
  );
  
  if (!parseResult.valid) {
    operation.status = 'failed';
    operation.errors = parseResult.errors;
    return operation;
  }
  
  // Start processing (in production, this would be async/background job)
  operation.status = 'processing';
  operation.startedAt = new Date();
  
  let success = 0;
  let failure = 0;
  const errors: BulkOperationError[] = [];
  
  for (let i = 0; i < parseResult.data.length; i++) {
    const user = parseResult.data[i];
    
    try {
      // TODO: Actually create user in database
      // await createUser(user);
      success++;
    } catch (error: any) {
      failure++;
      errors.push({
        row: i + 2, // +2 because of header and 0-index
        error: error.message
      });
    }
    
    // Update progress
    updateOperationProgress(operation.id, i + 1, success, failure, errors);
  }
  
  return operation;
}

/**
 * Bulk update user status
 */
export async function bulkUpdateStatus(
  userIds: string[],
  status: 'active' | 'inactive' | 'suspended',
  createdBy: string
): Promise<BulkOperation> {
  const operation = createBulkOperation(
    'update_status',
    userIds.length,
    createdBy,
    { status }
  );
  
  operation.status = 'processing';
  operation.startedAt = new Date();
  
  let success = 0;
  let failure = 0;
  const errors: BulkOperationError[] = [];
  
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    
    try {
      // TODO: Actually update user status in database
      // await updateUserStatus(userId, status);
      success++;
    } catch (error: any) {
      failure++;
      errors.push({
        row: i + 1,
        field: 'userId',
        value: userId,
        error: error.message
      });
    }
    
    updateOperationProgress(operation.id, i + 1, success, failure, errors);
  }
  
  return operation;
}

/**
 * Bulk credit adjustments
 */
export async function bulkAdjustCredits(
  adjustments: BulkCreditAdjustment[],
  createdBy: string
): Promise<BulkOperation> {
  const operation = createBulkOperation(
    'adjust_credits',
    adjustments.length,
    createdBy
  );
  
  operation.status = 'processing';
  operation.startedAt = new Date();
  
  let success = 0;
  let failure = 0;
  const errors: BulkOperationError[] = [];
  
  for (let i = 0; i < adjustments.length; i++) {
    const adjustment = adjustments[i];
    
    try {
      // Validate amount
      if (adjustment.amount <= 0) {
        throw new Error('Amount must be positive');
      }
      
      // TODO: Actually adjust credits in database
      // await adjustUserCredits(adjustment.userId, adjustment.amount, adjustment.type, adjustment.reason);
      success++;
    } catch (error: any) {
      failure++;
      errors.push({
        row: i + 1,
        field: 'userId',
        value: adjustment.userId,
        error: error.message
      });
    }
    
    updateOperationProgress(operation.id, i + 1, success, failure, errors);
  }
  
  return operation;
}

/**
 * Bulk send emails
 */
export async function bulkSendEmails(
  userIds: string[],
  subject: string,
  body: string,
  createdBy: string
): Promise<BulkOperation> {
  const operation = createBulkOperation(
    'send_email',
    userIds.length,
    createdBy,
    { subject, body }
  );
  
  operation.status = 'processing';
  operation.startedAt = new Date();
  
  let success = 0;
  let failure = 0;
  const errors: BulkOperationError[] = [];
  
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    
    try {
      // TODO: Actually send email
      // await sendEmail(userId, subject, body);
      success++;
    } catch (error: any) {
      failure++;
      errors.push({
        row: i + 1,
        field: 'userId',
        value: userId,
        error: error.message
      });
    }
    
    updateOperationProgress(operation.id, i + 1, success, failure, errors);
  }
  
  return operation;
}

/**
 * Bulk send SMS
 */
export async function bulkSendSMS(
  userIds: string[],
  message: string,
  createdBy: string
): Promise<BulkOperation> {
  const operation = createBulkOperation(
    'send_sms',
    userIds.length,
    createdBy,
    { message }
  );
  
  operation.status = 'processing';
  operation.startedAt = new Date();
  
  let success = 0;
  let failure = 0;
  const errors: BulkOperationError[] = [];
  
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    
    try {
      // TODO: Actually send SMS
      // await sendSMS(userId, message);
      success++;
    } catch (error: any) {
      failure++;
      errors.push({
        row: i + 1,
        field: 'userId',
        value: userId,
        error: error.message
      });
    }
    
    updateOperationProgress(operation.id, i + 1, success, failure, errors);
  }
  
  return operation;
}

/**
 * Generate CSV template for user import
 */
export function generateCSVTemplate(): string {
  const headers = [
    'email',
    'name',
    'role',
    'phone',
    'country',
    'initialBalance',
    'leverage',
    'status'
  ];
  
  const exampleRow = [
    'user@example.com',
    'John Doe',
    'trader',
    '+1234567890',
    'US',
    '10000',
    '5',
    'active'
  ];
  
  return [
    headers.join(','),
    exampleRow.join(',')
  ].join('\n');
}

/**
 * Export users to CSV
 */
export function exportUsersToCSV(users: any[]): string {
  const headers = [
    'userId',
    'email',
    'name',
    'role',
    'status',
    'balance',
    'totalTrades',
    'profitLoss',
    'createdAt'
  ];
  
  const rows = users.map(user => [
    user.userId || '',
    user.email || '',
    user.name || '',
    user.role || '',
    user.status || '',
    user.balance || '0',
    user.totalTrades || '0',
    user.profitLoss || '0',
    user.createdAt ? new Date(user.createdAt).toISOString() : ''
  ]);
  
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

// Helper functions

function generateOperationId(): string {
  return `BULK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Export all functions
export default {
  parseCSV,
  createBulkOperation,
  updateOperationProgress,
  getOperationStatus,
  importUsersFromCSV,
  bulkUpdateStatus,
  bulkAdjustCredits,
  bulkSendEmails,
  bulkSendSMS,
  generateCSVTemplate,
  exportUsersToCSV
};
