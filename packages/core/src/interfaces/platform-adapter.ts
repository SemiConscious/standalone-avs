import { type IAuthProvider } from './auth-provider.js';
import { type IDataStore } from './data-store.js';
import { type IEventBus } from './event-bus.js';

/**
 * Identity provider interface for platform-specific user identity
 */
export interface IIdentityProvider {
  /** Get the current user's platform-specific ID */
  getCurrentUserId(): Promise<string>;

  /** Get the current user's display name */
  getCurrentUserName(): Promise<string>;

  /** Get the current user's email */
  getCurrentUserEmail(): Promise<string>;

  /** Get platform-specific user info */
  getUserInfo(): Promise<PlatformUserInfo>;
}

/**
 * Platform-specific user information
 */
export interface PlatformUserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string;
  organizationId: string;
  locale?: string;
  timezone?: string;
  profileId?: string;
  /** Additional platform-specific fields */
  metadata?: Record<string, unknown>;
}

/**
 * Main abstraction for CRM platforms (Salesforce, Dynamics, etc.)
 * This interface allows the AVS application to be platform-agnostic
 */
export interface IPlatformAdapter {
  /** Platform identifier (e.g., 'salesforce', 'dynamics') */
  readonly platformId: string;

  /** Platform display name */
  readonly platformName: string;

  /** Authentication provider for this platform */
  auth: IAuthProvider;

  /** Data store for CRUD operations */
  dataStore: IDataStore;

  /** Event bus for platform events */
  events: IEventBus;

  /** Identity provider for user information */
  identity: IIdentityProvider;

  /** Initialize the platform adapter */
  initialize(): Promise<void>;

  /** Cleanup and disconnect */
  dispose(): Promise<void>;

  /** Check if the platform is properly connected and authenticated */
  isConnected(): boolean;
}

