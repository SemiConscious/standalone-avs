/**
 * Unified Error Handling System
 * 
 * This module provides standardized error types and handling utilities
 * for consistent error management across the application.
 */

// =============================================================================
// Error Codes
// =============================================================================

export const ErrorCodes = {
  // Authentication errors (1xxx)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  
  // Validation errors (2xxx)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_FORMAT: 'VALIDATION_FORMAT',
  VALIDATION_RANGE: 'VALIDATION_RANGE',
  VALIDATION_UNIQUE: 'VALIDATION_UNIQUE',
  
  // Salesforce errors (3xxx)
  SALESFORCE_QUERY_FAILED: 'SALESFORCE_QUERY_FAILED',
  SALESFORCE_CREATE_FAILED: 'SALESFORCE_CREATE_FAILED',
  SALESFORCE_UPDATE_FAILED: 'SALESFORCE_UPDATE_FAILED',
  SALESFORCE_DELETE_FAILED: 'SALESFORCE_DELETE_FAILED',
  SALESFORCE_NOT_FOUND: 'SALESFORCE_NOT_FOUND',
  SALESFORCE_DUPLICATE: 'SALESFORCE_DUPLICATE',
  
  // Sapien API errors (4xxx)
  SAPIEN_CONNECTION_FAILED: 'SAPIEN_CONNECTION_FAILED',
  SAPIEN_SYNC_FAILED: 'SAPIEN_SYNC_FAILED',
  SAPIEN_DEPLOY_FAILED: 'SAPIEN_DEPLOY_FAILED',
  
  // License errors (5xxx)
  LICENSE_LIMIT_EXCEEDED: 'LICENSE_LIMIT_EXCEEDED',
  LICENSE_NOT_ENABLED: 'LICENSE_NOT_ENABLED',
  LICENSE_INVALID: 'LICENSE_INVALID',
  
  // Resource errors (6xxx)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  
  // General errors (9xxx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base application error with structured information
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.UNKNOWN,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.isOperational = true;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Authentication errors
 */
export class AuthError extends AppError {
  constructor(
    message: string = 'Authentication required',
    code: ErrorCode = ErrorCodes.AUTH_REQUIRED
  ) {
    super(message, code, 401);
    this.name = 'AuthError';
  }
}

/**
 * Validation errors with field-level details
 */
export interface ValidationDetail {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationError extends AppError {
  public readonly fields: ValidationDetail[];

  constructor(
    message: string = 'Validation failed',
    fields: ValidationDetail[] = []
  ) {
    super(message, ErrorCodes.VALIDATION_FAILED, 400, { fields });
    this.name = 'ValidationError';
    this.fields = fields;
  }

  static required(field: string, message?: string): ValidationError {
    return new ValidationError(message || `${field} is required`, [
      { field, message: message || `${field} is required` },
    ]);
  }

  static format(field: string, message: string): ValidationError {
    return new ValidationError(message, [{ field, message }]);
  }

  static unique(field: string, value: unknown): ValidationError {
    return new ValidationError(`${field} must be unique`, [
      { field, message: `This ${field} is already in use`, value },
    ]);
  }

  static range(field: string, min: number, max: number, value: unknown): ValidationError {
    return new ValidationError(`${field} must be between ${min} and ${max}`, [
      { field, message: `Value must be between ${min} and ${max}`, value },
    ]);
  }
}

/**
 * Salesforce API errors
 */
export interface SalesforceErrorDetail {
  statusCode: string;
  message: string;
  fields?: string[];
}

export class SalesforceError extends AppError {
  public readonly sfErrors: SalesforceErrorDetail[];

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.SALESFORCE_QUERY_FAILED,
    statusCode: number = 500,
    sfErrors: SalesforceErrorDetail[] = []
  ) {
    super(message, code, statusCode, { salesforceErrors: sfErrors });
    this.name = 'SalesforceError';
    this.sfErrors = sfErrors;
  }

  static notFound(objectType: string, id?: string): SalesforceError {
    const message = id
      ? `${objectType} with ID ${id} not found`
      : `${objectType} not found`;
    return new SalesforceError(message, ErrorCodes.SALESFORCE_NOT_FOUND, 404);
  }

  static duplicate(objectType: string, field: string): SalesforceError {
    return new SalesforceError(
      `A ${objectType} with this ${field} already exists`,
      ErrorCodes.SALESFORCE_DUPLICATE,
      409
    );
  }
}

/**
 * License validation errors
 */
export class LicenseError extends AppError {
  public readonly licenseType: string;
  public readonly limit?: number;
  public readonly used?: number;

  constructor(
    message: string,
    licenseType: string,
    code: ErrorCode = ErrorCodes.LICENSE_LIMIT_EXCEEDED,
    limit?: number,
    used?: number
  ) {
    super(message, code, 403, { licenseType, limit, used });
    this.name = 'LicenseError';
    this.licenseType = licenseType;
    this.limit = limit;
    this.used = used;
  }

  static exceeded(licenseType: string, limit: number, used: number): LicenseError {
    return new LicenseError(
      `${licenseType} license limit reached (${used}/${limit})`,
      licenseType,
      ErrorCodes.LICENSE_LIMIT_EXCEEDED,
      limit,
      used
    );
  }

  static notEnabled(licenseType: string): LicenseError {
    return new LicenseError(
      `${licenseType} license is not enabled for this organization`,
      licenseType,
      ErrorCodes.LICENSE_NOT_ENABLED
    );
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(resourceType: string, id?: string) {
    const message = id
      ? `${resourceType} with ID ${id} not found`
      : `${resourceType} not found`;
    super(message, ErrorCodes.RESOURCE_NOT_FOUND, 404, { resourceType, id });
    this.name = 'NotFoundError';
  }
}

// =============================================================================
// Error Type Guards
// =============================================================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isSalesforceError(error: unknown): error is SalesforceError {
  return error instanceof SalesforceError;
}

export function isLicenseError(error: unknown): error is LicenseError {
  return error instanceof LicenseError;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

// =============================================================================
// Error Utilities
// =============================================================================

/**
 * Extract a user-friendly message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Convert any error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, ErrorCodes.INTERNAL_ERROR, 500);
  }
  
  if (typeof error === 'string') {
    return new AppError(error, ErrorCodes.INTERNAL_ERROR, 500);
  }
  
  return new AppError('An unexpected error occurred', ErrorCodes.UNKNOWN, 500);
}

/**
 * Log error with consistent formatting
 */
export function logError(error: unknown, context?: string): void {
  const appError = toAppError(error);
  const prefix = context ? `[${context}]` : '[Error]';
  
  console.error(`${prefix} ${appError.code}: ${appError.message}`, {
    code: appError.code,
    statusCode: appError.statusCode,
    details: appError.details,
    timestamp: appError.timestamp,
    stack: appError.stack,
  });
}

