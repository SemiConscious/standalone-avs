/**
 * Projection helpers — map Charlie's GraphQL response shapes onto the
 * standalone-avs domain types in `$lib/domain`.
 *
 * Most fields line up 1:1 (Charlie's SDL was lifted from standalone-avs's
 * domain types verbatim during Phase 0). The places that need
 * intervention:
 *
 *   - Enum casing: Charlie returns UPPER_SNAKE (`ACTIVE`, `TEAM_LEADER`,
 *     `INBOUND`); the domain types use display strings (`active`,
 *     `'Team Leader'`, `'Inbound'`).
 *
 *   - `null` vs `undefined`: Charlie returns `null` for absent optional
 *     fields; the domain types use `undefined`. We coerce on the way in
 *     so consumers can keep using their existing patterns.
 *
 *   - `licenses`: Charlie returns the full `UserLicenses` object with
 *     all 10 booleans; we pass through unchanged but defensively use
 *     `createDefaultLicenses()` if the field is missing entirely.
 *
 *   - `permissionLevel` for `RoutingPolicy.status` etc: the domain stores
 *     uppercase ENABLED/DISABLED/DRAFT to match
 *     `@charlie/repositories.PolicyStatus`; Charlie's GraphQL also uses
 *     ENABLED/DISABLED/DRAFT (not display strings) so this one is direct.
 *
 * Each helper is idempotent — calling it twice produces the same domain
 * value. This lets us layer with minimal cognitive load.
 */

import type {
  CallDirection,
  CallLog,
  Device,
  Group,
  GroupMember,
  PaginationMeta,
  PermissionLevel,
  PhoneNumber,
  PolicySource,
  PolicyStatus,
  PolicyType,
  RoutingPolicy,
  User,
  UserLicenses,
  UserStatus,
} from '$lib/domain';
import { createDefaultLicenses } from '$lib/domain';

// =============================================================================
// Connection envelope (token-based pagination)
// =============================================================================

export interface CharlieConnection<T> {
  items: T[];
  continuationToken: string | null;
  hasMore: boolean;
}

/**
 * Synthesise a `PaginationMeta` from a Charlie connection envelope. The
 * SvelteKit page-server tier reads `pagination.totalItems` /
 * `pagination.hasNextPage` to drive the paging UI; Charlie's
 * connection only exposes `hasMore` + an opaque `continuationToken`.
 *
 * For totals, we report what we can: `totalItems = items.length` (the
 * page) and `totalPages = hasMore ? page + 1 : page`. Better totals
 * land when Charlie grows a `totalCount` resolver.
 */
export function projectConnectionPagination<T>(
  conn: CharlieConnection<T>,
  page: number,
  pageSize: number
): PaginationMeta {
  return {
    page,
    pageSize,
    totalItems: conn.items.length, // approximate — see comment above
    totalPages: conn.hasMore ? page + 1 : page,
    hasPreviousPage: page > 1,
    hasNextPage: conn.hasMore,
  };
}

// =============================================================================
// Users
// =============================================================================

interface CharlieUser {
  id: string;
  platformId: number | null;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  extension: string;
  mobilePhone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  enabled: boolean;
  licenses: CharlieUserLicenses | null;
  permissionLevel: 'BASIC' | 'TEAM_LEADER' | 'ADMIN';
  trackOutboundCtiDevice: boolean;
  availabilityProfile: string | null;
  availabilityState: string | null;
  linkedCrmUser: { name: string; email: string } | null;
  groups: string[];
}

interface CharlieUserLicenses {
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
}

export function projectCharlieUser(u: CharlieUser): User {
  const licenses: UserLicenses = u.licenses
    ? {
        cti: u.licenses.cti,
        pbx: u.licenses.pbx,
        manager: u.licenses.manager,
        record: u.licenses.record,
        pci: u.licenses.pci,
        scv: u.licenses.scv,
        sms: u.licenses.sms,
        whatsApp: u.licenses.whatsApp,
        insights: u.licenses.insights,
        freedom: u.licenses.freedom,
      }
    : createDefaultLicenses();

  const out: User = {
    id: u.id,
    name: u.name,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    username: u.username,
    extension: u.extension,
    mobilePhone: u.mobilePhone,
    status: charlieUserStatusToDomain(u.status),
    enabled: u.enabled,
    licenses,
    permissionLevel: charliePermissionLevelToDomain(u.permissionLevel),
    trackOutboundCTIDevice: u.trackOutboundCtiDevice,
    groups: u.groups,
  };
  if (u.platformId != null) out.platformId = u.platformId;
  if (u.availabilityProfile != null) out.availabilityProfile = u.availabilityProfile;
  if (u.availabilityState != null) out.availabilityState = u.availabilityState;
  if (u.linkedCrmUser != null) out.linkedCrmUser = u.linkedCrmUser;
  return out;
}

function charlieUserStatusToDomain(value: CharlieUser['status']): UserStatus {
  switch (value) {
    case 'ACTIVE':
      return 'active';
    case 'INACTIVE':
      return 'inactive';
    case 'SUSPENDED':
      return 'suspended';
  }
}

function charliePermissionLevelToDomain(value: CharlieUser['permissionLevel']): PermissionLevel {
  switch (value) {
    case 'BASIC':
      return 'Basic';
    case 'TEAM_LEADER':
      return 'Team Leader';
    case 'ADMIN':
      return 'Admin';
  }
}

// =============================================================================
// Groups
// =============================================================================

interface CharlieGroup {
  id: string;
  platformId: number | null;
  name: string;
  description: string;
  email: string;
  extension: string;
  groupPickup: string;
  pbx: boolean;
  manager: boolean;
  record: boolean;
  lastModified: string;
  memberCount: number | null;
}

export function projectCharlieGroup(g: CharlieGroup): Group {
  const out: Group = {
    id: g.id,
    name: g.name,
    description: g.description,
    email: g.email,
    extension: g.extension,
    groupPickup: g.groupPickup,
    pbx: g.pbx,
    manager: g.manager,
    record: g.record,
    lastModified: g.lastModified,
  };
  if (g.platformId != null) out.platformId = g.platformId;
  if (g.memberCount != null) out.memberCount = g.memberCount;
  return out;
}

interface CharlieGroupMember {
  id: string;
  groupId: string;
  groupName: string;
  userId: string;
  userName: string;
  ringOrder: number | null;
}

export function projectCharlieGroupMember(m: CharlieGroupMember): GroupMember {
  const out: GroupMember = {
    id: m.id,
    groupId: m.groupId,
    groupName: m.groupName,
    userId: m.userId,
    userName: m.userName,
  };
  if (m.ringOrder != null) out.ringOrder = m.ringOrder;
  return out;
}

// =============================================================================
// Devices
// =============================================================================

interface CharlieDevice {
  id: string;
  platformId: number | null;
  extension: string;
  location: string;
  description: string;
  type: 'SIP' | 'Softphone' | 'Web Phone' | 'Mobile' | 'Unknown';
  model: string;
  macAddress: string;
  enabled: boolean;
  registered: boolean;
  registrationExpiry: string | null;
  lastModified: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
}

export function projectCharlieDevice(d: CharlieDevice): Device {
  const out: Device = {
    id: d.id,
    extension: d.extension,
    location: d.location,
    description: d.description,
    type: d.type,
    model: d.model,
    macAddress: d.macAddress,
    enabled: d.enabled,
    registered: d.registered,
    lastModified: d.lastModified,
  };
  if (d.platformId != null) out.platformId = d.platformId;
  if (d.registrationExpiry != null) out.registrationExpiry = d.registrationExpiry;
  if (d.assignedUserId != null) out.assignedUserId = d.assignedUserId;
  if (d.assignedUserName != null) out.assignedUserName = d.assignedUserName;
  return out;
}

// =============================================================================
// Phone numbers
// =============================================================================

interface CharliePhoneNumber {
  id: string;
  name: string;
  number: string;
  formattedNumber: string;
  country: string;
  countryCode: string;
  area: string;
  areaCode: string;
  localNumber: string;
  isDDI: boolean;
  isGeographic: boolean;
  smsEnabled: boolean;
  mmsEnabled: boolean;
  voiceEnabled: boolean;
  localPresenceEnabled: boolean;
  lastModified: string;
  userId: string | null;
  userName: string | null;
  callFlowId: string | null;
  callFlowName: string | null;
}

export function projectCharliePhoneNumber(n: CharliePhoneNumber): PhoneNumber {
  const out: PhoneNumber = {
    id: n.id,
    name: n.name,
    number: n.number,
    formattedNumber: n.formattedNumber,
    country: n.country,
    countryCode: n.countryCode,
    area: n.area,
    areaCode: n.areaCode,
    localNumber: n.localNumber,
    isDDI: n.isDDI,
    isGeographic: n.isGeographic,
    smsEnabled: n.smsEnabled,
    mmsEnabled: n.mmsEnabled,
    voiceEnabled: n.voiceEnabled,
    localPresenceEnabled: n.localPresenceEnabled,
    lastModified: n.lastModified,
  };
  if (n.userId != null) out.userId = n.userId;
  if (n.userName != null) out.userName = n.userName;
  if (n.callFlowId != null) out.callFlowId = n.callFlowId;
  if (n.callFlowName != null) out.callFlowName = n.callFlowName;
  return out;
}

// =============================================================================
// Routing policies
// =============================================================================

interface CharlieRoutingPolicy {
  id: string;
  platformId: number | null;
  name: string;
  description: string;
  source: PolicySource;
  type: PolicyType;
  status: PolicyStatus;
  createdById: string;
  createdByName: string;
  createdDate: string;
  lastModifiedById: string;
  lastModifiedByName: string;
  lastModifiedDate: string;
  phoneNumbers: string[];
}

// =============================================================================
// Call logs
// =============================================================================

interface CharlieCallLog {
  id: string;
  callId: string | null;
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
  outcome: 'ANSWERED' | 'MISSED' | 'ABANDONED' | 'TRANSFERRED' | 'VOICEMAIL' | 'FAILED';
  fromNumber: string | null;
  toNumber: string | null;
  fromUserId: string | null;
  fromUserName: string | null;
  toUserId: string | null;
  toUserName: string | null;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  ringingTimeSeconds: number | null;
  huntingTimeSeconds: number | null;
  hasRecording: boolean;
  recordingId: string | null;
}

export function projectCharlieCallLog(c: CharlieCallLog): CallLog {
  const out: CallLog = {
    id: c.id,
    dateTime: c.startedAt,
    fromNumber: c.fromNumber ?? '',
    toNumber: c.toNumber ?? '',
    direction: charlieCallDirectionToDomain(c.direction),
    duration: c.durationSeconds ?? 0,
    ringingTime: c.ringingTimeSeconds ?? 0,
    huntingTime: c.huntingTimeSeconds ?? 0,
    hasRecording: c.hasRecording,
  };
  if (c.recordingId != null) out.recordingId = c.recordingId;
  if (c.fromUserId != null) out.fromUserId = c.fromUserId;
  if (c.fromUserName != null) out.fromUserName = c.fromUserName;
  if (c.toUserId != null) out.toUserId = c.toUserId;
  if (c.toUserName != null) out.toUserName = c.toUserName;
  return out;
}

function charlieCallDirectionToDomain(value: CharlieCallLog['direction']): CallDirection {
  switch (value) {
    case 'INBOUND':
      return 'Inbound';
    case 'OUTBOUND':
      return 'Outbound';
    case 'INTERNAL':
      return 'Internal';
  }
}

export function projectCharlieRoutingPolicy(p: CharlieRoutingPolicy): RoutingPolicy {
  const out: RoutingPolicy = {
    id: p.id,
    name: p.name,
    description: p.description,
    source: p.source,
    type: p.type,
    status: p.status,
    createdById: p.createdById,
    createdByName: p.createdByName,
    createdDate: p.createdDate,
    lastModifiedById: p.lastModifiedById,
    lastModifiedByName: p.lastModifiedByName,
    lastModifiedDate: p.lastModifiedDate,
    phoneNumbers: p.phoneNumbers,
  };
  if (p.platformId != null) out.platformId = p.platformId;
  return out;
}
