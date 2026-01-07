/**
 * Node class name utilities for the policy editor.
 * Ported from natterbox-routing-policies/src/services/nodeClassName.service.js
 * 
 * This module maps template IDs to node type class names for styling.
 */

// Node IDs from the React app's DEFAULTS
export const NODE_ID = {
  ACTION: 4,
  DA_ACTION: 94,
  DA_EVENT: 93,
  DIGITAL_ACTION: 142,
  DIGITAL_CONNECT: 140,
  DIGITAL_FINISH: 144,
  NATTERBOX_AI: 145,
  CALL_NATTERBOX_AI: 146,
  ANALYTICS_NATTERBOX_AI: 147,
  DATA_ANALYTICS_FINISH: 120,
  FROM_POLICY: 2,
  FROM_SIP_TRUNK: 81,
  INBOUND_NUMBER: 3,
  SWITCHBOARD: 9,
  SWITCH_BOARD: 9,
  CATCH_ALL: 16,
  CATCH_ALL_DIGITAL: 141,
  FINISH: 23,
  FINISH_ANALYTICS: 58,
  EXTENSION_NUMBER: 31,
  DDI: 38,
  OUTBOUND: 39,
  TO_POLICY: 66,
  SIP_TRUNK: 81,
  INBOUND_MESSAGE: 93,
  OMNI_CHANNEL_FLOW: 117,
  AI_TEST_NODE: 111,
  AI_SUPPORT_CHAT: 112,
  INVOKABLE_DESTINATION: 3100000,
  GROUP_OUTPUT: 'group_output',
} as const;

// Map template IDs to CSS class names
const templateIdToClassName = new Map<number, string>([
  [NODE_ID.OMNI_CHANNEL_FLOW, 'omniChannelFlow_node'],
  [NODE_ID.DIGITAL_ACTION, 'digital_node'],
  [NODE_ID.FROM_POLICY, 'from_policy_node'],
  [NODE_ID.INBOUND_NUMBER, 'inbound_numbers_node'],
  [NODE_ID.ACTION, 'action_node'],
  [NODE_ID.DA_ACTION, 'action_node'],
  [NODE_ID.SWITCHBOARD, 'switchboard_node'],
  [NODE_ID.CATCH_ALL, 'catch_all_node'],
  [NODE_ID.CATCH_ALL_DIGITAL, 'catch_all_node'],
  [NODE_ID.FINISH, 'finish_node'],
  [NODE_ID.FINISH_ANALYTICS, 'finish_node'],
  [NODE_ID.EXTENSION_NUMBER, 'extension_number_node'],
  [NODE_ID.DDI, 'ddi_node'],
  [NODE_ID.OUTBOUND, 'outbound_node'],
  [NODE_ID.TO_POLICY, 'to_policy_node'],
  [NODE_ID.SIP_TRUNK, 'sip_trunk_node'],
  [NODE_ID.INBOUND_MESSAGE, 'inbound_message'],
  [NODE_ID.NATTERBOX_AI, 'natterbox_ai'],
  [NODE_ID.CALL_NATTERBOX_AI, 'natterbox_ai'],
  [NODE_ID.ANALYTICS_NATTERBOX_AI, 'natterbox_ai'],
  [NODE_ID.AI_TEST_NODE, 'sip_trunk_node'],
  [NODE_ID.AI_SUPPORT_CHAT, 'ai_support_chat_node'],
  [NODE_ID.INVOKABLE_DESTINATION, 'invokable_destination_node'],
]);

// Map CSS class names to our internal node types (for FlowNode component)
export const classNameToNodeType: Record<string, string> = {
  'omniChannelFlow_node': 'omniChannelFlow',
  'digital_node': 'inboundNumber',
  'from_policy_node': 'init',
  'inbound_numbers_node': 'inboundNumber',
  'action_node': 'default',
  'switchboard_node': 'switchBoard',
  'catch_all_node': 'end',
  'finish_node': 'end',
  'extension_number_node': 'extensionNumber',
  'ddi_node': 'inboundNumber',
  'outbound_node': 'output',
  'to_policy_node': 'init',
  'sip_trunk_node': 'connectCall',
  'inbound_message': 'inboundMessage',
  'natterbox_ai': 'natterboxAI',
  'ai_support_chat_node': 'natterboxAI',
  'invokable_destination_node': 'connectCall',
};

// Node type colors for our FlowNode component
export const nodeTypeColors: Record<string, { headerColor: string; footerColor: string }> = {
  'action_node': { headerColor: '#2ecbbf', footerColor: '#96e5df' },
  'natterbox_ai': { headerColor: '#75c3bd', footerColor: '#c0ebee' },
  'ddi_node': { headerColor: '#bf5a88', footerColor: '#bc7599' },
  'from_policy_node': { headerColor: '#963cbd', footerColor: '#cf92ef' },
  'to_policy_node': { headerColor: '#963cbd', footerColor: '#cf92ef' },
  'inbound_numbers_node': { headerColor: '#cfd05b', footerColor: '#e7e7ad' },
  'digital_node': { headerColor: '#cfd05b', footerColor: '#e7e7ad' },
  'extension_number_node': { headerColor: '#d68a6a', footerColor: '#d19884' },
  'switchboard_node': { headerColor: '#d95879', footerColor: '#ecabbc' },
  'omniChannelFlow_node': { headerColor: '#00A1E0', footerColor: '#80D0EF' },
  'finish_node': { headerColor: '#666666', footerColor: '#999999' },
  'catch_all_node': { headerColor: '#000000', footerColor: '#000000' },
  'outbound_node': { headerColor: '#000000', footerColor: '#000000' },
  'sip_trunk_node': { headerColor: '#069abc', footerColor: '#97d6e4' },
  'ai_support_chat_node': { headerColor: '#4A4E69', footerColor: '#9B9DAA' },
  'inbound_message': { headerColor: '#6bb7e4', footerColor: '#bee0f3' },
  'invokable_destination_node': { headerColor: '#069abc', footerColor: '#97d6e4' },
  'default': { headerColor: '#4f6a92', footerColor: '#4f6a92' },
};

export interface NodeLike {
  templateId?: number;
  type?: string;
  className?: string;
  parentId?: string;
  data?: {
    outputs?: unknown[];
    [key: string]: unknown;
  };
}

/**
 * Get the base CSS class name for a node based on its template ID
 */
export function getBaseNodeClassNameByTemplateId(templateId: number | undefined): string {
  if (templateId === undefined) return '';
  return templateIdToClassName.get(templateId) ?? '';
}

/**
 * Get the full CSS class name for a node
 */
export function getNodeClassName(node: NodeLike, withParentClass = true): string {
  const classNames: string[] = [];
  
  if (withParentClass && node.type !== 'group') {
    classNames.push('parent_node');
  }
  
  const baseClassName = getBaseNodeClassNameByTemplateId(node.templateId);
  if (baseClassName) {
    classNames.push(baseClassName);
  }
  
  return classNames.join(' ');
}

/**
 * Get the legacy node class name (for imported policies)
 */
export function getLegacyNodeClassName(node: NodeLike): string {
  const defaultClassName = getNodeClassName(node, !node.parentId && Array.isArray(node.data?.outputs));
  const existingClassName = node.className || '';
  const className = `${existingClassName} ${defaultClassName}`;
  
  // Prevent className duplication
  return [...new Set(className.split(' '))].filter(Boolean).join(' ');
}

/**
 * Manage node class name (add or remove a class)
 */
export function manageNodeClassName<T extends NodeLike>(
  node: T,
  className: string,
  isRemoving: boolean
): T {
  if (!('className' in node)) {
    return node;
  }
  
  const currentClassName = (node.className as string) || '';
  let updatedClassName = isRemoving
    ? currentClassName.replace(className, '')
    : `${currentClassName} ${className}`;
  
  // Prevent className duplication
  updatedClassName = [...new Set(updatedClassName.split(' '))].filter(Boolean).join(' ');
  
  return {
    ...node,
    className: updatedClassName,
  };
}

/**
 * Map legacy templateClass to our internal node type
 */
export function mapTemplateClassToNodeType(templateClass?: string): string {
  const classMap: Record<string, string> = {
    'ModFromPolicy': 'init',
    'ModNumber': 'inboundNumber',
    'ModNumber_Public': 'inboundNumber',
    'ModAction': 'default',
    'ModAction_Say': 'speak',
    'ModAction_Record': 'recordCall',
    'ModAction_Notify': 'notify',
    'ModConnect': 'connectCall',
    'ModConnector_SFQuery': 'queryObject',
    'ModVoicemail': 'voicemail',
    'ModHuntGroup': 'huntGroup',
    'ModCallQueue': 'callQueue',
    'ModRule': 'rule',
    'ModDevelop_Script': 'default',
    'ModExtension': 'extensionNumber',
    'ModFinish': 'end',
    'ModSwitchboard': 'switchBoard',
    'ModToPolicy': 'init',
    'ModOutbound': 'output',
    'ModInboundMessage': 'inboundMessage',
    'ModDigitalAction': 'default',
    'ModNatterboxAI': 'natterboxAI',
    'ModOmniChannelFlow': 'omniChannelFlow',
  };
  
  return templateClass ? (classMap[templateClass] ?? 'default') : 'default';
}

/**
 * Map template ID to our internal node type
 */
export function mapTemplateIdToNodeType(templateId?: number): string {
  const className = getBaseNodeClassNameByTemplateId(templateId);
  return className ? (classNameToNodeType[className] ?? 'default') : 'default';
}

