/**
 * Salesforce API utilities for server-side data fetching
 */

export interface SoqlQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

/**
 * Execute a SOQL query against Salesforce
 */
export async function querySalesforce<T>(
  instanceUrl: string,
  accessToken: string,
  soql: string
): Promise<SoqlQueryResult<T>> {
  const url = `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`;

  console.log(`[Salesforce Query] ${soql}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Salesforce Error] ${response.status} - ${errorText}`);
    throw new Error(`Salesforce query failed: ${errorText}`);
  }

  const result = (await response.json()) as SoqlQueryResult<T>;
  console.log(`[Salesforce Result] ${result.totalSize} records`);
  return result;
}

/**
 * Check if we're in demo mode or have valid credentials
 */
export function hasValidCredentials(locals: App.Locals): boolean {
  return !!(locals.accessToken && locals.instanceUrl);
}

/**
 * Update a Salesforce record using PATCH
 */
export async function updateSalesforce(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  recordId: string,
  data: Record<string, unknown>
): Promise<void> {
  const url = `${instanceUrl}/services/data/v62.0/sobjects/${objectName}/${recordId}`;

  console.log(`[Salesforce Update] ${objectName}/${recordId}`, JSON.stringify(data).slice(0, 500));

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Salesforce Error] ${response.status} - ${errorText}`);
    throw new Error(`Salesforce update failed: ${errorText}`);
  }

  console.log(`[Salesforce Update] Success`);
}

/**
 * Create a Salesforce record using POST
 */
export async function createSalesforce<T extends { id: string }>(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  data: Record<string, unknown>
): Promise<T> {
  const url = `${instanceUrl}/services/data/v62.0/sobjects/${objectName}`;

  console.log(`[Salesforce Create] ${objectName}`, JSON.stringify(data).slice(0, 500));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Salesforce Error] ${response.status} - ${errorText}`);
    throw new Error(`Salesforce create failed: ${errorText}`);
  }

  const result = await response.json() as T;
  console.log(`[Salesforce Create] Success - ${result.id}`);
  return result;
}

/**
 * Delete a Salesforce record
 */
export async function deleteSalesforce(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  recordId: string
): Promise<void> {
  const url = `${instanceUrl}/services/data/v62.0/sobjects/${objectName}/${recordId}`;

  console.log(`[Salesforce Delete] ${objectName}/${recordId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Salesforce Error] ${response.status} - ${errorText}`);
    throw new Error(`Salesforce delete failed: ${errorText}`);
  }

  console.log(`[Salesforce Delete] Success`);
}

