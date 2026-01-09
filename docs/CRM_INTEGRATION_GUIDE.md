# CRM Integration Guide

This guide explains how to integrate a new CRM platform (e.g., Microsoft Dynamics, SugarCRM, HubSpot, Zoho) into the Natterbox AVS application using the repository pattern architecture.

## Architecture Overview

The application uses a layered architecture that separates platform-specific code from the UI:

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer                                │
│              (+page.svelte components)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server Layer                               │
│              (+page.server.ts files)                         │
│                                                              │
│   Uses: createAdapterContext(), getRepositories()           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Repository Interfaces                        │
│                   ($lib/repositories/)                       │
│                                                              │
│   IUserRepository, IGroupRepository, IDeviceRepository,     │
│   IPhoneNumberRepository, IRoutingPolicyRepository,         │
│   ICallLogRepository, ISoundRepository, IInsightRepository  │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐
│ Salesforce Adapter│ │ Demo Adapter  │ │ New CRM Adapter   │
│                   │ │               │ │                   │
│ - Mappers         │ │ - In-memory   │ │ - Mappers         │
│ - Queries (SOQL)  │ │   data store  │ │ - API Client      │
│ - Repositories    │ │ - Repositories│ │ - Repositories    │
└───────────────────┘ └───────────────┘ └───────────────────┘
```

## Step-by-Step Integration Guide

### Step 1: Add the Platform Enum

First, register your new platform in the adapter types:

```typescript
// $lib/adapters/types.ts

export type Platform = 'salesforce' | 'demo' | 'dynamics' | 'hubspot' | 'sugar';
```

### Step 2: Create the Adapter Directory Structure

Create a new directory for your adapter under `$lib/adapters/`:

```
$lib/adapters/
├── index.ts                 # Main adapter factory
├── types.ts                 # Platform types
├── salesforce/              # Existing Salesforce adapter
├── demo/                    # Existing Demo adapter
└── dynamics/                # New adapter (example: Dynamics)
    ├── index.ts             # Adapter factory
    ├── client.ts            # API client wrapper
    ├── types.ts             # Platform-specific types
    ├── mappers/
    │   ├── index.ts
    │   ├── user.mapper.ts
    │   ├── group.mapper.ts
    │   ├── device.mapper.ts
    │   ├── phone-number.mapper.ts
    │   ├── routing-policy.mapper.ts
    │   └── call-log.mapper.ts
    └── repositories/
        ├── user.repository.ts
        ├── group.repository.ts
        ├── device.repository.ts
        ├── phone-number.repository.ts
        ├── routing-policy.repository.ts
        └── call-log.repository.ts
```

### Step 3: Define Platform-Specific Types

Create types that match your CRM's data model:

```typescript
// $lib/adapters/dynamics/types.ts

/**
 * Microsoft Dynamics entity types
 * These match the Dynamics Web API response structures
 */

export interface DynamicsContact {
  contactid: string;
  fullname: string;
  emailaddress1: string;
  telephone1: string;
  jobtitle: string;
  createdon: string;
  modifiedon: string;
  statecode: number;  // 0 = Active, 1 = Inactive
  // Custom fields for Natterbox integration
  nb_sipextension: string;
  nb_enabled: boolean;
  nb_pbxlicense: boolean;
  nb_managerlicense: boolean;
  nb_recordlicense: boolean;
}

export interface DynamicsTeam {
  teamid: string;
  name: string;
  description: string;
  createdon: string;
  modifiedon: string;
  // Custom fields
  nb_extension: string;
  nb_maxqueuetime: number;
  nb_type: string;
}

// Add similar interfaces for devices, phone numbers, etc.
```

### Step 4: Create the API Client

Create a client that handles authentication and API calls:

```typescript
// $lib/adapters/dynamics/client.ts

import type { DynamicsAdapterContext } from './types';

export interface DynamicsQueryResult<T> {
  '@odata.context': string;
  '@odata.count'?: number;
  value: T[];
}

export class DynamicsClient {
  constructor(private ctx: DynamicsAdapterContext) {}

  /**
   * Query Dynamics Web API
   */
  async query<T>(
    entitySet: string,
    options: {
      select?: string[];
      filter?: string;
      orderby?: string;
      top?: number;
      skip?: number;
      expand?: string[];
      count?: boolean;
    } = {}
  ): Promise<DynamicsQueryResult<T>> {
    const params = new URLSearchParams();
    
    if (options.select?.length) {
      params.set('$select', options.select.join(','));
    }
    if (options.filter) {
      params.set('$filter', options.filter);
    }
    if (options.orderby) {
      params.set('$orderby', options.orderby);
    }
    if (options.top) {
      params.set('$top', String(options.top));
    }
    if (options.skip) {
      params.set('$skip', String(options.skip));
    }
    if (options.expand?.length) {
      params.set('$expand', options.expand.join(','));
    }
    if (options.count) {
      params.set('$count', 'true');
    }

    const url = `${this.ctx.apiUrl}/api/data/v9.2/${entitySet}?${params}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.ctx.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Dynamics API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a single record by ID
   */
  async get<T>(entitySet: string, id: string, select?: string[]): Promise<T | null> {
    const params = select?.length ? `?$select=${select.join(',')}` : '';
    const url = `${this.ctx.apiUrl}/api/data/v9.2/${entitySet}(${id})${params}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.ctx.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Dynamics API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a new record
   */
  async create<T>(entitySet: string, data: Partial<T>): Promise<string> {
    const url = `${this.ctx.apiUrl}/api/data/v9.2/${entitySet}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.ctx.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create record: ${error}`);
    }

    // Extract ID from OData-EntityId header or response body
    const entityId = response.headers.get('OData-EntityId');
    if (entityId) {
      const match = entityId.match(/\(([^)]+)\)/);
      return match ? match[1] : '';
    }
    
    const result = await response.json();
    return result.id || result[Object.keys(result).find(k => k.endsWith('id')) || ''];
  }

  /**
   * Update a record
   */
  async update<T>(entitySet: string, id: string, data: Partial<T>): Promise<void> {
    const url = `${this.ctx.apiUrl}/api/data/v9.2/${entitySet}(${id})`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.ctx.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update record: ${error}`);
    }
  }

  /**
   * Delete a record
   */
  async delete(entitySet: string, id: string): Promise<void> {
    const url = `${this.ctx.apiUrl}/api/data/v9.2/${entitySet}(${id})`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.ctx.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete record: ${response.status}`);
    }
  }
}
```

### Step 5: Create Mappers

Mappers convert between platform-specific types and domain types:

```typescript
// $lib/adapters/dynamics/mappers/user.mapper.ts

import type { User, CreateUserInput, UpdateUserInput } from '$lib/domain';
import type { DynamicsContact } from '../types';

/**
 * Map Dynamics Contact to domain User
 */
export function mapDynamicsContactToUser(contact: DynamicsContact): User {
  return {
    id: contact.contactid,
    platformId: contact.contactid,
    name: contact.fullname || '',
    email: contact.emailaddress1 || '',
    username: contact.emailaddress1 || '',
    extension: contact.nb_sipextension || '',
    enabled: contact.nb_enabled ?? true,
    status: contact.statecode === 0 ? 'active' : 'inactive',
    licenseType: determineLicenseType(contact),
    licenses: {
      pbx: contact.nb_pbxlicense ?? false,
      manager: contact.nb_managerlicense ?? false,
      record: contact.nb_recordlicense ?? false,
    },
    createdAt: contact.createdon,
    updatedAt: contact.modifiedon,
  };
}

/**
 * Map domain User input to Dynamics Contact for creation
 */
export function mapUserInputToDynamicsContact(
  input: CreateUserInput
): Partial<DynamicsContact> {
  return {
    fullname: input.name,
    emailaddress1: input.email,
    nb_sipextension: input.extension,
    nb_enabled: input.enabled ?? true,
    nb_pbxlicense: input.licenses?.pbx ?? false,
    nb_managerlicense: input.licenses?.manager ?? false,
    nb_recordlicense: input.licenses?.record ?? false,
  };
}

/**
 * Map domain User update to Dynamics Contact patch
 */
export function mapUserUpdateToDynamicsContact(
  input: UpdateUserInput
): Partial<DynamicsContact> {
  const update: Partial<DynamicsContact> = {};
  
  if (input.name !== undefined) update.fullname = input.name;
  if (input.email !== undefined) update.emailaddress1 = input.email;
  if (input.extension !== undefined) update.nb_sipextension = input.extension;
  if (input.enabled !== undefined) update.nb_enabled = input.enabled;
  if (input.licenses?.pbx !== undefined) update.nb_pbxlicense = input.licenses.pbx;
  if (input.licenses?.manager !== undefined) update.nb_managerlicense = input.licenses.manager;
  if (input.licenses?.record !== undefined) update.nb_recordlicense = input.licenses.record;
  
  return update;
}

function determineLicenseType(contact: DynamicsContact): User['licenseType'] {
  if (contact.nb_pbxlicense) return 'pbx';
  if (contact.nb_managerlicense) return 'manager';
  return 'basic';
}
```

### Step 6: Implement Repository Classes

Implement each repository interface using your CRM's API:

```typescript
// $lib/adapters/dynamics/repositories/user.repository.ts

import type {
  IUserRepository,
  UserQueryParams,
} from '$lib/repositories/user.repository';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  AvailabilityProfile,
  CrmUser,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import type { DynamicsAdapterContext, DynamicsContact } from '../types';
import { DynamicsClient } from '../client';
import {
  mapDynamicsContactToUser,
  mapUserInputToDynamicsContact,
  mapUserUpdateToDynamicsContact,
} from '../mappers/user.mapper';

export class DynamicsUserRepository implements IUserRepository {
  private client: DynamicsClient;

  constructor(private ctx: DynamicsAdapterContext) {
    this.client = new DynamicsClient(ctx);
  }

  async findAll(params: UserQueryParams): Promise<PaginatedResult<User>> {
    const { page = 1, pageSize = 50, sortBy, sortOrder, filters } = params;
    
    // Build OData filter
    const filterClauses: string[] = [];
    
    if (filters?.enabled !== undefined) {
      filterClauses.push(`nb_enabled eq ${filters.enabled}`);
    }
    if (filters?.search) {
      filterClauses.push(
        `contains(fullname,'${filters.search}') or contains(emailaddress1,'${filters.search}')`
      );
    }
    if (filters?.licenseType) {
      filterClauses.push(`nb_${filters.licenseType}license eq true`);
    }

    // Map sort field to Dynamics field
    const sortFieldMap: Record<string, string> = {
      name: 'fullname',
      email: 'emailaddress1',
      extension: 'nb_sipextension',
      updatedAt: 'modifiedon',
      createdAt: 'createdon',
    };

    const result = await this.client.query<DynamicsContact>('contacts', {
      select: [
        'contactid', 'fullname', 'emailaddress1', 'telephone1',
        'createdon', 'modifiedon', 'statecode',
        'nb_sipextension', 'nb_enabled', 'nb_pbxlicense',
        'nb_managerlicense', 'nb_recordlicense',
      ],
      filter: filterClauses.length ? filterClauses.join(' and ') : undefined,
      orderby: sortBy 
        ? `${sortFieldMap[sortBy] || sortBy} ${sortOrder || 'asc'}`
        : 'fullname asc',
      top: pageSize,
      skip: (page - 1) * pageSize,
      count: true,
    });

    const users = result.value.map(mapDynamicsContactToUser);
    const totalItems = result['@odata.count'] || users.length;

    return {
      items: users,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        hasNextPage: page * pageSize < totalItems,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id: string): Promise<User | null> {
    const contact = await this.client.get<DynamicsContact>('contacts', id, [
      'contactid', 'fullname', 'emailaddress1', 'telephone1',
      'createdon', 'modifiedon', 'statecode',
      'nb_sipextension', 'nb_enabled', 'nb_pbxlicense',
      'nb_managerlicense', 'nb_recordlicense',
    ]);

    return contact ? mapDynamicsContactToUser(contact) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.client.query<DynamicsContact>('contacts', {
      filter: `emailaddress1 eq '${email}'`,
      top: 1,
    });

    return result.value.length > 0
      ? mapDynamicsContactToUser(result.value[0])
      : null;
  }

  async findByExtension(extension: string): Promise<User | null> {
    const result = await this.client.query<DynamicsContact>('contacts', {
      filter: `nb_sipextension eq '${extension}'`,
      top: 1,
    });

    return result.value.length > 0
      ? mapDynamicsContactToUser(result.value[0])
      : null;
  }

  async create(data: CreateUserInput): Promise<MutationResult<User>> {
    try {
      const dynamicsData = mapUserInputToDynamicsContact(data);
      const id = await this.client.create('contacts', dynamicsData);
      const user = await this.findById(id);
      
      return {
        success: true,
        data: user!,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      };
    }
  }

  async update(id: string, data: UpdateUserInput): Promise<MutationResult<User>> {
    try {
      const dynamicsData = mapUserUpdateToDynamicsContact(data);
      await this.client.update('contacts', id, dynamicsData);
      const user = await this.findById(id);
      
      return {
        success: true,
        data: user!,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      };
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    try {
      await this.client.delete('contacts', id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      };
    }
  }

  async isExtensionAvailable(extension: string, excludeId?: string): Promise<boolean> {
    let filter = `nb_sipextension eq '${extension}'`;
    if (excludeId) {
      filter += ` and contactid ne ${excludeId}`;
    }

    const result = await this.client.query<DynamicsContact>('contacts', {
      filter,
      top: 1,
      select: ['contactid'],
    });

    return result.value.length === 0;
  }

  // Implement remaining interface methods...
  async getAvailabilityProfiles(): Promise<AvailabilityProfile[]> {
    // Implement based on how availability is stored in Dynamics
    return [];
  }

  async getCrmUsers(): Promise<CrmUser[]> {
    // Query Dynamics systemusers for CRM users
    return [];
  }

  async getGroupMemberships(userId: string): Promise<string[]> {
    // Query team memberships
    return [];
  }

  async setAvailabilityProfile(userId: string, profileId: string): Promise<MutationResult<void>> {
    // Implement availability profile assignment
    return { success: true };
  }

  async linkToCrmUser(userId: string, crmUserId: string): Promise<MutationResult<void>> {
    // Link Natterbox user to Dynamics systemuser
    return { success: true };
  }

  async count(filters?: UserQueryParams['filters']): Promise<number> {
    const result = await this.client.query<DynamicsContact>('contacts', {
      select: ['contactid'],
      count: true,
      top: 0,
    });
    return result['@odata.count'] || 0;
  }
}
```

### Step 7: Create the Adapter Factory

Create the main factory function that instantiates all repositories:

```typescript
// $lib/adapters/dynamics/index.ts

import type { DynamicsAdapterContext } from './types';
import type { IUserRepository } from '$lib/repositories/user.repository';
import type { IGroupRepository } from '$lib/repositories/group.repository';
import type { IDeviceRepository } from '$lib/repositories/device.repository';
import type { IPhoneNumberRepository } from '$lib/repositories/phone-number.repository';
import type { IRoutingPolicyRepository } from '$lib/repositories/routing-policy.repository';
import type { ICallLogRepository } from '$lib/repositories/call-log.repository';
import type { ISoundRepository } from '$lib/repositories/sound.repository';
import type { IInsightRepository } from '$lib/repositories/insight.repository';

import { DynamicsUserRepository } from './repositories/user.repository';
import { DynamicsGroupRepository } from './repositories/group.repository';
import { DynamicsDeviceRepository } from './repositories/device.repository';
import { DynamicsPhoneNumberRepository } from './repositories/phone-number.repository';
import { DynamicsRoutingPolicyRepository } from './repositories/routing-policy.repository';
import { DynamicsCallLogRepository } from './repositories/call-log.repository';
import { DynamicsSoundRepository } from './repositories/sound.repository';
import { DynamicsInsightRepository } from './repositories/insight.repository';

export interface DynamicsRepositories {
  users: IUserRepository;
  groups: IGroupRepository;
  devices: IDeviceRepository;
  phoneNumbers: IPhoneNumberRepository;
  routingPolicies: IRoutingPolicyRepository;
  callLogs: ICallLogRepository;
  sounds: ISoundRepository;
  insights: IInsightRepository;
}

export function createDynamicsRepositories(ctx: DynamicsAdapterContext): DynamicsRepositories {
  return {
    users: new DynamicsUserRepository(ctx),
    groups: new DynamicsGroupRepository(ctx),
    devices: new DynamicsDeviceRepository(ctx),
    phoneNumbers: new DynamicsPhoneNumberRepository(ctx),
    routingPolicies: new DynamicsRoutingPolicyRepository(ctx),
    callLogs: new DynamicsCallLogRepository(ctx),
    sounds: new DynamicsSoundRepository(ctx),
    insights: new DynamicsInsightRepository(ctx),
  };
}
```

### Step 8: Register the Adapter in the Main Factory

Update the main adapter index to include your new platform:

```typescript
// $lib/adapters/index.ts

import type { Platform, AdapterContext, SalesforceAdapterContext } from './types';
import { createSalesforceRepositories } from './salesforce';
import { createDemoRepositories } from './demo';
import { createDynamicsRepositories } from './dynamics';  // Add import
import { env } from '$env/dynamic/private';

export function createAdapterContext(locals: App.Locals): AdapterContext {
  // Check for demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return { platform: 'demo' };
  }

  // Check for Dynamics (example: based on environment variable or locals)
  if (env.CRM_PLATFORM === 'dynamics' && locals.dynamicsToken) {
    return {
      platform: 'dynamics',
      apiUrl: env.DYNAMICS_API_URL!,
      accessToken: locals.dynamicsToken,
    };
  }

  // Default to Salesforce
  if (locals.accessToken && locals.instanceUrl) {
    return {
      platform: 'salesforce',
      instanceUrl: locals.instanceUrl,
      accessToken: locals.accessToken,
    };
  }

  // Fallback to demo
  return { platform: 'demo' };
}

export function getRepositories(ctx: AdapterContext) {
  switch (ctx.platform) {
    case 'salesforce':
      return createSalesforceRepositories(ctx as SalesforceAdapterContext);
    case 'dynamics':
      return createDynamicsRepositories(ctx as DynamicsAdapterContext);
    case 'demo':
    default:
      return createDemoRepositories();
  }
}
```

### Step 9: Handle Authentication

Create authentication handlers for your CRM. This typically involves OAuth 2.0:

```typescript
// $lib/server/dynamics-auth.ts

import { env } from '$env/dynamic/private';

interface DynamicsTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export function getDynamicsAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.DYNAMICS_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${env.PUBLIC_APP_URL}/auth/dynamics/callback`,
    scope: `${env.DYNAMICS_API_URL}/.default offline_access`,
    state,
  });

  return `https://login.microsoftonline.com/${env.DYNAMICS_TENANT_ID}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeDynamicsCode(code: string): Promise<DynamicsTokenResponse> {
  const response = await fetch(
    `https://login.microsoftonline.com/${env.DYNAMICS_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.DYNAMICS_CLIENT_ID!,
        client_secret: env.DYNAMICS_CLIENT_SECRET!,
        code,
        redirect_uri: `${env.PUBLIC_APP_URL}/auth/dynamics/callback`,
        grant_type: 'authorization_code',
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to exchange authorization code');
  }

  return response.json();
}
```

## Entity Mapping Reference

When mapping CRM entities to domain types, refer to these interfaces:

### Core Domain Types

| Domain Type | Description | Key Fields |
|-------------|-------------|------------|
| `User` | Natterbox user | id, name, email, extension, enabled, licenses |
| `Group` | Ring/hunt group | id, name, type, extension, members |
| `Device` | SIP phone/softphone | id, extension, type, macAddress, enabled |
| `PhoneNumber` | DID/phone number | id, number, displayName, routingPolicyId |
| `RoutingPolicy` | Call flow/IVR | id, name, status, type, phoneNumbers |
| `CallLog` | Call record | id, dateTime, direction, duration, fromNumber, toNumber |
| `Sound` | Audio file/TTS | id, name, type, duration, url |
| `Insight` | AI call analysis | id, callLogId, summary, sentiment, ratings |

### Common Field Mappings

| Domain Field | Salesforce | Dynamics | HubSpot |
|--------------|------------|----------|---------|
| User.id | Id | contactid | vid |
| User.name | Name | fullname | firstname + lastname |
| User.email | nbavs__Email__c | emailaddress1 | email |
| User.extension | nbavs__SipExtension__c | nb_sipextension | sip_extension |
| Group.id | Id | teamid | id |
| Group.members | (via GroupMember__c) | (via teammembership) | (via associations) |

## Testing Your Integration

### Unit Tests

Create tests for your mappers:

```typescript
// $lib/adapters/dynamics/mappers/__tests__/user.mapper.test.ts

import { describe, it, expect } from 'vitest';
import { mapDynamicsContactToUser } from '../user.mapper';
import type { DynamicsContact } from '../../types';

describe('mapDynamicsContactToUser', () => {
  it('should map a Dynamics contact to a User', () => {
    const contact: DynamicsContact = {
      contactid: '123-456',
      fullname: 'John Doe',
      emailaddress1: 'john@example.com',
      telephone1: '+1234567890',
      createdon: '2024-01-01T00:00:00Z',
      modifiedon: '2024-01-02T00:00:00Z',
      statecode: 0,
      nb_sipextension: '1001',
      nb_enabled: true,
      nb_pbxlicense: true,
      nb_managerlicense: false,
      nb_recordlicense: false,
    };

    const user = mapDynamicsContactToUser(contact);

    expect(user.id).toBe('123-456');
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
    expect(user.extension).toBe('1001');
    expect(user.enabled).toBe(true);
    expect(user.licenses.pbx).toBe(true);
  });
});
```

### Integration Tests

Test against a sandbox/test CRM instance:

```typescript
// e2e/tests/dynamics-integration.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Dynamics Integration', () => {
  test('should list users from Dynamics', async ({ page }) => {
    await page.goto('/users');
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="user-list"]');
    
    // Verify users are displayed
    const userRows = await page.locator('[data-testid="user-row"]').count();
    expect(userRows).toBeGreaterThan(0);
  });
});
```

## Deployment Checklist

- [ ] Create CRM-specific custom fields for Natterbox data
- [ ] Set up OAuth application in CRM admin portal
- [ ] Configure environment variables
- [ ] Implement all 8 repository interfaces
- [ ] Add mapper unit tests
- [ ] Test authentication flow
- [ ] Test CRUD operations for each entity
- [ ] Verify pagination and filtering work correctly
- [ ] Test error handling and edge cases
- [ ] Update documentation

## Environment Variables

Add these to your `.env` file for the new CRM:

```bash
# CRM Platform Selection
CRM_PLATFORM=dynamics  # or 'salesforce', 'hubspot', 'sugar'

# Microsoft Dynamics
DYNAMICS_TENANT_ID=your-tenant-id
DYNAMICS_CLIENT_ID=your-client-id
DYNAMICS_CLIENT_SECRET=your-client-secret
DYNAMICS_API_URL=https://yourorg.crm.dynamics.com

# HubSpot (example)
HUBSPOT_CLIENT_ID=your-client-id
HUBSPOT_CLIENT_SECRET=your-client-secret
HUBSPOT_API_KEY=your-api-key

# SugarCRM (example)
SUGAR_INSTANCE_URL=https://yourinstance.sugarcrm.com
SUGAR_CLIENT_ID=your-client-id
SUGAR_CLIENT_SECRET=your-client-secret
```

## Support

For questions about the integration architecture, refer to:

- `packages/web/src/lib/adapters/salesforce/` - Reference implementation
- `packages/web/src/lib/domain/` - Domain type definitions
- `packages/web/src/lib/repositories/` - Repository interface definitions
