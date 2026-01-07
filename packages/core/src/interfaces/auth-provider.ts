/**
 * Authentication result returned after successful login
 */
export interface AuthResult {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  instanceUrl?: string;
  userId: string;
  organizationId: string;
}

/**
 * Token set for managing access and refresh tokens
 */
export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string;
}

/**
 * Platform user information
 */
export interface PlatformUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  profileId?: string;
  isActive: boolean;
  locale?: string;
  timezone?: string;
}

/**
 * OAuth configuration options
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scope?: string;
  /** Additional platform-specific options */
  options?: Record<string, unknown>;
}

/**
 * Authentication provider interface - abstraction for platform authentication
 */
export interface IAuthProvider {
  /** Start the login flow */
  login(): Promise<AuthResult>;

  /** Start login with specific OAuth config */
  loginWithConfig(config: OAuthConfig): Promise<AuthResult>;

  /** Logout and invalidate tokens */
  logout(): Promise<void>;

  /** Refresh the current access token */
  refreshToken(): Promise<TokenSet>;

  /** Get the current authenticated user */
  getCurrentUser(): Promise<PlatformUser>;

  /** Check if currently authenticated */
  isAuthenticated(): boolean;

  /** Get the current access token */
  getAccessToken(): Promise<string>;

  /** Get the OAuth authorization URL for redirect-based flow */
  getAuthorizationUrl(state?: string): string;

  /** Exchange authorization code for tokens */
  exchangeCodeForTokens(code: string): Promise<AuthResult>;
}

