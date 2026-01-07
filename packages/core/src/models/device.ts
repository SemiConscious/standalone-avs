import { z } from 'zod';

/**
 * Device type enum
 */
export const DeviceType = {
  DeskPhone: 'desk_phone',
  Softphone: 'softphone',
  WebRTC: 'webrtc',
  Mobile: 'mobile',
  Conference: 'conference',
} as const;

export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

/**
 * Device registration status
 */
export const RegistrationStatus = {
  Registered: 'registered',
  Unregistered: 'unregistered',
  Pending: 'pending',
  Failed: 'failed',
} as const;

export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

/**
 * Zod schema for Device validation
 */
export const DeviceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['desk_phone', 'softphone', 'webrtc', 'mobile', 'conference']),
  macAddress: z.string().optional(),
  ipAddress: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  firmwareVersion: z.string().optional(),
  assignedUserId: z.string().optional(),
  extension: z.string().optional(),
  sipUsername: z.string().optional(),
  sipPassword: z.string().optional(),
  sipDomain: z.string().optional(),
  registrationStatus: z.enum(['registered', 'unregistered', 'pending', 'failed']),
  isOnline: z.boolean().default(false),
  lastSeenAt: z.coerce.date().optional(),
  lastRegisteredAt: z.coerce.date().optional(),
  provisioningEnabled: z.boolean().default(true),
  emergencyLocationId: z.string().optional(),
  codec: z.string().optional(),
  transport: z.enum(['udp', 'tcp', 'tls']).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
});

export type Device = z.infer<typeof DeviceSchema>;

/**
 * Schema for creating a new device
 */
export const CreateDeviceSchema = DeviceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSeenAt: true,
  lastRegisteredAt: true,
  isOnline: true,
}).partial({
  registrationStatus: true,
  provisioningEnabled: true,
  isActive: true,
});

export type CreateDevice = z.infer<typeof CreateDeviceSchema>;

/**
 * Schema for updating a device
 */
export const UpdateDeviceSchema = DeviceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSeenAt: true,
  lastRegisteredAt: true,
}).partial();

export type UpdateDevice = z.infer<typeof UpdateDeviceSchema>;

