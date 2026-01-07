/**
 * Policy Service
 * Ported from natterbox-routing-policies/src/services/policy.service.js
 * 
 * Provides policy cloning, export, and validation functionality.
 */

import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash-es';
import { NODE_ID } from './nodeClassName';
import { buildPayload, buildBody__c } from './buildPayload';

// Regex patterns for policy cloning
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const SCREEN_HOOK_REGEX = /[0-9a-f]{32}/gi;
const MACRO_REGEX = /\$\([^)]+\)/gi;
const SOUND_TAG_REGEX = /\{[^}]+\}/gi;

// Policy types
export const POLICY_TYPE = {
  CALL: 'CALL',
  DATA_ANALYTICS: 'DATA_ANALYTICS',
  DIGITAL: 'DIGITAL',
} as const;

export type PolicyType = typeof POLICY_TYPE[keyof typeof POLICY_TYPE];

// Node template classes that require special handling
const TEMPLATE_CLASSES = {
  MOD_NUMBER: 'ModNumber',
  MOD_START_DIGITAL: 'ModStartDigital',
  MOD_POLICY: 'ModPolicy',
  MOD_POLICY_NC: 'ModPolicyNC',
  MOD_POLICY_TO_NON_CALL: 'ModPolicy_ToNonCall',
  MOD_POLICY_TO_CALL: 'ModPolicy_ToCall',
  MOD_CONNECT: 'ModConnect',
  MOD_CONNECT_FOLLOW_ME: 'ModConnect_FollowMe',
  MOD_CONNECT_QUEUE: 'ModConnect_Queue',
  MOD_ACTION_RECORD: 'ModAction_Record',
  MOD_ACTION_RECORD_ANALYSE: 'ModAction_RecordAnalyse',
  MOD_ACTION_REQUEST_SKILLS: 'ModAction_RequestSkills',
  MOD_ACTION_NOTIFY: 'ModAction_Notify',
  MOD_FINISH_VOICEMAIL: 'ModFinish_VoiceMail',
  NATTERBOX_AI_VOICE_KNOWLEDGE: 'NatterboxAI_VoiceAIKnowledge',
  NATTERBOX_AI_DIGITAL_KNOWLEDGE: 'NatterboxAI_DigitalAIKnowledge',
  NATTERBOX_AI_DIGITAL_AGENT: 'NatterboxAI_DigitalAIAgent',
  NATTERBOX_AI_VOICE_AGENT: 'NatterboxAIVoice_VoiceAIAgent',
} as const;

export interface PolicyNode {
  id: string;
  templateId: number;
  templateClass?: string;
  name?: string;
  title?: string;
  x?: number;
  y?: number;
  position?: { x: number; y: number };
  outputs?: PolicyOutput[];
  subItems?: Array<{
    name: string;
    variables?: Record<string, unknown>;
  }>;
  variables?: Record<string, unknown>;
  config?: Record<string, unknown>;
  data?: {
    outputs?: PolicyOutput[];
    variables?: Record<string, unknown>;
    [key: string]: unknown;
  };
  connectedFromNode?: string | null;
  connectedFromItem?: string | null;
  [key: string]: unknown;
}

export interface PolicyOutput {
  id?: string;
  name?: string;
  templateClass?: string;
  variables?: Record<string, unknown>;
  config?: Record<string, unknown>;
  subItems?: Record<string, unknown[]>;
  position?: { x: number; y: number };
  [key: string]: unknown;
}

export interface PolicyConnection {
  id: string;
  source: { nodeID: string };
  [key: string]: unknown;
}

export interface Policy {
  id?: string;
  Id?: string;
  Id__c?: number | null;
  name?: string;
  Name?: string;
  description?: string;
  Description__c?: string;
  type?: { advanced?: string };
  Type__c?: string;
  nodes: PolicyNode[];
  connections?: PolicyConnection[];
  edges?: Array<{ id: string; source: string; target: string }>;
  [key: string]: unknown;
}

export interface ClonePolicyConfig {
  ConnectorId__c?: string;
  DevOrgId__c?: string;
  OrganizationId__c?: number;
}

export interface ClonePolicyOptions {
  policy: Policy;
  config?: ClonePolicyConfig;
  sounds?: Array<{ Id: string; Id__c?: string; Tag__c?: string }>;
  users?: Array<{ Id: string; Id__c?: string }>;
  groups?: Array<{ Id: string; Id__c?: string }>;
  skills?: Array<{ Id: string; Id__c?: string; Name?: string }>;
  sfUsers?: Array<{ Id: string }>;
  chatterGroups?: Array<{ Id: string }>;
  displayAlert?: (message: string) => void;
  namespacePrefix?: string;
}

export interface CloneReport {
  messages: string[];
}

/**
 * Generate a random screen hook ID (32 hex characters)
 */
function generateScreenHookId(): string {
  return uuidv4().replace(/-/g, '');
}

/**
 * Check if an entity exists in the org by ID
 */
function checkIfExistsInOrgById(
  data: Array<{ Id?: string; Id__c?: string }>,
  id: string | number | undefined
): boolean {
  if (!id) return false;
  const idStr = String(id);
  return data.some(({ Id__c, Id }) => 
    (Id__c !== undefined && String(Id__c) === idStr) || 
    (Id !== undefined && Id === idStr)
  );
}

/**
 * Generate a report message for removed/kept references
 */
function getReportMessage(
  nodeName: string | undefined,
  elementName: string | undefined,
  type: string,
  target: string | number | undefined,
  removed: boolean
): string {
  return `Component: ${nodeName} -> Element: ${elementName} has ${removed ? 'removed ' : ''}reference to ${type} Id: ${target}`;
}

/**
 * Filter out connections that originate from a specific node
 */
function filterSourceConnections(
  connections: PolicyConnection[] | undefined,
  nodeId: string
): PolicyConnection[] {
  if (!connections) return [];
  return connections.filter(({ source }) => source.nodeID !== nodeId);
}

/**
 * Reset knowledge base fields for AI nodes
 */
function resetKnowledgeBaseFields(
  component: Record<string, unknown>,
  report: CloneReport
): Record<string, unknown> {
  if (component.knowledgeBaseId) {
    report.messages.push(`Removed Knowledge base with ID: ${component.knowledgeBaseId}`);
  }
  
  const tagFilter = component.tagFilter as unknown[] | undefined;
  if (tagFilter?.length) {
    tagFilter.forEach((tag) => {
      report.messages.push(`Removed Tag: ${tag}`);
    });
  }
  
  const metaPropertyFilter = component.metaPropertyFilter as Array<{ label: string; value: string }> | undefined;
  if (metaPropertyFilter?.length) {
    metaPropertyFilter.forEach(({ label, value }) => {
      report.messages.push(`Removed Meta Property: ${label} / ${value}`);
    });
  }
  
  return {
    ...component,
    tagFilter: [],
    metaPropertyFilter: [],
    knowledgeBaseId: null,
  };
}

/**
 * Reset agent fields for AI agent nodes
 */
function resetAgentFields(
  component: Record<string, unknown>,
  report: CloneReport
): Record<string, unknown> {
  if (component.agentId) {
    report.messages.push(`Removed Agent with ID: ${component.agentId}`);
  }
  
  return {
    ...component,
    tokens: [],
    agentId: null,
    agentVersion: 'HEAD',
  };
}

/**
 * Check and update ModConnect variables (Connect a Call node)
 */
function checkModConnectVariables(
  element: PolicyOutput,
  report: CloneReport,
  nodeName: string | undefined,
  users: Array<{ Id: string; Id__c?: string }>,
  groups: Array<{ Id: string; Id__c?: string }>
): void {
  const connectAction = element.config?.connectAction as Record<string, { method: string; target: string | null }> | undefined;
  if (!connectAction) return;
  
  Object.values(connectAction).forEach((item) => {
    if (item.method === 'USER') {
      const exists = checkIfExistsInOrgById(users, item.target ?? undefined);
      report.messages.push(getReportMessage(nodeName, element.name, 'User', item.target ?? undefined, !exists));
      if (!exists) item.target = null;
    } else if (item.method === 'GROUP') {
      const exists = checkIfExistsInOrgById(groups, item.target ?? undefined);
      report.messages.push(getReportMessage(nodeName, element.name, 'Group', item.target ?? undefined, !exists));
      if (!exists) item.target = null;
    }
  });
}

/**
 * Check and update FollowMe variables (Hunt Group node)
 */
function checkFollowMeVariables(
  element: PolicyOutput,
  report: CloneReport,
  nodeName: string | undefined,
  users: Array<{ Id: string; Id__c?: string }>,
  groups: Array<{ Id: string; Id__c?: string }>
): void {
  const followMe = element.config?.followMe as Array<{ method: string; target: string | null }> | undefined;
  if (!followMe) return;
  
  followMe.forEach((item) => {
    if (item.method === 'USER') {
      const exists = checkIfExistsInOrgById(users, item.target ?? undefined);
      report.messages.push(getReportMessage(nodeName, element.name, 'User', item.target ?? undefined, !exists));
      if (!exists) item.target = null;
    } else if (item.method === 'GROUP') {
      const exists = checkIfExistsInOrgById(groups, item.target ?? undefined);
      report.messages.push(getReportMessage(nodeName, element.name, 'Group', item.target ?? undefined, !exists));
      if (!exists) item.target = null;
    }
  });
}

/**
 * Check and update Queue variables (Call Queue node)
 */
function checkQueueVariables(
  element: PolicyOutput,
  report: CloneReport,
  nodeName: string | undefined,
  groups: Array<{ Id: string; Id__c?: string }>,
  sounds: Array<{ Id: string; Id__c?: string; Tag__c?: string }>
): void {
  // Check ring targets
  const ringTargets = element.variables?.ringTargets as Array<{ groupId: string | null; $$hashKey?: string }> | undefined;
  if (ringTargets) {
    ringTargets.forEach((item) => {
      const exists = checkIfExistsInOrgById(groups, item.groupId ?? undefined);
      report.messages.push(getReportMessage(nodeName, element.name, 'Group', item.groupId ?? undefined, !exists));
      delete item.$$hashKey;
      if (!exists) item.groupId = null;
    });
  }
  
  // Check announcements
  const announcements = element.variables?.announcements as Array<{ soundId?: string | number }> | undefined;
  if (announcements) {
    announcements.forEach((item) => {
      if (item.soundId !== undefined) {
        const exists = checkIfExistsInOrgById(sounds, item.soundId);
        report.messages.push(getReportMessage(nodeName, element.name, 'Sound', item.soundId, !exists));
        if (!exists) item.soundId = '';
      }
    });
  }
  
  // Check chime configurations
  const checkChime = (chimeConfig: Array<{ chime?: string }> | undefined) => {
    if (!chimeConfig) return;
    chimeConfig.forEach((item) => {
      if (item.chime) {
        const exists = sounds.some(({ Tag__c }) => Tag__c === item.chime);
        if (!exists) item.chime = '';
      }
    });
  };
  
  const configCallbackAndChime = element.configCallbackAndChime as { chime?: Array<{ chime?: string }> } | undefined;
  checkChime(configCallbackAndChime?.chime);
  
  const configForLuaScript = element.configForLuaScript as { chime?: Array<{ chime?: string }> } | undefined;
  checkChime(configForLuaScript?.chime);
  
  // Check config screen announcement
  const configScreen = element.configScreen as { announcement?: string } | undefined;
  if (configScreen?.announcement?.includes('{')) {
    report.messages.push(
      `Component: ${nodeName} -> Element: ${element.name} might have a reference to a Sound Tag: ${configScreen.announcement}`
    );
  }
}

/**
 * Check and update Request Skills node
 */
function checkRequestSkills(
  element: PolicyOutput,
  report: CloneReport,
  skills: Array<{ Id: string; Id__c?: string; Name?: string }>
): void {
  const configSkills = element.config?.skills as Array<{ Id__c: string; Name?: string }> | undefined;
  if (!configSkills) return;
  
  element.config!.skills = configSkills.filter((item) => {
    const exists = checkIfExistsInOrgById(skills, item.Id__c);
    if (!exists) {
      report.messages.push(`Removed Skill "${item.Name}" from ${element.name}`);
    }
    return exists;
  });
}

/**
 * Check and update Notify Chatter targets
 */
function checkNotifyChatter(
  element: PolicyOutput,
  sfUsers: Array<{ Id: string }>,
  chatterGroups: Array<{ Id: string }>
): void {
  const chatter = element.subItems?.chatter as Array<{ targetType: string; target: string }> | undefined;
  if (!chatter) return;
  
  chatter.forEach((el) => {
    const targets: Record<string, Array<{ Id: string }>> = {
      group: chatterGroups,
      user: sfUsers,
    };
    
    if (targets[el.targetType]) {
      const exists = checkIfExistsInOrgById(targets[el.targetType], el.target);
      if (!exists) el.target = '';
    }
  });
  
  // Clean up hash key
  delete (element as Record<string, unknown>).$$hashKey;
}

/**
 * Check and update VoiceMail node
 */
function checkFinishVoiceMail(
  element: PolicyOutput,
  users: Array<{ Id: string; Id__c?: string }>,
  groups: Array<{ Id: string; Id__c?: string }>
): void {
  const mailbox = element.variables?.mailbox as { type: string; groupId?: string; userId?: string } | undefined;
  if (!mailbox) return;
  
  if (mailbox.type === 'GROUP' && mailbox.groupId) {
    const exists = checkIfExistsInOrgById(groups, mailbox.groupId);
    if (!exists) delete mailbox.groupId;
  } else if (mailbox.type === 'USER' && mailbox.userId) {
    const exists = checkIfExistsInOrgById(users, mailbox.userId);
    if (!exists) delete mailbox.userId;
  }
}

/**
 * Replace UUIDs, screen hooks, and macros in policy JSON
 */
function replacePolicyIds(
  policy: Policy,
  report: CloneReport
): Policy {
  let policyJson = JSON.stringify(policy);
  
  // Replace all UUIDs with new ones
  const uuidMatches = policyJson.match(UUID_REGEX) || [];
  const uuidMap = new Map<string, string>();
  uuidMatches.forEach((uuid) => {
    if (!uuidMap.has(uuid)) {
      uuidMap.set(uuid, uuidv4());
    }
  });
  uuidMap.forEach((newUuid, oldUuid) => {
    policyJson = policyJson.replace(new RegExp(oldUuid, 'gi'), newUuid);
  });
  
  // Replace screen hooks
  const screenHookMatches = policyJson.match(SCREEN_HOOK_REGEX) || [];
  screenHookMatches.forEach((hook) => {
    policyJson = policyJson.replace(new RegExp(hook, 'g'), generateScreenHookId());
  });
  
  // Log macros and sound tags
  const macroMatches = policyJson.match(MACRO_REGEX) || [];
  macroMatches.forEach((macro) => {
    if (!report.messages.includes(`Policy is using Macro: ${macro}`)) {
      report.messages.push(`Policy is using Macro: ${macro}`);
    }
  });
  
  const soundTagMatches = policyJson.match(SOUND_TAG_REGEX) || [];
  soundTagMatches.forEach((tag) => {
    if (!report.messages.includes(`Policy is using Sound Tag: ${tag}`)) {
      report.messages.push(`Policy is using Sound Tag: ${tag}`);
    }
  });
  
  return JSON.parse(policyJson);
}

/**
 * Process policy nodes for cloning - removes org-specific references
 */
function processNodesForCloning(
  policy: Policy,
  options: ClonePolicyOptions,
  report: CloneReport
): Policy {
  const { users = [], groups = [], skills = [], sfUsers = [], chatterGroups = [], sounds = [], config } = options;
  const removeConnectedFromItems: string[] = [];
  
  policy.nodes = policy.nodes.reduce<PolicyNode[]>((acc, node) => {
    // Skip inbound number nodes without templateClass (legacy Angular nodes)
    if (node.templateId === NODE_ID.INBOUND_NUMBER && !node.templateClass) {
      return acc;
    }
    
    // Skip ModPolicy_ToNonCall and ModPolicy_ToCall nodes
    if (node.templateClass === TEMPLATE_CLASSES.MOD_POLICY_TO_NON_CALL ||
        node.templateClass === TEMPLATE_CLASSES.MOD_POLICY_TO_CALL) {
      if (node.templateClass === TEMPLATE_CLASSES.MOD_POLICY_TO_NON_CALL) {
        policy.connections = filterSourceConnections(policy.connections, node.id);
      }
      return acc;
    }
    
    switch (node.templateClass) {
      case TEMPLATE_CLASSES.MOD_NUMBER:
      case TEMPLATE_CLASSES.MOD_START_DIGITAL:
        // Clear subItems for inbound numbers/digital addresses
        if (node.subItems) {
          node.subItems.forEach((item) => {
            const publicNumber = item.variables?.publicNumber;
            const flowHook = item.variables?.flowHook;
            if (publicNumber) {
              report.messages.push(`Removed Public Number: ${item.name} / ${publicNumber}`);
            } else if (flowHook) {
              report.messages.push(`Removed Digital Number: ${item.name}`);
            }
          });
          node.subItems = [];
        }
        break;
        
      case TEMPLATE_CLASSES.MOD_POLICY:
      case TEMPLATE_CLASSES.MOD_POLICY_NC:
        // Clear To Policy node connections
        removeConnectedFromItems.push(node.id);
        node.outputs?.forEach((output) => {
          report.messages.push(`Removed Linked Policy: ${output.name}`);
        });
        policy.connections = filterSourceConnections(policy.connections, node.id);
        node.outputs = [];
        if (node.data?.outputs) {
          node.data.outputs = [];
        }
        break;
        
      default:
        // Process outputs for other nodes
        node.outputs?.forEach((element) => {
          switch (element.templateClass) {
            case TEMPLATE_CLASSES.MOD_CONNECT:
              checkModConnectVariables(element, report, node.name, users, groups);
              break;
            case TEMPLATE_CLASSES.MOD_CONNECT_FOLLOW_ME:
              checkFollowMeVariables(element, report, node.name, users, groups);
              break;
            case TEMPLATE_CLASSES.MOD_CONNECT_QUEUE:
              checkQueueVariables(element, report, node.name, groups, sounds);
              break;
            case TEMPLATE_CLASSES.MOD_ACTION_RECORD:
              if (element.variables) {
                (element.variables as { archivePolicyId?: string | null }).archivePolicyId = null;
              }
              break;
            case TEMPLATE_CLASSES.MOD_ACTION_RECORD_ANALYSE:
              element.config = {
                ...element.config,
                connectorId: config?.ConnectorId__c,
                devOrgId: config?.DevOrgId__c,
                namespacePrefix: options.namespacePrefix || 'nbavs',
              };
              break;
            case TEMPLATE_CLASSES.MOD_ACTION_REQUEST_SKILLS:
              checkRequestSkills(element, report, skills);
              break;
            case TEMPLATE_CLASSES.MOD_ACTION_NOTIFY:
              checkNotifyChatter(element, sfUsers, chatterGroups);
              break;
            case TEMPLATE_CLASSES.MOD_FINISH_VOICEMAIL:
              checkFinishVoiceMail(element, users, groups);
              break;
            case TEMPLATE_CLASSES.NATTERBOX_AI_VOICE_KNOWLEDGE:
            case TEMPLATE_CLASSES.NATTERBOX_AI_DIGITAL_KNOWLEDGE:
              if (element.config?.component) {
                element.config.component = resetKnowledgeBaseFields(
                  element.config.component as Record<string, unknown>,
                  report
                );
              }
              break;
            case TEMPLATE_CLASSES.NATTERBOX_AI_DIGITAL_AGENT:
            case TEMPLATE_CLASSES.NATTERBOX_AI_VOICE_AGENT:
              if (element.config?.component) {
                element.config.component = resetAgentFields(
                  element.config.component as Record<string, unknown>,
                  report
                );
              }
              break;
          }
        });
    }
    
    acc.push(node);
    return acc;
  }, []);
  
  // Clear connectedFrom references for removed nodes
  removeConnectedFromItems.forEach((connectedTo) => {
    policy.nodes.forEach((node) => {
      if (node.connectedFromNode === connectedTo) {
        node.connectedFromItem = null;
        node.connectedFromNode = null;
      }
    });
  });
  
  return policy;
}

/**
 * Clone a policy - creates a clean copy with new IDs and without org-specific references
 * 
 * This is used when copying a policy to another org or creating a template.
 * It removes:
 * - Phone numbers and digital addresses
 * - User/group references that don't exist in the target org
 * - Linked policy references
 * - AI knowledge base and agent references
 * 
 * @param options Clone options including the policy and org data
 * @returns Cloned policy with report of changes
 */
export function clonePolicy(options: ClonePolicyOptions): { policy: Policy; report: CloneReport } {
  const { policy: originalPolicy, config, sounds = [] } = options;
  const report: CloneReport = { messages: [] };
  
  // Deep clone the policy
  let newPolicy = cloneDeep(originalPolicy);
  
  // Replace UUIDs, screen hooks, and log macros/sound tags
  newPolicy = replacePolicyIds(newPolicy, report);
  
  // Process nodes - remove org-specific references
  newPolicy = processNodesForCloning(newPolicy, options, report);
  
  // Clear policy IDs for new creation
  newPolicy = {
    ...newPolicy,
    Id: undefined,
    Id__c: null,
    Name: originalPolicy.name || originalPolicy.Name || '',
    Description__c: originalPolicy.description || originalPolicy.Description__c || '',
    Type__c: originalPolicy.type?.advanced || originalPolicy.Type__c || POLICY_TYPE.CALL,
  };
  
  // Remove old ID fields
  delete newPolicy.id;
  delete newPolicy.name;
  delete newPolicy.remoteId;
  delete newPolicy.description;
  
  return { policy: newPolicy, report };
}

/**
 * Validate policy before saving
 * 
 * Checks for required fields and valid configuration.
 * Returns array of validation error messages.
 */
export function validatePolicy(policy: Policy): string[] {
  const errors: string[] = [];
  
  if (!policy.Name && !policy.name) {
    errors.push('Policy name is required');
  }
  
  if (!policy.nodes || policy.nodes.length === 0) {
    errors.push('Policy must have at least one node');
  }
  
  // Check for nodes with empty required names
  policy.nodes?.forEach((node) => {
    if (node.title === 'SupportChat' && !node.data?.name) {
      errors.push(`Name field for ${node.title} node is required!`);
    }
    
    // Check Event node has selected event
    if (node.data?.config) {
      const config = node.data.config as { component?: { label?: string | null } };
      if (config.component?.label === null) {
        errors.push('You need to select an Event from the list!');
      }
    }
  });
  
  return errors;
}

/**
 * Export policy report as downloadable file
 */
export function generateCloneReport(report: CloneReport, policyName: string): string {
  if (report.messages.length === 0) {
    return '';
  }
  
  const sortedMessages = [...report.messages].sort();
  return `Policy Clone Report for: ${policyName}\n${'='.repeat(50)}\n\n${sortedMessages.join('\n')}`;
}

/**
 * Check if a policy can be deleted (not a SYSTEM policy)
 */
export function canDeletePolicy(policy: Policy): boolean {
  return policy.Source__c !== 'SYSTEM';
}

/**
 * Get the display type for a policy
 */
export function getPolicyTypeDisplay(typeCode: string | undefined): string {
  switch (typeCode) {
    case POLICY_TYPE.CALL:
      return 'Call';
    case POLICY_TYPE.DATA_ANALYTICS:
      return 'Data Analytics';
    case POLICY_TYPE.DIGITAL:
      return 'Digital';
    default:
      return 'Unknown';
  }
}

