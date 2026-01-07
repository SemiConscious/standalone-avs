/**
 * Demo Mode Utilities
 * 
 * Centralized demo mode handling and sample data generation.
 * Use this module to check demo mode status and generate consistent sample data.
 */

import { env } from '$env/dynamic/private';

// =============================================================================
// Demo Mode Detection
// =============================================================================

/**
 * Check if the application is running in demo mode
 */
export function isDemoMode(): boolean {
  return env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1';
}

/**
 * Check if we have valid credentials or should fall back to demo mode
 */
export function shouldUseDemoMode(locals: App.Locals): boolean {
  if (isDemoMode()) return true;
  return !locals.accessToken || !locals.instanceUrl;
}

// =============================================================================
// Demo Response Builder
// =============================================================================

/**
 * Create a demo response with optional transformation
 */
export function createDemoResponse<T>(
  data: T,
  options?: {
    isDemo?: boolean;
    totalCount?: number;
    message?: string;
  }
): { data: T; isDemo: boolean; totalCount?: number; message?: string } {
  return {
    data,
    isDemo: options?.isDemo ?? true,
    totalCount: options?.totalCount,
    message: options?.message,
  };
}

// =============================================================================
// Demo Data: Users
// =============================================================================

export interface DemoUser {
  id: string;
  sapienId: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  extension: string;
  mobilePhone: string;
  status: 'active' | 'inactive' | 'suspended';
  enabled: boolean;
  licenses: {
    cti: boolean;
    pbx: boolean;
    manager: boolean;
    record: boolean;
    pci: boolean;
    scv: boolean;
    sms: boolean;
    whatsApp: boolean;
    insights: boolean;
    freedom: boolean;
  };
  permissionLevel: string;
  trackOutboundCTIDevice: boolean;
  availabilityProfile?: string;
  availabilityState?: string;
  linkedSalesforceUser?: { name: string; email: string };
  groups: string[];
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'demo-u001',
    sapienId: 12345,
    name: 'John Smith',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@demo.natterbox.com',
    username: 'john.smith@demo.natterbox.com',
    extension: '2001',
    mobilePhone: '+447123456789',
    status: 'active',
    enabled: true,
    licenses: { cti: true, pbx: true, manager: true, record: true, pci: false, scv: false, sms: true, whatsApp: false, insights: true, freedom: false },
    permissionLevel: 'Admin',
    trackOutboundCTIDevice: true,
    availabilityProfile: 'Support Level 2',
    availabilityState: 'Available',
    linkedSalesforceUser: { name: 'John Smith', email: 'john.smith@demo.salesforce.com' },
    groups: ['Sales Team', 'UK Support'],
  },
  {
    id: 'demo-u002',
    sapienId: 12346,
    name: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@demo.natterbox.com',
    username: 'jane.doe@demo.natterbox.com',
    extension: '2002',
    mobilePhone: '+447987654321',
    status: 'active',
    enabled: true,
    licenses: { cti: true, pbx: true, manager: false, record: true, pci: false, scv: true, sms: true, whatsApp: true, insights: true, freedom: false },
    permissionLevel: 'Team Leader',
    trackOutboundCTIDevice: false,
    availabilityProfile: 'Default',
    availabilityState: 'Busy',
    linkedSalesforceUser: { name: 'Jane Doe', email: 'jane.doe@demo.salesforce.com' },
    groups: ['Support Team'],
  },
  {
    id: 'demo-u003',
    sapienId: 12347,
    name: 'Bob Johnson',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@demo.natterbox.com',
    username: 'bob.johnson@demo.natterbox.com',
    extension: '2003',
    mobilePhone: '',
    status: 'inactive',
    enabled: false,
    licenses: { cti: false, pbx: false, manager: false, record: false, pci: false, scv: false, sms: false, whatsApp: false, insights: false, freedom: false },
    permissionLevel: 'Basic',
    trackOutboundCTIDevice: false,
    linkedSalesforceUser: { name: 'Bob Johnson', email: 'bob.johnson@demo.salesforce.com' },
    groups: [],
  },
  {
    id: 'demo-u004',
    sapienId: 12348,
    name: 'Alice Williams',
    firstName: 'Alice',
    lastName: 'Williams',
    email: 'alice.williams@demo.natterbox.com',
    username: 'alice.williams@demo.natterbox.com',
    extension: '2004',
    mobilePhone: '+447555123456',
    status: 'active',
    enabled: true,
    licenses: { cti: true, pbx: true, manager: false, record: false, pci: false, scv: false, sms: false, whatsApp: false, insights: false, freedom: true },
    permissionLevel: 'Basic',
    trackOutboundCTIDevice: true,
    availabilityProfile: 'Platform Support',
    availabilityState: 'Available',
    linkedSalesforceUser: { name: 'Alice Williams', email: 'alice.williams@demo.salesforce.com' },
    groups: ['US Sales'],
  },
];

// =============================================================================
// Demo Data: Groups
// =============================================================================

export interface DemoGroup {
  id: string;
  name: string;
  description: string;
  extension: string;
  type: 'callQueue' | 'huntGroup' | 'standard';
  ringStrategy: string;
  ringTimeout: number;
  memberCount: number;
  isActive: boolean;
  purposes: {
    pbx: boolean;
    manager: boolean;
    record: boolean;
  };
}

export const DEMO_GROUPS: DemoGroup[] = [
  {
    id: 'demo-g001',
    name: 'Sales Team',
    description: 'Primary sales team queue',
    extension: '3001',
    type: 'callQueue',
    ringStrategy: 'Round Robin',
    ringTimeout: 30,
    memberCount: 5,
    isActive: true,
    purposes: { pbx: true, manager: false, record: true },
  },
  {
    id: 'demo-g002',
    name: 'Support Team',
    description: 'Customer support queue',
    extension: '3002',
    type: 'callQueue',
    ringStrategy: 'Longest Idle',
    ringTimeout: 45,
    memberCount: 8,
    isActive: true,
    purposes: { pbx: true, manager: true, record: true },
  },
  {
    id: 'demo-g003',
    name: 'UK Support',
    description: 'UK regional support',
    extension: '3003',
    type: 'huntGroup',
    ringStrategy: 'Simultaneous',
    ringTimeout: 20,
    memberCount: 3,
    isActive: true,
    purposes: { pbx: true, manager: false, record: false },
  },
  {
    id: 'demo-g004',
    name: 'US Sales',
    description: 'US regional sales',
    extension: '3004',
    type: 'huntGroup',
    ringStrategy: 'Sequential',
    ringTimeout: 25,
    memberCount: 4,
    isActive: false,
    purposes: { pbx: true, manager: false, record: false },
  },
];

// =============================================================================
// Demo Data: Phone Numbers
// =============================================================================

export interface DemoPhoneNumber {
  id: string;
  number: string;
  displayName: string;
  country: string;
  countryCode: string;
  type: 'geographic' | 'mobile' | 'tollfree' | 'national';
  status: 'active' | 'inactive' | 'pending';
  assignedTo?: string;
  assignedType?: 'user' | 'group' | 'policy';
  routingPolicy?: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
}

export const DEMO_PHONE_NUMBERS: DemoPhoneNumber[] = [
  {
    id: 'demo-pn001',
    number: '+442071234567',
    displayName: 'London Main',
    country: 'United Kingdom',
    countryCode: 'GB',
    type: 'geographic',
    status: 'active',
    assignedTo: 'Sales Team',
    assignedType: 'group',
    routingPolicy: 'Inbound Sales',
    capabilities: { voice: true, sms: true, mms: false, fax: false },
  },
  {
    id: 'demo-pn002',
    number: '+442079876543',
    displayName: 'Support Line',
    country: 'United Kingdom',
    countryCode: 'GB',
    type: 'geographic',
    status: 'active',
    assignedTo: 'Support Team',
    assignedType: 'group',
    routingPolicy: 'Customer Support',
    capabilities: { voice: true, sms: true, mms: false, fax: false },
  },
  {
    id: 'demo-pn003',
    number: '+14155551234',
    displayName: 'US Toll Free',
    country: 'United States',
    countryCode: 'US',
    type: 'tollfree',
    status: 'active',
    assignedTo: 'US Sales',
    assignedType: 'group',
    routingPolicy: 'US Inbound',
    capabilities: { voice: true, sms: false, mms: false, fax: false },
  },
  {
    id: 'demo-pn004',
    number: '+447700900123',
    displayName: 'Mobile Pool',
    country: 'United Kingdom',
    countryCode: 'GB',
    type: 'mobile',
    status: 'active',
    capabilities: { voice: true, sms: true, mms: true, fax: false },
  },
  {
    id: 'demo-pn005',
    number: '+442033334444',
    displayName: 'New Number',
    country: 'United Kingdom',
    countryCode: 'GB',
    type: 'geographic',
    status: 'pending',
    capabilities: { voice: true, sms: false, mms: false, fax: false },
  },
];

// =============================================================================
// Demo Data: Routing Policies
// =============================================================================

export interface DemoPolicy {
  id: string;
  name: string;
  description: string;
  type: 'call' | 'digital' | 'outbound';
  status: 'active' | 'draft' | 'inactive';
  lastModified: string;
  nodeCount: number;
  phoneNumbers: string[];
}

export const DEMO_POLICIES: DemoPolicy[] = [
  {
    id: 'demo-pol001',
    name: 'Inbound Sales',
    description: 'Main inbound sales call flow',
    type: 'call',
    status: 'active',
    lastModified: '2025-01-05T14:30:00Z',
    nodeCount: 12,
    phoneNumbers: ['+442071234567'],
  },
  {
    id: 'demo-pol002',
    name: 'Customer Support',
    description: 'Customer support IVR and routing',
    type: 'call',
    status: 'active',
    lastModified: '2025-01-03T09:15:00Z',
    nodeCount: 18,
    phoneNumbers: ['+442079876543'],
  },
  {
    id: 'demo-pol003',
    name: 'After Hours',
    description: 'After hours voicemail and forwarding',
    type: 'call',
    status: 'active',
    lastModified: '2024-12-20T16:45:00Z',
    nodeCount: 6,
    phoneNumbers: [],
  },
  {
    id: 'demo-pol004',
    name: 'SMS Auto-Reply',
    description: 'Automatic SMS response flow',
    type: 'digital',
    status: 'draft',
    lastModified: '2025-01-06T11:00:00Z',
    nodeCount: 4,
    phoneNumbers: [],
  },
  {
    id: 'demo-pol005',
    name: 'US Inbound',
    description: 'US toll-free inbound routing',
    type: 'call',
    status: 'active',
    lastModified: '2025-01-01T08:00:00Z',
    nodeCount: 10,
    phoneNumbers: ['+14155551234'],
  },
];

// =============================================================================
// Demo Data: License Information
// =============================================================================

export interface DemoLicense {
  type: string;
  displayName: string;
  enabled: boolean;
  limit: number;
  used: number;
}

export const DEMO_LICENSES: DemoLicense[] = [
  { type: 'cti', displayName: 'CTI', enabled: true, limit: 50, used: 35 },
  { type: 'pbx', displayName: 'PBX', enabled: true, limit: 100, used: 42 },
  { type: 'manager', displayName: 'Manager', enabled: true, limit: 10, used: 5 },
  { type: 'record', displayName: 'Recording', enabled: true, limit: 50, used: 28 },
  { type: 'sms', displayName: 'SMS', enabled: true, limit: 25, used: 15 },
  { type: 'whatsApp', displayName: 'WhatsApp', enabled: true, limit: 10, used: 3 },
  { type: 'insights', displayName: 'AI Advisor', enabled: true, limit: 20, used: 8 },
  { type: 'freedom', displayName: 'Freedom', enabled: true, limit: 30, used: 12 },
  { type: 'pci', displayName: 'PCI Compliance', enabled: false, limit: 0, used: 0 },
  { type: 'scv', displayName: 'Service Cloud Voice', enabled: true, limit: 25, used: 10 },
];

// =============================================================================
// Demo Data Getter Functions
// =============================================================================

/**
 * Get demo user by ID
 */
export function getDemoUser(id: string): DemoUser | undefined {
  return DEMO_USERS.find(u => u.id === id);
}

/**
 * Get demo group by ID
 */
export function getDemoGroup(id: string): DemoGroup | undefined {
  return DEMO_GROUPS.find(g => g.id === id);
}

/**
 * Get demo phone number by ID
 */
export function getDemoPhoneNumber(id: string): DemoPhoneNumber | undefined {
  return DEMO_PHONE_NUMBERS.find(pn => pn.id === id);
}

/**
 * Get demo policy by ID
 */
export function getDemoPolicy(id: string): DemoPolicy | undefined {
  return DEMO_POLICIES.find(p => p.id === id);
}

