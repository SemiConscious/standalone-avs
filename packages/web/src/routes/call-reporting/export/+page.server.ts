import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad, Actions } from './$types';

const NAMESPACE = 'nbavs__';

interface SalesforceCallLog {
  Id: string;
  Name: string;
  nbavs__DateTime__c: string;
  nbavs__Direction__c: string;
  nbavs__TimeTalking__c: number;
  nbavs__TimeRinging__c: number;
  nbavs__TimeInQueue__c: number;
  nbavs__Result__c: string;
  nbavs__Number__c: string;
  nbavs__User__r?: { Name: string };
  nbavs__Group__r?: { Name: string };
  CreatedDate: string;
}

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
  // Demo mode check
  const isDemo = env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1';

  if (!isDemo && !hasValidCredentials(locals)) {
    return {
      fields: AVAILABLE_FIELDS,
      isDemo: false,
      error: 'Not authenticated',
    } satisfies ExportPageData;
  }

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

    // Demo mode - return sample data
    if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
      const sampleData = generateDemoExportData(selectedFields, limit);
      return { success: true, data: sampleData, format };
    }

    if (!hasValidCredentials(locals)) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Build field list for SOQL
      const fieldMap: Record<string, string> = {
        'Name': 'Name',
        'DateTime__c': `${NAMESPACE}DateTime__c`,
        'Direction__c': `${NAMESPACE}Direction__c`,
        'Number__c': `${NAMESPACE}Number__c`,
        'TimeTalking__c': `${NAMESPACE}TimeTalking__c`,
        'TimeRinging__c': `${NAMESPACE}TimeRinging__c`,
        'TimeInQueue__c': `${NAMESPACE}TimeInQueue__c`,
        'Result__c': `${NAMESPACE}Result__c`,
        'User__r.Name': `${NAMESPACE}User__r.Name`,
        'Group__r.Name': `${NAMESPACE}Group__r.Name`,
        'CreatedDate': 'CreatedDate',
      };

      const soqlFields = selectedFields.map(f => fieldMap[f] || f).filter(Boolean);
      if (!soqlFields.includes('Id')) soqlFields.unshift('Id');

      // Build WHERE clause
      const whereClauses: string[] = [];
      if (startDate) {
        whereClauses.push(`${NAMESPACE}DateTime__c >= ${new Date(startDate).toISOString()}`);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClauses.push(`${NAMESPACE}DateTime__c <= ${endDateTime.toISOString()}`);
      }
      if (direction && direction !== 'all') {
        whereClauses.push(`${NAMESPACE}Direction__c = '${direction}'`);
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const soql = `
        SELECT ${soqlFields.join(', ')}
        FROM ${NAMESPACE}CallLog__c
        ${whereClause}
        ORDER BY ${NAMESPACE}DateTime__c DESC
        LIMIT ${Math.min(limit, 10000)}
      `;

      const result = await querySalesforce<SalesforceCallLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        soql
      );

      // Transform data for export
      const exportData = result.records.map(record => {
        const row: Record<string, string | number> = {};
        selectedFields.forEach(field => {
          if (field === 'User__r.Name') {
            row['Agent'] = record[`${NAMESPACE}User__r`]?.Name || '';
          } else if (field === 'Group__r.Name') {
            row['Group'] = record[`${NAMESPACE}Group__r`]?.Name || '';
          } else if (field === 'Name' || field === 'CreatedDate') {
            row[AVAILABLE_FIELDS.find(f => f.key === field)?.label || field] = record[field] || '';
          } else {
            const nsField = `${NAMESPACE}${field}`;
            const label = AVAILABLE_FIELDS.find(f => f.key === field)?.label || field;
            row[label] = record[nsField as keyof SalesforceCallLog] as string | number || '';
          }
        });
        return row;
      });

      return { success: true, data: exportData, format, totalRecords: result.totalSize };
    } catch (e) {
      console.error('Export failed:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Export failed' };
    }
  },
};

function generateDemoExportData(fields: string[], limit: number): Record<string, string | number>[] {
  const data: Record<string, string | number>[] = [];
  const directions = ['Inbound', 'Outbound', 'Internal'];
  const results = ['Answered', 'Missed', 'Voicemail'];
  const agents = ['John Smith', 'Sarah Johnson', 'Mike Williams', 'Emily Davis', 'David Brown'];
  const groups = ['Sales', 'Support', 'Billing', 'Technical'];

  for (let i = 0; i < Math.min(limit, 100); i++) {
    const row: Record<string, string | number> = {};
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

    fields.forEach(field => {
      switch (field) {
        case 'Name':
          row['Call ID'] = `CL-${String(100000 + i).padStart(6, '0')}`;
          break;
        case 'DateTime__c':
          row['Date/Time'] = date.toISOString();
          break;
        case 'Direction__c':
          row['Direction'] = directions[Math.floor(Math.random() * directions.length)];
          break;
        case 'Number__c':
          row['Phone Number'] = `+1 555 ${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
          break;
        case 'TimeTalking__c':
          row['Talk Time (seconds)'] = Math.floor(Math.random() * 600);
          break;
        case 'TimeRinging__c':
          row['Ring Time (seconds)'] = Math.floor(Math.random() * 30);
          break;
        case 'TimeInQueue__c':
          row['Queue Time (seconds)'] = Math.floor(Math.random() * 120);
          break;
        case 'Result__c':
          row['Result'] = results[Math.floor(Math.random() * results.length)];
          break;
        case 'User__r.Name':
          row['Agent'] = agents[Math.floor(Math.random() * agents.length)];
          break;
        case 'Group__r.Name':
          row['Group'] = groups[Math.floor(Math.random() * groups.length)];
          break;
        case 'CreatedDate':
          row['Created Date'] = date.toISOString();
          break;
      }
    });

    data.push(row);
  }

  return data;
}
