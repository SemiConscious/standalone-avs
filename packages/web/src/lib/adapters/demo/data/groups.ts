/**
 * Demo Group Data
 */

import type { Group, GroupMember } from '$lib/domain';

export const DEMO_GROUPS: Group[] = [
  {
    id: 'demo-g001',
    platformId: 101,
    name: 'Sales Team',
    description: 'Primary sales team queue',
    email: 'sales@demo.natterbox.com',
    extension: '3001',
    groupPickup: '*61',
    pbx: true,
    manager: false,
    record: true,
    lastModified: '2026-01-05T10:30:00Z',
    memberCount: 5,
  },
  {
    id: 'demo-g002',
    platformId: 102,
    name: 'Support Team',
    description: 'Customer support queue',
    email: 'support@demo.natterbox.com',
    extension: '3002',
    groupPickup: '*62',
    pbx: true,
    manager: true,
    record: true,
    lastModified: '2026-01-04T14:20:00Z',
    memberCount: 8,
  },
  {
    id: 'demo-g003',
    platformId: 103,
    name: 'UK Support',
    description: 'UK regional support',
    email: 'uk-support@demo.natterbox.com',
    extension: '3003',
    groupPickup: '*63',
    pbx: true,
    manager: false,
    record: false,
    lastModified: '2026-01-03T09:15:00Z',
    memberCount: 3,
  },
  {
    id: 'demo-g004',
    platformId: 104,
    name: 'US Sales',
    description: 'US regional sales',
    email: 'us-sales@demo.natterbox.com',
    extension: '3004',
    groupPickup: '*64',
    pbx: true,
    manager: false,
    record: false,
    lastModified: '2026-01-02T16:45:00Z',
    memberCount: 4,
  },
];

export const DEMO_GROUP_MEMBERS: GroupMember[] = [
  { id: 'demo-gm001', groupId: 'demo-g001', groupName: 'Sales Team', userId: 'demo-u001', userName: 'John Smith', ringOrder: 1 },
  { id: 'demo-gm002', groupId: 'demo-g001', groupName: 'Sales Team', userId: 'demo-u005', userName: 'Charlie Brown', ringOrder: 2 },
  { id: 'demo-gm003', groupId: 'demo-g002', groupName: 'Support Team', userId: 'demo-u002', userName: 'Jane Doe', ringOrder: 1 },
  { id: 'demo-gm004', groupId: 'demo-g002', groupName: 'Support Team', userId: 'demo-u005', userName: 'Charlie Brown', ringOrder: 2 },
  { id: 'demo-gm005', groupId: 'demo-g003', groupName: 'UK Support', userId: 'demo-u001', userName: 'John Smith', ringOrder: 1 },
  { id: 'demo-gm006', groupId: 'demo-g004', groupName: 'US Sales', userId: 'demo-u004', userName: 'Alice Williams', ringOrder: 1 },
];
