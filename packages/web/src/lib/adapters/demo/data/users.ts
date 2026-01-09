/**
 * Demo User Data
 * 
 * Sample user data for demo mode.
 */

import type { User, AvailabilityProfile, CrmUser } from '$lib/domain';

// =============================================================================
// Demo Users
// =============================================================================

export const DEMO_USERS: User[] = [
  {
    id: 'demo-u001',
    platformId: 12345,
    name: 'John Smith',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@demo.natterbox.com',
    username: 'john.smith@demo.natterbox.com',
    extension: '2001',
    mobilePhone: '+447123456789',
    status: 'active',
    enabled: true,
    licenses: {
      cti: true,
      pbx: true,
      manager: true,
      record: true,
      pci: false,
      scv: false,
      sms: true,
      whatsApp: false,
      insights: true,
      freedom: false,
    },
    permissionLevel: 'Admin',
    trackOutboundCTIDevice: true,
    availabilityProfile: 'Support Level 2',
    availabilityState: 'Available',
    linkedCrmUser: { name: 'John Smith', email: 'john.smith@demo.salesforce.com' },
    groups: ['Sales Team', 'UK Support'],
  },
  {
    id: 'demo-u002',
    platformId: 12346,
    name: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@demo.natterbox.com',
    username: 'jane.doe@demo.natterbox.com',
    extension: '2002',
    mobilePhone: '+447987654321',
    status: 'active',
    enabled: true,
    licenses: {
      cti: true,
      pbx: true,
      manager: false,
      record: true,
      pci: false,
      scv: true,
      sms: true,
      whatsApp: true,
      insights: true,
      freedom: false,
    },
    permissionLevel: 'Team Leader',
    trackOutboundCTIDevice: false,
    availabilityProfile: 'Default',
    availabilityState: 'Busy',
    linkedCrmUser: { name: 'Jane Doe', email: 'jane.doe@demo.salesforce.com' },
    groups: ['Support Team'],
  },
  {
    id: 'demo-u003',
    platformId: 12347,
    name: 'Bob Johnson',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@demo.natterbox.com',
    username: 'bob.johnson@demo.natterbox.com',
    extension: '2003',
    mobilePhone: '',
    status: 'inactive',
    enabled: false,
    licenses: {
      cti: false,
      pbx: false,
      manager: false,
      record: false,
      pci: false,
      scv: false,
      sms: false,
      whatsApp: false,
      insights: false,
      freedom: false,
    },
    permissionLevel: 'Basic',
    trackOutboundCTIDevice: false,
    linkedCrmUser: { name: 'Bob Johnson', email: 'bob.johnson@demo.salesforce.com' },
    groups: [],
  },
  {
    id: 'demo-u004',
    platformId: 12348,
    name: 'Alice Williams',
    firstName: 'Alice',
    lastName: 'Williams',
    email: 'alice.williams@demo.natterbox.com',
    username: 'alice.williams@demo.natterbox.com',
    extension: '2004',
    mobilePhone: '+447555123456',
    status: 'active',
    enabled: true,
    licenses: {
      cti: true,
      pbx: true,
      manager: false,
      record: false,
      pci: false,
      scv: false,
      sms: false,
      whatsApp: false,
      insights: false,
      freedom: true,
    },
    permissionLevel: 'Basic',
    trackOutboundCTIDevice: true,
    availabilityProfile: 'Platform Support',
    availabilityState: 'Available',
    linkedCrmUser: { name: 'Alice Williams', email: 'alice.williams@demo.salesforce.com' },
    groups: ['US Sales'],
  },
  {
    id: 'demo-u005',
    platformId: 12349,
    name: 'Charlie Brown',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie.brown@demo.natterbox.com',
    username: 'charlie.brown@demo.natterbox.com',
    extension: '2005',
    mobilePhone: '+447555987654',
    status: 'active',
    enabled: true,
    licenses: {
      cti: true,
      pbx: true,
      manager: true,
      record: true,
      pci: true,
      scv: false,
      sms: true,
      whatsApp: true,
      insights: true,
      freedom: false,
    },
    permissionLevel: 'Admin',
    trackOutboundCTIDevice: false,
    availabilityProfile: 'Default',
    availabilityState: 'Away',
    linkedCrmUser: { name: 'Charlie Brown', email: 'charlie.brown@demo.salesforce.com' },
    groups: ['Sales Team', 'Support Team'],
  },
];

// =============================================================================
// Demo Availability Profiles
// =============================================================================

export const DEMO_AVAILABILITY_PROFILES: AvailabilityProfile[] = [
  { id: 'demo-ap001', name: 'Default' },
  { id: 'demo-ap002', name: 'Support Level 2' },
  { id: 'demo-ap003', name: 'Platform Support' },
  { id: 'demo-ap004', name: 'After Hours' },
];

// =============================================================================
// Demo CRM Users
// =============================================================================

export const DEMO_CRM_USERS: CrmUser[] = [
  { id: 'demo-sf001', name: 'John Smith', email: 'john.smith@demo.salesforce.com' },
  { id: 'demo-sf002', name: 'Jane Doe', email: 'jane.doe@demo.salesforce.com' },
  { id: 'demo-sf003', name: 'Bob Johnson', email: 'bob.johnson@demo.salesforce.com' },
  { id: 'demo-sf004', name: 'Alice Williams', email: 'alice.williams@demo.salesforce.com' },
  { id: 'demo-sf005', name: 'Charlie Brown', email: 'charlie.brown@demo.salesforce.com' },
  { id: 'demo-sf006', name: 'Diana Prince', email: 'diana.prince@demo.salesforce.com' },
  { id: 'demo-sf007', name: 'Edward Norton', email: 'edward.norton@demo.salesforce.com' },
];

// =============================================================================
// Demo Group Memberships
// =============================================================================

export const DEMO_GROUP_MEMBERSHIPS: Map<string, string[]> = new Map([
  ['demo-u001', ['Sales Team', 'UK Support']],
  ['demo-u002', ['Support Team']],
  ['demo-u003', []],
  ['demo-u004', ['US Sales']],
  ['demo-u005', ['Sales Team', 'Support Team']],
]);
