/**
 * Demo Insight Data
 */

import type { Insight, CallAnalysis, InsightStats } from '$lib/domain';

export const DEMO_INSIGHTS: Insight[] = [
  {
    id: 'demo-ins001',
    callLogId: 'demo-cl001',
    type: 'call_summary',
    title: 'Customer Inquiry - Product Features',
    content: 'Customer called to inquire about premium features of the Enterprise plan. Agent provided detailed explanation and customer expressed interest in scheduling a demo.',
    confidence: 0.92,
    createdDate: '2026-01-09T14:30:00Z',
    agentId: 'demo-u001',
    agentName: 'John Smith',
  },
  {
    id: 'demo-ins002',
    callLogId: 'demo-cl001',
    type: 'sentiment',
    title: 'Positive Customer Sentiment',
    content: 'Overall sentiment was positive. Customer expressed satisfaction with the explanation and appreciation for the agent\'s knowledge.',
    confidence: 0.88,
    createdDate: '2026-01-09T14:30:00Z',
    agentId: 'demo-u001',
    agentName: 'John Smith',
  },
  {
    id: 'demo-ins003',
    callLogId: 'demo-cl001',
    type: 'action_item',
    title: 'Schedule Demo',
    content: 'Agent to schedule product demo with customer within the next week.',
    confidence: 0.95,
    createdDate: '2026-01-09T14:30:00Z',
    agentId: 'demo-u001',
    agentName: 'John Smith',
  },
  {
    id: 'demo-ins004',
    callLogId: 'demo-cl002',
    type: 'call_summary',
    title: 'Technical Support - Integration Issue',
    content: 'Customer reported API integration timeout issues. Agent walked through troubleshooting steps and identified incorrect endpoint configuration.',
    confidence: 0.89,
    createdDate: '2026-01-09T13:20:00Z',
    agentId: 'demo-u002',
    agentName: 'Jane Doe',
  },
  {
    id: 'demo-ins005',
    callLogId: 'demo-cl002',
    type: 'coaching',
    title: 'Opportunity for Improvement',
    content: 'Consider asking clarifying questions earlier in the call to identify the root cause faster. The customer had to repeat information multiple times.',
    confidence: 0.78,
    createdDate: '2026-01-09T13:20:00Z',
    agentId: 'demo-u002',
    agentName: 'Jane Doe',
  },
  {
    id: 'demo-ins006',
    callLogId: 'demo-cl004',
    type: 'topic',
    title: 'Topics Discussed',
    content: 'Main topics: Account upgrade, billing questions, feature comparison between plans.',
    confidence: 0.85,
    createdDate: '2026-01-09T10:35:00Z',
    agentId: 'demo-u005',
    agentName: 'Charlie Brown',
  },
];

export const DEMO_CALL_ANALYSES: Map<string, CallAnalysis> = new Map([
  ['demo-cl001', {
    callLogId: 'demo-cl001',
    transcript: [
      { speaker: 'agent', startTime: 0, endTime: 5, text: 'Thank you for calling Natterbox, this is John. How can I help you today?', sentiment: 'positive' },
      { speaker: 'customer', startTime: 5, endTime: 15, text: 'Hi John, I\'m interested in learning more about your Enterprise plan features.', sentiment: 'positive' },
      { speaker: 'agent', startTime: 15, endTime: 45, text: 'Absolutely! I\'d be happy to walk you through our Enterprise features. Our Enterprise plan includes advanced analytics, custom integrations, and dedicated support.', sentiment: 'positive' },
    ],
    sentiment: 'positive',
    sentimentScore: 0.75,
    summary: 'Customer inquiry about Enterprise plan features. Agent provided comprehensive explanation and customer expressed interest in a demo.',
    actionItems: [
      { description: 'Schedule product demo', assignee: 'John Smith', priority: 'high' },
      { description: 'Send feature comparison document', priority: 'medium' },
    ],
    topics: [
      { name: 'Enterprise Plan', relevance: 0.95, mentions: 5 },
      { name: 'Product Demo', relevance: 0.85, mentions: 3 },
      { name: 'Pricing', relevance: 0.60, mentions: 2 },
    ],
    coachingSuggestions: [],
  }],
]);

export const DEMO_INSIGHT_STATS: InsightStats = {
  totalCallsAnalyzed: 156,
  averageSentiment: 0.62,
  sentimentDistribution: {
    positive: 89,
    neutral: 45,
    negative: 22,
  },
  topTopics: [
    { name: 'Product Features', count: 45 },
    { name: 'Technical Support', count: 38 },
    { name: 'Billing', count: 28 },
    { name: 'Account Management', count: 25 },
    { name: 'Integration', count: 20 },
  ],
  averageActionItems: 1.8,
};
