import { AuthenticationError, ExternalServiceError } from '@avs/core';
import { type SalesforceAuthProvider } from '../auth/salesforce-auth.js';

/**
 * Apex REST endpoint configuration
 */
export interface ApexRestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

/**
 * Salesforce API client for making REST API calls
 * This handles calls to Apex REST endpoints and standard Salesforce REST APIs
 */
export class SalesforceApiClient {
  constructor(private authProvider: SalesforceAuthProvider) {}

  /**
   * Call an Apex REST endpoint
   */
  async callApexRest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    if (!this.authProvider.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated');
    }

    const conn = this.authProvider.getConnection();
    const url = `/services/apexrest${endpoint}`;

    try {
      let result: unknown;

      switch (method) {
        case 'GET':
          result = await conn.request(url);
          break;
        case 'POST':
          result = await conn.request({
            method: 'POST',
            url,
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          });
          break;
        case 'PUT':
          result = await conn.request({
            method: 'PUT',
            url,
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          });
          break;
        case 'PATCH':
          result = await conn.request({
            method: 'PATCH',
            url,
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          });
          break;
        case 'DELETE':
          result = await conn.request({
            method: 'DELETE',
            url,
          });
          break;
      }

      return result as T;
    } catch (error) {
      throw new ExternalServiceError(
        'Salesforce',
        `Apex REST call failed: ${String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Call the Composite API for batching multiple requests
   */
  async callComposite<T>(
    requests: Array<{
      method: string;
      url: string;
      referenceId: string;
      body?: unknown;
    }>
  ): Promise<T> {
    if (!this.authProvider.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated');
    }

    const conn = this.authProvider.getConnection();

    try {
      const result = await conn.request({
        method: 'POST',
        url: '/services/data/v62.0/composite',
        body: JSON.stringify({
          allOrNone: false,
          compositeRequest: requests,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      return result as T;
    } catch (error) {
      throw new ExternalServiceError(
        'Salesforce',
        `Composite API call failed: ${String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Execute anonymous Apex code
   * Note: This requires special permissions and should be used sparingly
   */
  async executeAnonymous(apexCode: string): Promise<{
    success: boolean;
    compiled: boolean;
    compileProblem?: string;
    exceptionMessage?: string;
    exceptionStackTrace?: string;
  }> {
    if (!this.authProvider.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated');
    }

    const conn = this.authProvider.getConnection();

    try {
      const result = await conn.tooling.executeAnonymous(apexCode);
      return {
        success: result.success,
        compiled: result.compiled,
        compileProblem: result.compileProblem ?? undefined,
        exceptionMessage: result.exceptionMessage ?? undefined,
        exceptionStackTrace: result.exceptionStackTrace ?? undefined,
      };
    } catch (error) {
      throw new ExternalServiceError(
        'Salesforce',
        `Execute anonymous failed: ${String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Call the User Creation Apex REST endpoint
   * Matches the existing /services/apexrest/usercreation/* endpoint
   */
  async createUserViaApex(userData: {
    firstName: string;
    lastName: string;
    email: string;
    username?: string;
    profileId?: string;
    roleId?: string;
    avsLicenseType?: string;
    groupIds?: string[];
  }): Promise<{
    success: boolean;
    userId?: string;
    avsUserId?: string;
    message?: string;
  }> {
    return this.callApexRest('/usercreation', 'POST', userData);
  }

  /**
   * Call the User Deletion Apex REST endpoint
   * Matches the existing /services/apexrest/userdeletion/* endpoint
   */
  async deleteUserViaApex(userId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    return this.callApexRest(`/userdeletion/${userId}`, 'DELETE');
  }

  /**
   * Call the Dial List Apex REST endpoint
   * Matches the existing /services/apexrest/DialList/* endpoint
   */
  async getDialList(dialListId: string): Promise<unknown> {
    return this.callApexRest(`/DialList/${dialListId}`, 'GET');
  }

  /**
   * Call the Call Flow Apex REST endpoint
   * Matches the existing /services/apexrest/CallFlow/* endpoint
   */
  async getCallFlow(callFlowId: string): Promise<unknown> {
    return this.callApexRest(`/CallFlow/${callFlowId}`, 'GET');
  }

  /**
   * Update a Call Flow via Apex REST
   */
  async updateCallFlow(callFlowId: string, callFlowData: unknown): Promise<unknown> {
    return this.callApexRest(`/CallFlow/${callFlowId}`, 'PUT', callFlowData);
  }

  /**
   * Get OmniChannel status via Apex REST
   */
  async getOmniChannelStatus(): Promise<unknown> {
    return this.callApexRest('/omnichannel/status', 'GET');
  }
}

