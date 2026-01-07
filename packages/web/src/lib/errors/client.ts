/**
 * Client-Side Error Handling Utilities
 * 
 * Provides utilities for handling errors on the client side,
 * including toast notifications and form error handling.
 */

import { toasts } from '$lib/stores/toast.js';
import { goto } from '$app/navigation';
import { ErrorCodes, type ErrorCode, type ValidationDetail } from './index.js';

// =============================================================================
// Types
// =============================================================================

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  fields?: ValidationDetail[];
}

export interface FormErrors {
  general?: string;
  fields: Record<string, string>;
}

// =============================================================================
// Error Display
// =============================================================================

/**
 * Show an error toast notification
 */
export function showError(message: string, description?: string): void {
  toasts.error(message, description);
}

/**
 * Show a success toast notification
 */
export function showSuccess(message: string, description?: string): void {
  toasts.success(message, description);
}

/**
 * Show a warning toast notification
 */
export function showWarning(message: string, description?: string): void {
  toasts.warning(message, description);
}

/**
 * Handle an error response from a form action
 */
export function handleActionError(response: ErrorResponse): FormErrors {
  const errors: FormErrors = { fields: {} };
  
  // Set general error message
  errors.general = response.error;
  
  // Map field-level errors
  if (response.fields) {
    for (const field of response.fields) {
      errors.fields[field.field] = field.message;
    }
  }
  
  // Show toast for non-validation errors
  if (response.code !== ErrorCodes.VALIDATION_FAILED) {
    showError(response.error, getErrorDescription(response.code as ErrorCode));
  }
  
  // Handle auth errors
  if (response.code === ErrorCodes.AUTH_REQUIRED || response.code === ErrorCodes.AUTH_EXPIRED) {
    goto('/auth/login');
  }
  
  return errors;
}

/**
 * Get a user-friendly description for an error code
 */
export function getErrorDescription(code: ErrorCode): string | undefined {
  const descriptions: Partial<Record<ErrorCode, string>> = {
    [ErrorCodes.AUTH_REQUIRED]: 'Please log in to continue',
    [ErrorCodes.AUTH_EXPIRED]: 'Your session has expired. Please log in again',
    [ErrorCodes.AUTH_FORBIDDEN]: 'You do not have permission to perform this action',
    [ErrorCodes.LICENSE_LIMIT_EXCEEDED]: 'Contact your administrator to increase license limits',
    [ErrorCodes.LICENSE_NOT_ENABLED]: 'This feature requires an additional license',
    [ErrorCodes.SALESFORCE_NOT_FOUND]: 'The requested record could not be found',
    [ErrorCodes.SALESFORCE_DUPLICATE]: 'A record with this value already exists',
    [ErrorCodes.NETWORK_ERROR]: 'Please check your internet connection',
    [ErrorCodes.TIMEOUT]: 'The request took too long. Please try again',
  };
  
  return descriptions[code];
}

// =============================================================================
// Form Error Utilities
// =============================================================================

/**
 * Create an empty form errors object
 */
export function createFormErrors(): FormErrors {
  return { fields: {} };
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: FormErrors): boolean {
  return !!errors.general || Object.keys(errors.fields).length > 0;
}

/**
 * Clear all form errors
 */
export function clearErrors(errors: FormErrors): FormErrors {
  return { fields: {} };
}

/**
 * Add a field error
 */
export function addFieldError(errors: FormErrors, field: string, message: string): FormErrors {
  return {
    ...errors,
    fields: {
      ...errors.fields,
      [field]: message,
    },
  };
}

/**
 * Remove a field error
 */
export function removeFieldError(errors: FormErrors, field: string): FormErrors {
  const { [field]: _, ...rest } = errors.fields;
  return {
    ...errors,
    fields: rest,
  };
}

// =============================================================================
// Async Error Handling
// =============================================================================

/**
 * Wrap an async operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    errorMessage?: string;
    showToast?: boolean;
    rethrow?: boolean;
  }
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const message = options?.errorMessage || getErrorMessage(error);
    
    if (options?.showToast !== false) {
      showError(message);
    }
    
    console.error('[Client Error]', error);
    
    if (options?.rethrow) {
      throw error;
    }
    
    return null;
  }
}

/**
 * Extract error message from unknown error
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

// =============================================================================
// Fetch Error Handling
// =============================================================================

/**
 * Handle fetch response errors
 */
export async function handleFetchError(response: Response): Promise<never> {
  let errorMessage = `Request failed with status ${response.status}`;
  let errorCode = ErrorCodes.INTERNAL_ERROR;
  
  try {
    const body = await response.json();
    if (body.error) {
      errorMessage = body.error;
    }
    if (body.code) {
      errorCode = body.code;
    }
  } catch {
    // Couldn't parse JSON, use default message
  }
  
  showError(errorMessage, getErrorDescription(errorCode as ErrorCode));
  throw new Error(errorMessage);
}

/**
 * Fetch with automatic error handling
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      await handleFetchError(response);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError('Network error', 'Please check your internet connection');
    }
    throw error;
  }
}

