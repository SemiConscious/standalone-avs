/**
 * Salesforce API Client
 * 
 * Wraps the existing salesforce.ts utilities and provides a cleaner interface
 * for the repository implementations.
 */

import {
  querySalesforce as rawQuerySalesforce,
  queryAllSalesforce as rawQueryAllSalesforce,
  createSalesforce as rawCreateSalesforce,
  updateSalesforce as rawUpdateSalesforce,
  deleteSalesforce as rawDeleteSalesforce,
  type SoqlQueryResult,
  type SalesforceCreateResult,
  SalesforceApiError,
} from '$lib/server/salesforce';
import type { SalesforceAdapterContext } from '../types';
import { PlatformError } from '$lib/domain';

// Re-export types
export { SalesforceApiError };
export type { SoqlQueryResult, SalesforceCreateResult };

// =============================================================================
// Salesforce Client Class
// =============================================================================

/**
 * Salesforce API client
 * 
 * Provides a cleaner interface to Salesforce operations with automatic
 * error transformation and namespace handling.
 */
export class SalesforceClient {
  constructor(private ctx: SalesforceAdapterContext) {}

  /**
   * Get the namespace prefix
   */
  get namespace(): string {
    return this.ctx.namespace;
  }

  /**
   * Get a namespaced object name
   */
  objectName(name: string): string {
    if (name.endsWith('__c') && !name.startsWith(`${this.namespace}__`)) {
      return `${this.namespace}__${name}`;
    }
    return name;
  }

  /**
   * Get a namespaced field name
   */
  fieldName(name: string): string {
    if ((name.endsWith('__c') || name.endsWith('__r')) && !name.startsWith(`${this.namespace}__`)) {
      return `${this.namespace}__${name}`;
    }
    return name;
  }

  /**
   * Execute a SOQL query
   */
  async query<T>(soql: string): Promise<SoqlQueryResult<T>> {
    try {
      return await rawQuerySalesforce<T>(
        this.ctx.instanceUrl,
        this.ctx.accessToken,
        soql
      );
    } catch (error) {
      throw this.transformError(error, 'query');
    }
  }

  /**
   * Execute a SOQL query and fetch all pages
   */
  async queryAll<T>(soql: string): Promise<T[]> {
    try {
      return await rawQueryAllSalesforce<T>(
        this.ctx.instanceUrl,
        this.ctx.accessToken,
        soql
      );
    } catch (error) {
      throw this.transformError(error, 'queryAll');
    }
  }

  /**
   * Create a record
   */
  async create(objectName: string, data: Record<string, unknown>): Promise<SalesforceCreateResult> {
    try {
      return await rawCreateSalesforce(
        this.ctx.instanceUrl,
        this.ctx.accessToken,
        this.objectName(objectName),
        data
      );
    } catch (error) {
      throw this.transformError(error, 'create');
    }
  }

  /**
   * Update a record
   */
  async update(objectName: string, recordId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await rawUpdateSalesforce(
        this.ctx.instanceUrl,
        this.ctx.accessToken,
        this.objectName(objectName),
        recordId,
        data
      );
    } catch (error) {
      throw this.transformError(error, 'update');
    }
  }

  /**
   * Delete a record
   */
  async delete(objectName: string, recordId: string): Promise<void> {
    try {
      await rawDeleteSalesforce(
        this.ctx.instanceUrl,
        this.ctx.accessToken,
        this.objectName(objectName),
        recordId
      );
    } catch (error) {
      throw this.transformError(error, 'delete');
    }
  }

  /**
   * Transform Salesforce errors into domain errors
   */
  private transformError(error: unknown, operation: string): Error {
    if (error instanceof SalesforceApiError) {
      return new PlatformError(
        `Salesforce ${operation} failed: ${error.message}`,
        'salesforce',
        error
      );
    }
    if (error instanceof Error) {
      return new PlatformError(
        `Salesforce ${operation} failed: ${error.message}`,
        'salesforce',
        error
      );
    }
    return new PlatformError(
      `Salesforce ${operation} failed: ${String(error)}`,
      'salesforce',
      error
    );
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a Salesforce client instance
 */
export function createSalesforceClient(ctx: SalesforceAdapterContext): SalesforceClient {
  return new SalesforceClient(ctx);
}
