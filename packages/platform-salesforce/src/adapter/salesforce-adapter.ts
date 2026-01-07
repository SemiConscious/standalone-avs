import {
  type IPlatformAdapter,
  type IAuthProvider,
  type IDataStore,
  type IEventBus,
  type IIdentityProvider,
  type PlatformUserInfo,
} from '@avs/core';
import { SalesforceAuthProvider } from '../auth/salesforce-auth.js';
import { SalesforceDataStore } from '../data-store/salesforce-data-store.js';
import { SalesforceEventBus } from './salesforce-event-bus.js';

/**
 * Configuration for the Salesforce platform adapter
 */
export interface SalesforceAdapterConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  loginUrl?: string;
  apiVersion?: string;
  /** Existing access token (for pre-authenticated sessions) */
  accessToken?: string;
  /** Existing refresh token */
  refreshToken?: string;
  /** Instance URL (required if using existing tokens) */
  instanceUrl?: string;
}

/**
 * Identity provider implementation for Salesforce
 */
class SalesforceIdentityProvider implements IIdentityProvider {
  constructor(private authProvider: SalesforceAuthProvider) {}

  async getCurrentUserId(): Promise<string> {
    const user = await this.authProvider.getCurrentUser();
    return user.id;
  }

  async getCurrentUserName(): Promise<string> {
    const user = await this.authProvider.getCurrentUser();
    return user.displayName;
  }

  async getCurrentUserEmail(): Promise<string> {
    const user = await this.authProvider.getCurrentUser();
    return user.email;
  }

  async getUserInfo(): Promise<PlatformUserInfo> {
    const user = await this.authProvider.getCurrentUser();
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      organizationId: user.organizationId,
      locale: user.locale,
      timezone: user.timezone,
      profileId: user.profileId,
    };
  }
}

/**
 * Salesforce platform adapter implementation
 * Implements the IPlatformAdapter interface to provide Salesforce-specific functionality
 */
export class SalesforcePlatformAdapter implements IPlatformAdapter {
  readonly platformId = 'salesforce';
  readonly platformName = 'Salesforce';

  public auth: IAuthProvider;
  public dataStore: IDataStore;
  public events: IEventBus;
  public identity: IIdentityProvider;

  private _isConnected = false;
  private authProvider: SalesforceAuthProvider;

  constructor(private config: SalesforceAdapterConfig) {
    this.authProvider = new SalesforceAuthProvider({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      loginUrl: config.loginUrl ?? 'https://login.salesforce.com',
      apiVersion: config.apiVersion ?? 'v62.0',
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      instanceUrl: config.instanceUrl,
    });

    this.auth = this.authProvider;
    this.dataStore = new SalesforceDataStore(this.authProvider);
    this.events = new SalesforceEventBus(this.authProvider);
    this.identity = new SalesforceIdentityProvider(this.authProvider);
  }

  async initialize(): Promise<void> {
    // If we have existing tokens, validate them
    if (this.config.accessToken && this.config.instanceUrl) {
      try {
        await this.authProvider.getCurrentUser();
        this._isConnected = true;
      } catch {
        // Token might be expired, will need to refresh or re-authenticate
        this._isConnected = false;
      }
    }
  }

  async dispose(): Promise<void> {
    await this.auth.logout();
    this._isConnected = false;
  }

  isConnected(): boolean {
    return this._isConnected && this.authProvider.isAuthenticated();
  }
}

