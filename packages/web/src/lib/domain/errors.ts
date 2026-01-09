/**
 * Domain-level error types
 * Platform-agnostic errors that can be thrown by repositories and services
 */

// =============================================================================
// Base Error Classes
// =============================================================================

/**
 * Base class for all domain errors
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

// =============================================================================
// Entity Errors
// =============================================================================

/**
 * Thrown when an entity is not found
 */
export class EntityNotFoundError extends DomainError {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string
  ) {
    super(
      `${entityType} with ID '${entityId}' not found`,
      'ENTITY_NOT_FOUND',
      { entityType, entityId }
    );
    this.name = 'EntityNotFoundError';
  }
}

/**
 * Thrown when an entity already exists (e.g., duplicate key)
 */
export class EntityExistsError extends DomainError {
  constructor(
    public readonly entityType: string,
    public readonly field: string,
    public readonly value: string
  ) {
    super(
      `${entityType} with ${field} '${value}' already exists`,
      'ENTITY_EXISTS',
      { entityType, field, value }
    );
    this.name = 'EntityExistsError';
  }
}

// =============================================================================
// Validation Errors
// =============================================================================

/**
 * Field validation error
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Thrown when validation fails
 */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly fieldErrors: FieldError[] = []
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      { fieldErrors }
    );
    this.name = 'ValidationError';
  }

  /**
   * Create a validation error from a single field error
   */
  static fromField(field: string, message: string): ValidationError {
    return new ValidationError(message, [{ field, message }]);
  }

  /**
   * Create a validation error from multiple field errors
   */
  static fromFields(errors: FieldError[]): ValidationError {
    const message = errors.map(e => `${e.field}: ${e.message}`).join('; ');
    return new ValidationError(message, errors);
  }
}

// =============================================================================
// Authorization Errors
// =============================================================================

/**
 * Thrown when user is not authenticated
 */
export class NotAuthenticatedError extends DomainError {
  constructor(message = 'Not authenticated') {
    super(message, 'NOT_AUTHENTICATED');
    this.name = 'NotAuthenticatedError';
  }
}

/**
 * Thrown when user is not authorized to perform an action
 */
export class NotAuthorizedError extends DomainError {
  constructor(
    message = 'Not authorized',
    public readonly action?: string,
    public readonly resource?: string
  ) {
    super(message, 'NOT_AUTHORIZED', { action, resource });
    this.name = 'NotAuthorizedError';
  }
}

// =============================================================================
// Business Logic Errors
// =============================================================================

/**
 * Thrown when a license limit is exceeded
 */
export class LicenseLimitError extends DomainError {
  constructor(
    public readonly licenseType: string,
    public readonly limit: number,
    public readonly used: number
  ) {
    super(
      `${licenseType} license limit exceeded (${used}/${limit})`,
      'LICENSE_LIMIT_EXCEEDED',
      { licenseType, limit, used }
    );
    this.name = 'LicenseLimitError';
  }
}

/**
 * Thrown when an operation conflicts with current state
 */
export class ConflictError extends DomainError {
  constructor(
    message: string,
    public readonly conflictType?: string
  ) {
    super(message, 'CONFLICT', { conflictType });
    this.name = 'ConflictError';
  }
}

/**
 * Thrown when a required dependency is missing
 */
export class DependencyError extends DomainError {
  constructor(
    message: string,
    public readonly dependency: string
  ) {
    super(message, 'DEPENDENCY_ERROR', { dependency });
    this.name = 'DependencyError';
  }
}

// =============================================================================
// Platform Errors
// =============================================================================

/**
 * Thrown when the underlying platform (Salesforce, etc.) returns an error
 */
export class PlatformError extends DomainError {
  constructor(
    message: string,
    public readonly platform: string,
    public readonly originalError?: unknown
  ) {
    super(message, 'PLATFORM_ERROR', { platform });
    this.name = 'PlatformError';
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an error is a domain error
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Check if an error is a not found error
 */
export function isNotFoundError(error: unknown): error is EntityNotFoundError {
  return error instanceof EntityNotFoundError;
}

/**
 * Check if an error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Extract error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
