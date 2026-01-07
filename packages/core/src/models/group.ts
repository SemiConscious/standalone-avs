import { z } from 'zod';

/**
 * Group type enum
 */
export const GroupType = {
  Ring: 'ring',
  Queue: 'queue',
  Hunt: 'hunt',
  Broadcast: 'broadcast',
} as const;

export type GroupType = (typeof GroupType)[keyof typeof GroupType];

/**
 * Ring strategy for incoming calls
 */
export const RingStrategy = {
  RingAll: 'ring_all',
  RoundRobin: 'round_robin',
  LeastRecent: 'least_recent',
  FewestCalls: 'fewest_calls',
  Random: 'random',
  Linear: 'linear',
} as const;

export type RingStrategy = (typeof RingStrategy)[keyof typeof RingStrategy];

/**
 * Zod schema for Group validation
 */
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['ring', 'queue', 'hunt', 'broadcast']),
  extension: z.string().optional(),
  directDial: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
  managerIds: z.array(z.string()).default([]),
  ringStrategy: z.enum([
    'ring_all',
    'round_robin',
    'least_recent',
    'fewest_calls',
    'random',
    'linear',
  ]),
  ringTimeout: z.number().min(5).max(600).default(30),
  maxQueueSize: z.number().min(0).optional(),
  maxWaitTime: z.number().min(0).optional(),
  wrapUpTime: z.number().min(0).default(0),
  announcementInterval: z.number().min(0).optional(),
  musicOnHoldId: z.string().optional(),
  callFlowId: z.string().optional(),
  voicemailEnabled: z.boolean().default(false),
  voicemailGreetingId: z.string().optional(),
  recordingEnabled: z.boolean().default(false),
  callerIdName: z.string().optional(),
  callerIdNumber: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
});

export type Group = z.infer<typeof GroupSchema>;

/**
 * Schema for creating a new group
 */
export const CreateGroupSchema = GroupSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  memberIds: true,
  managerIds: true,
  ringStrategy: true,
  ringTimeout: true,
  wrapUpTime: true,
  isActive: true,
});

export type CreateGroup = z.infer<typeof CreateGroupSchema>;

/**
 * Schema for updating a group
 */
export const UpdateGroupSchema = GroupSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type UpdateGroup = z.infer<typeof UpdateGroupSchema>;

