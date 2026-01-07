/**
 * Sapien API Client
 * 
 * This client handles communication with the Natterbox Sapien API using JWT authentication.
 * 
 * Authentication is handled externally - the client expects to receive a valid JWT token
 * which is obtained via the Salesforce Apex REST endpoint:
 * 
 *   GET /services/apexrest/token/{scope}
 * 
 * The Salesforce org handles the Sapien OAuth authentication internally using credentials
 * stored in the API_v1__c protected custom settings, then calls Gatekeeper to get a
 * user-specific JWT token.
 * 
 * Available scopes (from Salesforce code):
 * - enduser:basic - Basic CTI/call access
 * - omni:basic, omni:team-leader, omni:admin - Omni-channel access
 * - insights:basic, insights:team-leader, insights:admin - AI Insights access
 * - templates:basic, templates:team-leader, templates:admin - Template access
 */

export interface SapienClientConfig {
  /** Sapien API host URL (e.g., https://api.natterbox.com/v1) */
  host: string;
  /** Natterbox organization ID */
  organizationId: number;
  /** JWT token (obtained via Salesforce Apex REST endpoint) */
  jwt: string;
}

export interface SapienApiResponse<T = unknown> {
  data?: T;
  error?: {
    description: string;
    errors?: Array<{ field?: string; message: string }>;
  };
}

// ============================================================
// Sapien Data Types
// ============================================================

export interface SapienCall {
  id: string;
  uuid: string;
  direction: 'inbound' | 'outbound' | 'internal';
  state: 'ringing' | 'answered' | 'held' | 'transferring' | 'ended';
  fromNumber: string;
  toNumber: string;
  fromUserId?: number;
  toUserId?: number;
  startTime: string;
  answerTime?: string;
  endTime?: string;
}

export interface SapienUser {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  extension: string;
  status: string;
  enabled: boolean;
}

export interface SapienDevice {
  id: number;
  name: string;
  type: string;
  model: string;
  mac: string;
  extension: string;
  registered: boolean;
  enabled: boolean;
}

export interface SapienGroup {
  id: number;
  name: string;
  description: string;
  extension: string;
  type: string;
  enabled: boolean;
}

export interface SapienPhoneNumber {
  id: number;
  number: string;
  country: string;
  area: string;
  ddi: boolean;
  smsEnabled: boolean;
  userId?: number;
  callFlowId?: number;
}

export interface SapienCallFlow {
  id: number;
  name: string;
  description: string;
  type: string;
  source: string;
  status: string;
  body?: string;
}

export interface SapienCallLog {
  id: string;
  uuid: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  fromUserId?: number;
  toUserId?: number;
  timeStart: string;
  timeRinging?: number;
  timeHunting?: number;
  timeTalking?: number;
  recorded: boolean;
  aUuid?: string;
  bUuid?: string;
}

export interface SapienSound {
  id: number;
  name: string;
  tag: string;
  description: string;
}

// ============================================================
// Error Types
// ============================================================

export class SapienClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'SapienClientError';
  }
}

// ============================================================
// Sapien Client
// ============================================================

export class SapienClient {
  private config: SapienClientConfig;

  constructor(config: SapienClientConfig) {
    this.config = config;
  }

  /**
   * Update the JWT token (useful when token expires and is refreshed)
   */
  setJwt(jwt: string): void {
    this.config.jwt = jwt;
  }

  /**
   * Make an authenticated request to the Sapien API
   */
  async request<T = unknown>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<SapienApiResponse<T>> {
    // Replace organization placeholder if present
    const formattedPath = path.replace(
      /organisation\/#/g,
      `organisation/${this.config.organizationId}`
    );

    // Build endpoint URL
    let endpoint = `${this.config.host}/${formattedPath.replace(/^\//, '')}`;
    
    // Handle /batch/ URL fix (from RestClient.cls)
    if (endpoint.includes('/v1/batch/')) {
      endpoint = endpoint.replace('/v1/batch/', '/batch/v1/');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.jwt}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Handle PATCH via POST with override header (Sapien quirk)
    let actualMethod = method.toUpperCase();
    if (actualMethod === 'PATCH') {
      actualMethod = 'POST';
      headers['X-HTTP-Method-Override'] = 'PATCH';
    }

    const fetchOptions: RequestInit = {
      method: actualMethod,
      headers,
    };

    if (options.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(endpoint, fetchOptions);

    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<SapienApiResponse<T>> {
    const text = await response.text();
    
    if (!response.ok) {
      let error;
      try {
        const parsed = JSON.parse(text);
        error = parsed.error || { description: text };
      } catch {
        error = { description: text };
      }
      throw new SapienClientError(
        error.description || `HTTP ${response.status}`,
        response.status,
        text
      );
    }

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return { data: text as unknown as T };
    }
  }

  // ============================================================
  // Convenience Methods
  // ============================================================

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', 'test/secure');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get organization details
   */
  async getOrganization(): Promise<unknown> {
    const response = await this.request('GET', 'organisation/#');
    return response.data;
  }

  // ============================================================
  // Real-time Call Operations
  // ============================================================

  /**
   * Get all active calls for the organization
   */
  async getActiveCalls(): Promise<SapienCall[]> {
    const response = await this.request<SapienCall[]>('GET', 'organisation/#/call');
    return response.data || [];
  }

  /**
   * Initiate a listen-in on a call
   */
  async listenToCall(
    fromNumber: string,
    targetChannelUuid: string,
    channelVars?: Record<string, string>
  ): Promise<boolean> {
    await this.request('POST', 'organisation/#/call/channel', {
      body: {
        from: fromNumber,
        targetChannelUUID: targetChannelUuid,
        channelVars,
      },
    });
    return true;
  }

  // ============================================================
  // User Operations
  // ============================================================

  async getUsers(): Promise<SapienUser[]> {
    const response = await this.request<SapienUser[]>('GET', 'organisation/#/user');
    return response.data || [];
  }

  async getUser(userId: number): Promise<SapienUser> {
    const response = await this.request<SapienUser>('GET', `organisation/#/user/${userId}`);
    return response.data!;
  }

  async updateUser(userId: number, data: Partial<SapienUser>): Promise<SapienUser> {
    const response = await this.request<SapienUser>('PATCH', `organisation/#/user/${userId}`, {
      body: data,
    });
    return response.data!;
  }

  // ============================================================
  // Device Operations
  // ============================================================

  async getDevices(): Promise<SapienDevice[]> {
    const response = await this.request<SapienDevice[]>('GET', 'organisation/#/device');
    return response.data || [];
  }

  async getDevice(deviceId: number): Promise<SapienDevice> {
    const response = await this.request<SapienDevice>('GET', `organisation/#/device/${deviceId}`);
    return response.data!;
  }

  // ============================================================
  // Group Operations
  // ============================================================

  async getGroups(): Promise<SapienGroup[]> {
    const response = await this.request<SapienGroup[]>('GET', 'organisation/#/group');
    return response.data || [];
  }

  async getGroup(groupId: number): Promise<SapienGroup> {
    const response = await this.request<SapienGroup>('GET', `organisation/#/group/${groupId}`);
    return response.data!;
  }

  // ============================================================
  // Phone Number Operations
  // ============================================================

  async getPhoneNumbers(): Promise<SapienPhoneNumber[]> {
    const response = await this.request<SapienPhoneNumber[]>('GET', 'organisation/#/number');
    return response.data || [];
  }

  // ============================================================
  // Call Flow (Routing Policy) Operations
  // ============================================================

  async getCallFlows(): Promise<SapienCallFlow[]> {
    const response = await this.request<SapienCallFlow[]>('GET', 'organisation/#/callflow');
    return response.data || [];
  }

  async getCallFlow(callFlowId: number): Promise<SapienCallFlow> {
    const response = await this.request<SapienCallFlow>('GET', `organisation/#/callflow/${callFlowId}`);
    return response.data!;
  }

  async createCallFlow(data: Partial<SapienCallFlow>): Promise<SapienCallFlow> {
    const response = await this.request<SapienCallFlow>('POST', 'organisation/#/callflow', {
      body: data,
    });
    return response.data!;
  }

  async updateCallFlow(callFlowId: number, data: Partial<SapienCallFlow>): Promise<SapienCallFlow> {
    const response = await this.request<SapienCallFlow>('PUT', `organisation/#/callflow/${callFlowId}`, {
      body: data,
    });
    return response.data!;
  }

  async deleteCallFlow(callFlowId: number): Promise<boolean> {
    await this.request('DELETE', `organisation/#/callflow/${callFlowId}`);
    return true;
  }

  // ============================================================
  // Call Log Operations
  // ============================================================

  async getCallLogs(params: {
    userId?: number;
    number?: string;
    minTimeStart?: string;
    maxTimeStart?: string;
    limit?: number;
  } = {}): Promise<SapienCallLog[]> {
    const queryParams = new URLSearchParams();
    if (params.userId) queryParams.set('user-id', params.userId.toString());
    if (params.number) queryParams.set('number', params.number);
    if (params.minTimeStart) queryParams.set('min-time-start', params.minTimeStart);
    if (params.maxTimeStart) queryParams.set('max-time-start', params.maxTimeStart);
    if (params.limit) queryParams.set('_limit', params.limit.toString());

    const queryString = queryParams.toString();
    const path = `organisation/#/call/log${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<SapienCallLog[]>('GET', path);
    return response.data || [];
  }

  // ============================================================
  // Sound/Audio Operations
  // ============================================================

  async getSounds(): Promise<SapienSound[]> {
    const response = await this.request<SapienSound[]>('GET', 'organisation/#/sound');
    return response.data || [];
  }

  // ============================================================
  // Recording Operations
  // ============================================================

  getRecordingUrl(uuid: string): string {
    return `${this.config.host}/organisation/${this.config.organizationId}/recording/${uuid}`;
  }

  async getRecording(uuid: string): Promise<Blob> {
    const response = await fetch(this.getRecordingUrl(uuid), {
      headers: {
        'Authorization': `Bearer ${this.config.jwt}`,
      },
    });

    if (!response.ok) {
      throw new SapienClientError(`Failed to get recording: ${response.status}`, response.status);
    }

    return response.blob();
  }
}

// ============================================================
// Available Sapien Scopes
// ============================================================

export const SAPIEN_SCOPES = {
  /** Basic end-user access (CTI, calls) */
  ENDUSER_BASIC: 'enduser:basic',
  
  /** Omni-channel basic access */
  OMNI_BASIC: 'omni:basic',
  
  /** Omni-channel team leader access */
  OMNI_TEAM_LEADER: 'omni:team-leader',
  
  /** Omni-channel admin access */
  OMNI_ADMIN: 'omni:admin',
  
  /** Insights basic access */
  INSIGHTS_BASIC: 'insights:basic',
  
  /** Insights team leader access */
  INSIGHTS_TEAM_LEADER: 'insights:team-leader',
  
  /** Insights admin access */
  INSIGHTS_ADMIN: 'insights:admin',
  
  /** Templates basic access */
  TEMPLATES_BASIC: 'templates:basic',
  
  /** Templates team leader access */
  TEMPLATES_TEAM_LEADER: 'templates:team-leader',
  
  /** Templates admin access */
  TEMPLATES_ADMIN: 'templates:admin',
} as const;

export default SapienClient;
