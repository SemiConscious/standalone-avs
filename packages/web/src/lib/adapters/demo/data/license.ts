/**
 * Demo License Data
 */

import type { Subscription, License } from '$lib/domain';

export const DEMO_SUBSCRIPTIONS: Subscription[] = [
  { name: 'Voice', enabled: true, count: 250, icon: 'phone', color: 'blue' },
  { name: 'Contact Centre', enabled: true, count: 250, icon: 'headset', color: 'green' },
  { name: 'Record', enabled: true, count: 250, icon: 'mic', color: 'red' },
  { name: 'CTI', enabled: true, count: 250, icon: 'monitor', color: 'purple' },
  { name: 'PCI', enabled: true, count: 250, icon: 'shield', color: 'orange' },
  { name: 'Legacy Insight', enabled: true, count: 250, icon: 'chart', color: 'cyan' },
  { name: 'Freedom', enabled: true, count: 250, icon: 'globe', color: 'indigo' },
  { name: 'Service Cloud Voice', enabled: true, count: 3, icon: 'cloud', color: 'sky' },
  { name: 'SMS', enabled: true, count: 250, icon: 'message', color: 'emerald' },
  { name: 'WhatsApp', enabled: true, count: 250, icon: 'whatsapp', color: 'green' },
  { name: 'AI Advisor', enabled: true, count: 250, icon: 'sparkles', color: 'violet' },
  { name: 'AI Agents', enabled: true, count: 1, icon: 'bot', color: 'fuchsia' },
  { name: 'AI Assistants', enabled: true, count: 1, icon: 'brain', color: 'rose' },
  { name: 'AI Agents Call Allowance', enabled: true, count: 5000, icon: 'phone-call', color: 'amber' },
  { name: 'AI Assistants Call Allowance', enabled: true, count: 5000, icon: 'phone-incoming', color: 'lime' },
  { name: 'AI Agents Digital Message Allowance', enabled: true, count: 20000, icon: 'messages', color: 'teal' },
  { name: 'AI Assistants Digital Message Allowance', enabled: true, count: 10000, icon: 'message-circle', color: 'pink' },
  { name: 'Manager', enabled: true, count: 10, icon: 'user-cog', color: 'slate' },
];

export const DEMO_LICENSE: License = {
  subscriptions: DEMO_SUBSCRIPTIONS,
  updatedAt: new Date().toISOString(),
  isValid: true,
  organizationId: '00D0000000bKE9MA2',
};
