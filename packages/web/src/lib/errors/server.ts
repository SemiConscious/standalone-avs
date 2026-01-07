/**
 * Server-Side Error Handling Utilities
 * 
 * Provides utilities for handling errors in SvelteKit server actions and load functions.
 */

import { fail, error as kitError, redirect } from '@sveltejs/kit';
import {
  AppError,
  AuthError,
  ValidationError,
  NotFoundError,
  LicenseError,
  SalesforceError,
  ErrorCodes,
  isAppError,
  isValidationError,
  logError,
  toAppError,
  type ValidationDetail,
} from './index.js';

// =============================================================================
// Action Response Types
// =============================================================================

export interface ActionSuccess<T = void> {
  success: true;
  data?: T;
  message?: string;
}

export interface ActionFailure {
  success: false;
  error: string;
  code: string;
  fields?: ValidationDetail[];
}

// =============================================================================
// Action Helpers
// =============================================================================

/**
 * Create a successful action response
 */
export function actionSuccess<T>(data?: T, message?: string): ActionSuccess<T> {
  return { success: true, data, message };
}

/**
 * Create a failed action response using SvelteKit's fail()
 */
export function actionFail(error: unknown, context?: string) {
  const appError = toAppError(error);
  
  // Log the error
  logError(error, context);
  
  // Build the failure response
  const response: ActionFailure = {
    success: false,
    error: appError.message,
    code: appError.code,
  };
  
  // Add validation fields if present
  if (isValidationError(error)) {
    response.fields = error.fields;
  }
  
  return fail(appError.statusCode, response);
}

/**
 * Wrap an action handler with automatic error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  handler: T,
  context?: string
): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Re-throw redirects and existing SvelteKit errors
      if (error instanceof Response) {
        throw error;
      }
      
      // Handle auth errors with redirect
      if (error instanceof AuthError) {
        throw redirect(303, '/auth/login');
      }
      
      return actionFail(error, context);
    }
  }) as T;
}

// =============================================================================
// Load Function Helpers
// =============================================================================

/**
 * Throw a SvelteKit error from an AppError
 */
export function throwError(error: unknown, context?: string): never {
  const appError = toAppError(error);
  logError(error, context);
  
  throw kitError(appError.statusCode, {
    message: appError.message,
    code: appError.code,
  });
}

/**
 * Throw if condition is false
 */
export function assertOrThrow(
  condition: boolean,
  message: string,
  code: string = ErrorCodes.VALIDATION_FAILED,
  statusCode: number = 400
): asserts condition {
  if (!condition) {
    throw new AppError(message, code as typeof ErrorCodes[keyof typeof ErrorCodes], statusCode);
  }
}

/**
 * Throw NotFoundError if value is null/undefined
 */
export function assertFound<T>(
  value: T | null | undefined,
  resourceType: string,
  id?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resourceType, id);
  }
}

/**
 * Require authentication or throw
 */
export function requireAuth(locals: App.Locals): asserts locals is App.Locals & {
  user: NonNullable<App.Locals['user']>;
  accessToken: string;
  instanceUrl: string;
} {
  if (!locals.user || !locals.accessToken || !locals.instanceUrl) {
    throw new AuthError('Authentication required', ErrorCodes.AUTH_REQUIRED);
  }
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate form data with a schema-like validator
 */
export interface FieldValidator {
  field: string;
  validate: (value: unknown) => string | null;
}

export function validateFormData(
  formData: FormData,
  validators: FieldValidator[]
): ValidationDetail[] {
  const errors: ValidationDetail[] = [];
  
  for (const validator of validators) {
    const value = formData.get(validator.field);
    const error = validator.validate(value);
    
    if (error) {
      errors.push({ field: validator.field, message: error, value });
    }
  }
  
  return errors;
}

/**
 * Throw ValidationError if there are validation errors
 */
export function assertValid(errors: ValidationDetail[], message?: string): void {
  if (errors.length > 0) {
    throw new ValidationError(message || 'Validation failed', errors);
  }
}

/**
 * Common field validators
 */
export const validators = {
  required: (fieldName: string) => ({
    field: fieldName,
    validate: (value: unknown) => {
      if (value === null || value === undefined || value === '') {
        return `${fieldName} is required`;
      }
      return null;
    },
  }),

  email: (fieldName: string = 'email') => ({
    field: fieldName,
    validate: (value: unknown) => {
      if (typeof value !== 'string') return `${fieldName} must be a string`;
      if (!value) return null; // Use required() for mandatory fields
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${fieldName} must be a valid email address`;
      }
      return null;
    },
  }),

  minLength: (fieldName: string, min: number) => ({
    field: fieldName,
    validate: (value: unknown) => {
      if (typeof value !== 'string') return null;
      if (value.length < min) {
        return `${fieldName} must be at least ${min} characters`;
      }
      return null;
    },
  }),

  maxLength: (fieldName: string, max: number) => ({
    field: fieldName,
    validate: (value: unknown) => {
      if (typeof value !== 'string') return null;
      if (value.length > max) {
        return `${fieldName} must be at most ${max} characters`;
      }
      return null;
    },
  }),

  range: (fieldName: string, min: number, max: number) => ({
    field: fieldName,
    validate: (value: unknown) => {
      const num = typeof value === 'string' ? parseInt(value, 10) : value;
      if (typeof num !== 'number' || isNaN(num)) {
        return `${fieldName} must be a number`;
      }
      if (num < min || num > max) {
        return `${fieldName} must be between ${min} and ${max}`;
      }
      return null;
    },
  }),

  pattern: (fieldName: string, pattern: RegExp, message: string) => ({
    field: fieldName,
    validate: (value: unknown) => {
      if (typeof value !== 'string') return null;
      if (!pattern.test(value)) {
        return message;
      }
      return null;
    },
  }),
};

// =============================================================================
// Try/Catch Wrapper for Async Operations
// =============================================================================

/**
 * Wrap an async operation with error handling
 */
export async function tryAsync<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<[T, null] | [null, AppError]> {
  try {
    const result = await operation();
    return [result, null];
  } catch (error) {
    logError(error, context);
    return [null, toAppError(error)];
  }
}

/**
 * Wrap an async operation and throw on error
 */
export async function tryAsyncOrThrow<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throwError(error, context);
  }
}

