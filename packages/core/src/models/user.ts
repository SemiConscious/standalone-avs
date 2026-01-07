import { z } from 'zod';

/**
 * User status enum
 */
export const UserStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
  Suspended: 'suspended',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/**
 * User presence status
 */
export const PresenceStatus = {
  Available: 'available',
  Busy: 'busy',
  Away: 'away',
  DoNotDisturb: 'dnd',
  Offline: 'offline',
} as const;

export type PresenceStatus = (typeof PresenceStatus)[keyof typeof PresenceStatus];

/**
 * Zod schema for User validation
 */
export const UserSchema = z.object({
  id: z.string(),
  externalId: z.string().optional(),
  username: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  displayName: z.string().optional(),
  extension: z.string().optional(),
  directDial: z.string().optional(),
  mobileNumber: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']),
  presenceStatus: z.enum(['available', 'busy', 'away', 'dnd', 'offline']).optional(),
  groupIds: z.array(z.string()).default([]),
  deviceIds: z.array(z.string()).default([]),
  licenseTypes: z.array(z.string()).default([]),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  voicemailEnabled: z.boolean().default(false),
  recordingEnabled: z.boolean().default(false),
  callerIdName: z.string().optional(),
  callerIdNumber: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastLoginAt: z.coerce.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Schema for creating a new user
 */
export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).partial({
  status: true,
  presenceStatus: true,
  groupIds: true,
  deviceIds: true,
  licenseTypes: true,
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

/**
 * Schema for updating a user
 */
export const UpdateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).partial();

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

