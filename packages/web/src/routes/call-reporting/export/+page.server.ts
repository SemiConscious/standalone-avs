/**
 * Call Reporting Export Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 * Note: Complex export queries use specialized call log queries.
 */

import { tryCreateContextAndRepositories, isSalesforceContext } from '$lib/adapters';
import type { PageServerLoad, Actions } from './$types';

export interface ExportField {
  key: string;
  label: string;
  default: boolean;
}

export interface ExportPageData {
  fields: ExportField[];
  isDemo: boolean;
  error?: string;
}

const AVAILABLE_FIELDS: ExportField[] = [
  { key: 'Name', label: 'Call ID', default: true },
  { key: 'DateTime__c', label: 'Date/Time', default: true },
  { key: 'Direction__c', label: 'Direction', default: true },
  { key: 'Number__c', label: 'Phone Number', default: true },
  { key: 'TimeTalking__c', label: 'Talk Time (seconds)', default: true },
  { key: 'TimeRinging__c', label: 'Ring Time (seconds)', default: false },
  { key: 'TimeInQueue__c', label: 'Queue Time (seconds)', default: false },
  { key: 'Result__c', label: 'Result', default: true },
  { key: 'User__r.Name', label: 'Agent', default: true },
  { key: 'Group__r.Name', label: 'Group', default: false },
  { key: 'CreatedDate', label: 'Created Date', default: false },
];

export const load: PageServerLoad = async ({ locals }) => {
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return {
      fields: AVAILABLE_FIELDS,
      isDemo: true,
    } satisfies ExportPageData;
  }

  const { isDemo } = result;

  return {
    fields: AVAILABLE_FIELDS,
    isDemo,
  } satisfies ExportPageData;
};

export const actions: Actions = {
  export: async ({ request, locals }) => {
    const formData = await request.formData();
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const direction = formData.get('direction') as string;
    const selectedFields = formData.getAll('fields') as string[];
    const format = formData.get('format') as string || 'csv';
    const limit = parseInt(formData.get('limit') as string) || 1000;

    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return { success: false, error: 'Not authenticated' };
    }

    const { ctx, isDemo } = result;

    // Demo mode - return sample data
    if (isDemo || !isSalesforceContext(ctx)) {
      const sampleData = generateDemoExportData(selectedFields, limit);
      return { success: true, data: sampleData, format };
    }

    try {
      // Use the call reporting repository for exports
      const exportData = await result.repos.callReporting.exportCallLogs({
        startDate,
        endDate,
        direction: direction !== 'all' ? direction : undefined,
        fields: selectedFields,
        limit: Math.min(limit, 10000),
      });

      return { success: true, data: exportData, format };
    } catch (e) {
      console.error('Export error:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Export failed' };
    }
  },
};

function generateDemoExportData(fields: string[], limit: number) {
  const data: Record<string, string | number>[] = [];
  const fieldLabels = AVAILABLE_FIELDS.reduce((acc, f) => {
    acc[f.key] = f.label;
    return acc;
  }, {} as Record<string, string>);

  const directions = ['Inbound', 'Outbound', 'Internal'];
  const results = ['Answered', 'Missed', 'Voicemail'];
  const agents = ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown', 'Charlie Davis'];
  const groups = ['Sales', 'Support', 'Billing', 'Technical'];

  for (let i = 0; i < Math.min(limit, 100); i++) {
    const row: Record<string, string | number> = {};
    const date = new Date(Date.now() - i * 3600000);

    fields.forEach(field => {
      const label = fieldLabels[field] || field;
      switch (field) {
        case 'Name':
          row[label] = `CL-${String(1000 + i).padStart(6, '0')}`;
          break;
        case 'DateTime__c':
          row[label] = date.toISOString();
          break;
        case 'Direction__c':
          row[label] = directions[i % 3];
          break;
        case 'Number__c':
          row[label] = `+44 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;
          break;
        case 'TimeTalking__c':
          row[label] = Math.floor(Math.random() * 600);
          break;
        case 'TimeRinging__c':
          row[label] = Math.floor(Math.random() * 30);
          break;
        case 'TimeInQueue__c':
          row[label] = Math.floor(Math.random() * 120);
          break;
        case 'Result__c':
          row[label] = results[i % 3];
          break;
        case 'User__r.Name':
          row[label] = agents[i % 5];
          break;
        case 'Group__r.Name':
          row[label] = groups[i % 4];
          break;
        case 'CreatedDate':
          row[label] = date.toISOString();
          break;
      }
    });

    data.push(row);
  }

  return data;
}
