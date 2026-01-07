import { z } from 'zod';

/**
 * Phone number type enum
 */
export const PhoneNumberType = {
  Local: 'local',
  TollFree: 'toll_free',
  Mobile: 'mobile',
  National: 'national',
  International: 'international',
} as const;

export type PhoneNumberType = (typeof PhoneNumberType)[keyof typeof PhoneNumberType];

/**
 * Phone number capability
 */
export const NumberCapability = {
  Voice: 'voice',
  SMS: 'sms',
  MMS: 'mms',
  Fax: 'fax',
} as const;

export type NumberCapability = (typeof NumberCapability)[keyof typeof NumberCapability];

/**
 * Assignment type for phone numbers
 */
export const AssignmentType = {
  User: 'user',
  Group: 'group',
  CallFlow: 'call_flow',
  Unassigned: 'unassigned',
} as const;

export type AssignmentType = (typeof AssignmentType)[keyof typeof AssignmentType];

/**
 * Zod schema for PhoneNumber validation
 */
export const PhoneNumberSchema = z.object({
  id: z.string(),
  number: z.string().min(1),
  formattedNumber: z.string().optional(),
  countryCode: z.string().length(2),
  type: z.enum(['local', 'toll_free', 'mobile', 'national', 'international']),
  capabilities: z.array(z.enum(['voice', 'sms', 'mms', 'fax'])).default(['voice']),
  assignmentType: z.enum(['user', 'group', 'call_flow', 'unassigned']),
  assignedToId: z.string().optional(),
  assignedToName: z.string().optional(),
  callFlowId: z.string().optional(),
  smsEnabled: z.boolean().default(false),
  faxEnabled: z.boolean().default(false),
  voicemailEnabled: z.boolean().default(false),
  callerIdEnabled: z.boolean().default(true),
  recordingEnabled: z.boolean().default(false),
  emergencyEnabled: z.boolean().default(false),
  emergencyLocationId: z.string().optional(),
  monthlyRentalCost: z.number().optional(),
  provider: z.string().optional(),
  isPortedIn: z.boolean().default(false),
  portedInDate: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
});

export type PhoneNumber = z.infer<typeof PhoneNumberSchema>;

/**
 * Schema for phone number assignment
 */
export const AssignPhoneNumberSchema = z.object({
  assignmentType: z.enum(['user', 'group', 'call_flow', 'unassigned']),
  assignedToId: z.string().optional(),
  callFlowId: z.string().optional(),
});

export type AssignPhoneNumber = z.infer<typeof AssignPhoneNumberSchema>;

