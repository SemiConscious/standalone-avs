import { z } from 'zod';

/**
 * License type enum
 */
export const LicenseType = {
  Basic: 'basic',
  Standard: 'standard',
  Professional: 'professional',
  Enterprise: 'enterprise',
  ContactCenter: 'contact_center',
  Recording: 'recording',
  Analytics: 'analytics',
  Compliance: 'compliance',
} as const;

export type LicenseType = (typeof LicenseType)[keyof typeof LicenseType];

/**
 * Zod schema for License validation
 */
export const LicenseSchema = z.object({
  id: z.string(),
  type: z.enum([
    'basic',
    'standard',
    'professional',
    'enterprise',
    'contact_center',
    'recording',
    'analytics',
    'compliance',
  ]),
  name: z.string(),
  description: z.string().optional(),
  totalQuantity: z.number().min(0),
  usedQuantity: z.number().min(0),
  availableQuantity: z.number().min(0),
  features: z.array(z.string()).default([]),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type License = z.infer<typeof LicenseSchema>;

/**
 * Schema for license assignment
 */
export const LicenseAssignmentSchema = z.object({
  id: z.string(),
  licenseId: z.string(),
  licenseType: z.enum([
    'basic',
    'standard',
    'professional',
    'enterprise',
    'contact_center',
    'recording',
    'analytics',
    'compliance',
  ]),
  userId: z.string(),
  assignedById: z.string(),
  assignedAt: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export type LicenseAssignment = z.infer<typeof LicenseAssignmentSchema>;

/**
 * Schema for assigning a license
 */
export const AssignLicenseSchema = z.object({
  userId: z.string(),
  licenseType: z.enum([
    'basic',
    'standard',
    'professional',
    'enterprise',
    'contact_center',
    'recording',
    'analytics',
    'compliance',
  ]),
});

export type AssignLicense = z.infer<typeof AssignLicenseSchema>;

