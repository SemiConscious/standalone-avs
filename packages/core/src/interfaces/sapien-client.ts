import { type User, type Group, type Device, type PhoneNumber, type CallFlow } from '../models/index.js';

/**
 * Pagination options for list operations
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * User service interface
 */
export interface IUserService {
  list(options?: PaginationOptions): Promise<PaginatedResponse<User>>;
  get(userId: string): Promise<User>;
  create(user: Partial<User>): Promise<User>;
  update(userId: string, user: Partial<User>): Promise<User>;
  delete(userId: string): Promise<void>;
  activate(userId: string): Promise<User>;
  deactivate(userId: string): Promise<User>;
  assignLicense(userId: string, licenseType: string): Promise<void>;
  revokeLicense(userId: string, licenseType: string): Promise<void>;
}

/**
 * Group service interface
 */
export interface IGroupService {
  list(options?: PaginationOptions): Promise<PaginatedResponse<Group>>;
  get(groupId: string): Promise<Group>;
  create(group: Partial<Group>): Promise<Group>;
  update(groupId: string, group: Partial<Group>): Promise<Group>;
  delete(groupId: string): Promise<void>;
  addMember(groupId: string, userId: string): Promise<void>;
  removeMember(groupId: string, userId: string): Promise<void>;
  getMembers(groupId: string): Promise<User[]>;
}

/**
 * Device service interface
 */
export interface IDeviceService {
  list(options?: PaginationOptions): Promise<PaginatedResponse<Device>>;
  get(deviceId: string): Promise<Device>;
  create(device: Partial<Device>): Promise<Device>;
  update(deviceId: string, device: Partial<Device>): Promise<Device>;
  delete(deviceId: string): Promise<void>;
  assignToUser(deviceId: string, userId: string): Promise<void>;
  unassignFromUser(deviceId: string): Promise<void>;
  getStatus(deviceId: string): Promise<DeviceStatus>;
}

/**
 * Device status information
 */
export interface DeviceStatus {
  deviceId: string;
  isOnline: boolean;
  lastSeen?: Date;
  registrationStatus: 'registered' | 'unregistered' | 'pending';
  sipStatus?: string;
}

/**
 * Phone number service interface
 */
export interface IPhoneNumberService {
  list(options?: PaginationOptions): Promise<PaginatedResponse<PhoneNumber>>;
  get(numberId: string): Promise<PhoneNumber>;
  assignToUser(numberId: string, userId: string): Promise<void>;
  assignToGroup(numberId: string, groupId: string): Promise<void>;
  unassign(numberId: string): Promise<void>;
  setCallFlow(numberId: string, callFlowId: string): Promise<void>;
}

/**
 * Call flow service interface
 */
export interface ICallFlowService {
  list(options?: PaginationOptions): Promise<PaginatedResponse<CallFlow>>;
  get(callFlowId: string): Promise<CallFlow>;
  create(callFlow: Partial<CallFlow>): Promise<CallFlow>;
  update(callFlowId: string, callFlow: Partial<CallFlow>): Promise<CallFlow>;
  delete(callFlowId: string): Promise<void>;
  duplicate(callFlowId: string, newName: string): Promise<CallFlow>;
  publish(callFlowId: string): Promise<void>;
  getVersions(callFlowId: string): Promise<CallFlowVersion[]>;
}

/**
 * Call flow version information
 */
export interface CallFlowVersion {
  id: string;
  version: number;
  createdAt: Date;
  createdBy: string;
  isPublished: boolean;
}

/**
 * Insights service interface
 */
export interface IInsightsService {
  getCallStats(startDate: Date, endDate: Date): Promise<CallStats>;
  getUserStats(userId: string, startDate: Date, endDate: Date): Promise<UserCallStats>;
  getGroupStats(groupId: string, startDate: Date, endDate: Date): Promise<GroupCallStats>;
  getRealtimeStats(): Promise<RealtimeStats>;
}

/**
 * Call statistics
 */
export interface CallStats {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  averageDuration: number;
  totalDuration: number;
}

/**
 * User call statistics
 */
export interface UserCallStats extends CallStats {
  userId: string;
  inboundCalls: number;
  outboundCalls: number;
}

/**
 * Group call statistics
 */
export interface GroupCallStats extends CallStats {
  groupId: string;
  averageWaitTime: number;
  abandonedCalls: number;
}

/**
 * Real-time statistics
 */
export interface RealtimeStats {
  activeCalls: number;
  availableAgents: number;
  callsInQueue: number;
  longestWaitTime: number;
}

/**
 * License service interface
 */
export interface ILicenseService {
  getAvailable(): Promise<LicenseInfo[]>;
  getAssigned(): Promise<LicenseAssignment[]>;
  assign(userId: string, licenseType: string): Promise<void>;
  revoke(userId: string, licenseType: string): Promise<void>;
}

/**
 * License information
 */
export interface LicenseInfo {
  type: string;
  name: string;
  total: number;
  used: number;
  available: number;
}

/**
 * License assignment
 */
export interface LicenseAssignment {
  userId: string;
  licenseType: string;
  assignedAt: Date;
}

/**
 * Settings service interface
 */
export interface ISettingsService {
  getGeneral(): Promise<GeneralSettings>;
  updateGeneral(settings: Partial<GeneralSettings>): Promise<GeneralSettings>;
  getApiSettings(): Promise<ApiSettings>;
  updateApiSettings(settings: Partial<ApiSettings>): Promise<ApiSettings>;
}

/**
 * General settings
 */
export interface GeneralSettings {
  organizationName: string;
  timezone: string;
  dateFormat: string;
  defaultCountryCode: string;
  recordingEnabled: boolean;
  voicemailEnabled: boolean;
}

/**
 * API settings
 */
export interface ApiSettings {
  apiEndpoint: string;
  websocketEndpoint: string;
  gatekeeperEndpoint: string;
}

/**
 * Authentication token info
 */
export interface SapienTokenInfo {
  accessToken: string;
  expiresAt: Date;
  organizationId: string;
}

/**
 * Main Sapien API client interface
 * This separates all Sapien-specific API concerns from platform logic
 */
export interface ISapienClient {
  /** User management operations */
  users: IUserService;

  /** Group management operations */
  groups: IGroupService;

  /** Device management operations */
  devices: IDeviceService;

  /** Phone number operations */
  phoneNumbers: IPhoneNumberService;

  /** Call flow operations */
  callFlows: ICallFlowService;

  /** Insights and analytics */
  insights: IInsightsService;

  /** License management */
  licenses: ILicenseService;

  /** Settings management */
  settings: ISettingsService;

  /** Initialize the client with credentials */
  initialize(config: SapienClientConfig): Promise<void>;

  /** Get current authentication status */
  isAuthenticated(): boolean;

  /** Refresh authentication token */
  refreshAuth(): Promise<SapienTokenInfo>;

  /** Get the current organization ID */
  getOrganizationId(): string;
}

/**
 * Sapien client configuration
 */
export interface SapienClientConfig {
  apiBaseUrl: string;
  gatekeeperUrl: string;
  clientId: string;
  clientSecret: string;
  organizationId?: string;
}

