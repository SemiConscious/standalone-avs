/**
 * Node display utilities for the policy editor.
 * Ported from natterbox-routing-policies/src/utils/nodeDisplay.js
 * 
 * This module provides functions to get display titles, descriptions, and placeholders
 * for policy editor nodes, with support for overrides based on node title.
 */

// Display overrides for specific node types based on their title
// If a node's title exists here, use the provided custom display info
// Otherwise, fall back to the node's original data
export const NODE_DISPLAY_INFO: Record<string, { title?: string; description?: string; placeholder?: string }> = {
  Route: {
    description: 'AI-Powered Route Selector',
  },
  Router: {
    placeholder: 'e.g. Main Switchboard',
    description: 'Uses AI to make routing decisions based on customer inquiries.',
  },
  Response: {
    placeholder: 'e.g. Read out terms and conditions',
    description: 'Delivers announcements to your customers.',
  },
  'Get Info': {
    placeholder: 'e.g. Get booking reference',
    description: 'Collects key information from the user and saves it for later use.',
  },
  Settings: {
    placeholder: 'e.g. Get booking reference',
    description: 'Control and manage the operational and security settings for your AI assistants and agents',
  },
  'Human Escalation': {
    description: 'Establish a route for the AI to escalate to a human.',
  },
  Knowledge: {
    placeholder: 'e.g. Product Information.',
    description: 'Use AI to Answer Questions from a Knowledgebase',
  },
  Persona: {
    placeholder: 'e.g. Support Assistant Tone',
    description: 'Assistant Style and Tone',
  },
  'Get Skills': {
    placeholder: 'e.g. 1st Line Skills',
    description: 'Identifies customer needs and assigns relevant skills',
  },
  Voicemail: {
    description: 'AI-powered voicemail with smart notifications',
  },
  Agent: {
    placeholder: 'e.g. Booking Agent',
    description: 'AI agents that manage conversations and complete tasks',
  },
  'Record and Analyse': {
    description: 'Record calls, store them securely in the cloud, email them, and run AI Advisor analysis to extract key information.',
  },
  // Additional common node types
  'From Policy': {
    description: 'DialPlan Start provides the entry point for all routes.',
  },
  'Inbound Numbers': {
    description: 'Inbound Numbers are the phone numbers that trigger this policy.',
  },
  'Inbound Number': {
    description: 'Entry point for inbound calls.',
  },
  'Extension': {
    description: 'Internal extension number.',
  },
  'Inbound Message': {
    description: 'Entry point for messages.',
  },
  'Call Queue': {
    description: 'Queue calls for agents.',
  },
  'Hunt Group': {
    description: 'Ring multiple users.',
  },
  'Connect Call': {
    description: 'Connect to user/number.',
  },
  'Connect a Call': {
    description: 'Connect the caller to a user or external number.',
  },
  Rule: {
    description: 'Conditional branching.',
  },
  Speak: {
    description: 'Play audio/TTS.',
  },
  'Record Call': {
    description: 'Record the call.',
  },
  'Query Object': {
    description: 'Query Salesforce data.',
  },
  'Create Record': {
    description: 'Create a Salesforce record.',
  },
  'Manage Properties': {
    description: 'Set or modify call properties.',
  },
  Notify: {
    description: 'Send notifications.',
  },
  Retry: {
    description: 'Retry on failure.',
  },
  Switchboard: {
    description: 'Directory search.',
  },
  Debug: {
    description: 'Debug and troubleshoot.',
  },
  'Omni-Channel Flow': {
    description: 'Salesforce Omni-Channel integration.',
  },
  Finish: {
    description: 'End the call flow.',
  },
  End: {
    description: 'End the call flow.',
  },
};

export interface PolicyNode {
  title?: string;
  name?: string;
  data?: {
    title?: string;
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Get the display title for a node.
 * Priority: NODE_DISPLAY_INFO override > node.data.title > node.data.name > node.title > node.name
 */
export function getNodeDisplayTitle(node: PolicyNode): string {
  const nodeTitle = node.title || node.name;
  const override = nodeTitle ? NODE_DISPLAY_INFO[nodeTitle] : undefined;
  
  return override?.title 
    ?? node?.data?.title 
    ?? node?.data?.name 
    ?? nodeTitle 
    ?? 'Node';
}

/**
 * Get the display description for a node.
 * Priority: NODE_DISPLAY_INFO override > node.data.description
 */
export function getNodeDisplayDescription(node: PolicyNode): string | undefined {
  const nodeTitle = node.title || node.name;
  const override = nodeTitle ? NODE_DISPLAY_INFO[nodeTitle] : undefined;
  
  return override?.description ?? node?.data?.description;
}

/**
 * Get the placeholder text for a node input field.
 * Priority: NODE_DISPLAY_INFO override > default "enter name"
 */
export function getNodeDisplayPlaceholder(title: string | undefined): string {
  if (!title) return 'enter name';
  
  const override = NODE_DISPLAY_INFO[title];
  return override?.placeholder ?? 'enter name';
}

/**
 * Helper to decode HTML entities in node names (from legacy data)
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

