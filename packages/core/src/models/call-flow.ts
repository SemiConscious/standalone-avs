import { z } from 'zod';

/**
 * Call flow status
 */
export const CallFlowStatus = {
  Draft: 'draft',
  Published: 'published',
  Archived: 'archived',
} as const;

export type CallFlowStatus = (typeof CallFlowStatus)[keyof typeof CallFlowStatus];

/**
 * Node types available in call flows
 */
export const NodeType = {
  Start: 'start',
  End: 'end',
  Menu: 'menu',
  Transfer: 'transfer',
  Voicemail: 'voicemail',
  Queue: 'queue',
  TimeCondition: 'time_condition',
  Announcement: 'announcement',
  Hangup: 'hangup',
  Dial: 'dial',
  Bridge: 'bridge',
  Record: 'record',
  Gather: 'gather',
  HttpRequest: 'http_request',
  SetVariable: 'set_variable',
  Condition: 'condition',
  SubFlow: 'sub_flow',
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/**
 * Schema for a call flow node
 */
export const CallFlowNodeSchema = z.object({
  id: z.string(),
  type: z.enum([
    'start',
    'end',
    'menu',
    'transfer',
    'voicemail',
    'queue',
    'time_condition',
    'announcement',
    'hangup',
    'dial',
    'bridge',
    'record',
    'gather',
    'http_request',
    'set_variable',
    'condition',
    'sub_flow',
  ]),
  name: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.unknown()).optional(),
  nextNodeId: z.string().optional(),
  errorNodeId: z.string().optional(),
});

export type CallFlowNode = z.infer<typeof CallFlowNodeSchema>;

/**
 * Schema for a call flow edge/connection
 */
export const CallFlowEdgeSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  label: z.string().optional(),
  condition: z.string().optional(),
});

export type CallFlowEdge = z.infer<typeof CallFlowEdgeSchema>;

/**
 * Zod schema for CallFlow validation
 */
export const CallFlowSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  version: z.number().default(1),
  nodes: z.array(CallFlowNodeSchema).default([]),
  edges: z.array(CallFlowEdgeSchema).default([]),
  startNodeId: z.string().optional(),
  variables: z.record(z.string()).optional(),
  assignedNumberIds: z.array(z.string()).default([]),
  createdById: z.string(),
  updatedById: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
  publishedById: z.string().optional(),
  isTemplate: z.boolean().default(false),
  templateCategoryId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
});

export type CallFlow = z.infer<typeof CallFlowSchema>;

/**
 * Schema for creating a new call flow
 */
export const CreateCallFlowSchema = CallFlowSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  publishedById: true,
  updatedById: true,
}).partial({
  status: true,
  version: true,
  nodes: true,
  edges: true,
  assignedNumberIds: true,
  isTemplate: true,
  tags: true,
});

export type CreateCallFlow = z.infer<typeof CreateCallFlowSchema>;

/**
 * Schema for updating a call flow
 */
export const UpdateCallFlowSchema = CallFlowSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
}).partial();

export type UpdateCallFlow = z.infer<typeof UpdateCallFlowSchema>;

