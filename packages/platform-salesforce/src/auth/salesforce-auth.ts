import jsforce from 'jsforce';
import {
  type IAuthProvider,
  type AuthResult,
  type TokenSet,
  type PlatformUser,
  type OAuthConfig,
  AuthenticationError,
} from '@avs/core';

/**
 * Salesforce OAuth configuration
 */
export interface SalesforceAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  loginUrl?: string;
  apiVersion?: string;
  /** Pre-existing access token */
  accessToken?: string;
  /** Pre-existing refresh token */
  refreshToken?: string;
  /** Salesforce instance URL */
  instanceUrl?: string;
}

/**
 * Salesforce authentication provider
 * Implements OAuth 2.0 Web Server Flow for Salesforce
 */
export class SalesforceAuthProvider implements IAuthProvider {
  private connection: jsforce.Connection;
  private oauth2: jsforce.OAuth2;
  private config: SalesforceAuthConfig;
  private _isAuthenticated = false;
  private currentUser: PlatformUser | null = null;

  constructor(config: SalesforceAuthConfig) {
    this.config = config;

    this.oauth2 = new jsforce.OAuth2({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      loginUrl: config.loginUrl ?? 'https://login.salesforce.com',
    });

    this.connection = new jsforce.Connection({
      oauth2: this.oauth2,
      version: config.apiVersion ?? 'v62.0',
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      instanceUrl: config.instanceUrl,
    });

    // If we have existing tokens, mark as authenticated
    if (config.accessToken && config.instanceUrl) {
      this._isAuthenticated = true;
    }

    // Handle token refresh events
    this.connection.on('refresh', (accessToken: string, res: jsforce.UserInfo) => {
      this._isAuthenticated = true;
      // Token has been refreshed, update any cached data
      console.log('Salesforce token refreshed for user:', res.id);
    });
  }

  /**
   * Get the underlying jsforce connection
   */
  getConnection(): jsforce.Connection {
    return this.connection;
  }

  async login(): Promise<AuthResult> {
    // For web server flow, we need to redirect to authorization URL first
    // This method is typically called after receiving the callback
    throw new AuthenticationError(
      'Use getAuthorizationUrl() for initial login, then exchangeCodeForTokens()'
    );
  }

  async loginWithConfig(_config: OAuthConfig): Promise<AuthResult> {
    // For web server flow, redirect to authorization URL
    throw new AuthenticationError(
      'Use getAuthorizationUrl() for initial login, then exchangeCodeForTokens()'
    );
  }

  async logout(): Promise<void> {
    try {
      await this.connection.logout();
    } finally {
      this._isAuthenticated = false;
      this.currentUser = null;
    }
  }

  async refreshToken(): Promise<TokenSet> {
    if (!this.connection.refreshToken) {
      throw new AuthenticationError('No refresh token available');
    }

    try {
      await this.connection.oauth2.refreshToken(this.connection.refreshToken);

      return {
        accessToken: this.connection.accessToken!,
        refreshToken: this.connection.refreshToken,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // Estimate 2 hours
        tokenType: 'Bearer',
      };
    } catch (error) {
      this._isAuthenticated = false;
      throw new AuthenticationError(`Failed to refresh token: ${String(error)}`);
    }
  }

  async getCurrentUser(): Promise<PlatformUser> {
    if (!this._isAuthenticated) {
      throw new AuthenticationError('Not authenticated');
    }

    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      const identity = await this.connection.identity();
      const userInfo = await this.connection.sobject('User').retrieve(identity.user_id);

      this.currentUser = {
        id: identity.user_id,
        username: userInfo.Username as string,
        email: userInfo.Email as string,
        displayName: userInfo.Name as string,
        firstName: userInfo.FirstName as string | undefined,
        lastName: userInfo.LastName as string | undefined,
        organizationId: identity.organization_id,
        profileId: userInfo.ProfileId as string | undefined,
        isActive: userInfo.IsActive as boolean,
        locale: userInfo.LocaleSidKey as string | undefined,
        timezone: userInfo.TimeZoneSidKey as string | undefined,
      };

      return this.currentUser;
    } catch (error) {
      throw new AuthenticationError(`Failed to get current user: ${String(error)}`);
    }
  }

  isAuthenticated(): boolean {
    return this._isAuthenticated && !!this.connection.accessToken;
  }

  async getAccessToken(): Promise<string> {
    if (!this._isAuthenticated || !this.connection.accessToken) {
      throw new AuthenticationError('Not authenticated');
    }
    return this.connection.accessToken;
  }

  getAuthorizationUrl(state?: string): string {
    return this.oauth2.getAuthorizationUrl({
      scope: 'api refresh_token',
      state: state ?? crypto.randomUUID(),
    });
  }

  async exchangeCodeForTokens(code: string): Promise<AuthResult> {
    try {
      const userInfo = await this.connection.authorize(code);
      this._isAuthenticated = true;

      // Clear cached user to force refresh
      this.currentUser = null;
      const user = await this.getCurrentUser();

      return {
        success: true,
        accessToken: this.connection.accessToken!,
        refreshToken: this.connection.refreshToken,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // Estimate 2 hours
        instanceUrl: this.connection.instanceUrl,
        userId: userInfo.id,
        organizationId: userInfo.organizationId,
      };
    } catch (error) {
      this._isAuthenticated = false;
      throw new AuthenticationError(`Failed to exchange code for tokens: ${String(error)}`);
    }
  }

  /**
   * Initialize connection with existing tokens (for session restoration)
   */
  async initializeWithTokens(
    accessToken: string,
    refreshToken: string | undefined,
    instanceUrl: string
  ): Promise<void> {
    this.connection = new jsforce.Connection({
      oauth2: this.oauth2,
      version: this.config.apiVersion ?? 'v62.0',
      accessToken,
      refreshToken,
      instanceUrl,
    });

    this._isAuthenticated = true;
    this.currentUser = null;

    // Validate the tokens by fetching user info
    await this.getCurrentUser();
  }
}

