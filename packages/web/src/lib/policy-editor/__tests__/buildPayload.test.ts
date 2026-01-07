/**
 * Tests for buildPayload
 * Ported from natterbox-routing-policies/src/services/buildPayload.test.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import buildPayload, {
  buildBody__c,
  buildPolicy__c,
  POLICY_TYPE,
  POLICY_TYPE_VALUES,
  getPolicyType,
} from '../buildPayload';

describe('buildPayload function', () => {
  let policy: any;
  let config: any;
  let sounds: any[];

  beforeEach(() => {
    policy = {
      Id: 'policy-1',
      Id__c: 'policy-remote-1',
      Name: 'Test Policy',
      Description__c: 'Test Description',
      Type__c: POLICY_TYPE.CALL,
      nodes: [
        { id: 'init', data: { name: 'Init Node' } },
        { id: 'node-1', data: { name: 'Start Node' } },
        { id: 'node-2', data: { name: 'Mid Node' } },
        {
          id: 'node-3',
          outputs: [
            { id: 'node-4', parentId: 'node-3', data: { name: 'Output 1' } },
            { id: 'node-5', parentId: 'node-3', data: { name: 'Output 2' } },
          ],
          data: {
            name: 'End Node',
          },
        },
      ],
      edges: [],
    };
    config = { DevOrgId__c: 'dev123', ConnectorId__c: 'conn123' };
    sounds = [];
  });

  it('should build a valid payload', () => {
    const result = buildPayload({ policy, config, sounds });

    expect(result).toHaveProperty('Body__c');
    expect(result).toHaveProperty('Description__c', 'Test Description');
    expect(result).toHaveProperty('Id', 'policy-1');
    expect(result).toHaveProperty('Id__c', 'policy-remote-1');
    expect(result).toHaveProperty('Name', 'Test Policy');
    expect(result).toHaveProperty('Policy__c');
    expect(result).toHaveProperty('Type__c', POLICY_TYPE.CALL);
    expect(result).toHaveProperty('PhoneNumbers__c');
  });

  it('should assign a UUID if finishId is not present', () => {
    delete policy.finishId;
    const result = buildPayload({ policy, config, sounds });
    
    expect(policy.finishId).toBeDefined();
    expect(typeof policy.finishId).toBe('string');
    expect(policy.finishId.length).toBeGreaterThan(0);
  });

  it('should serialize Body__c as JSON string', () => {
    const result = buildPayload({ policy, config, sounds });
    
    expect(typeof result.Body__c).toBe('string');
    const body = JSON.parse(result.Body__c);
    expect(body).toHaveProperty('id', 'policy-1');
    expect(body).toHaveProperty('name', 'Test Policy');
  });

  it('should serialize Policy__c as JSON string', () => {
    const result = buildPayload({ policy, config, sounds });
    
    expect(typeof result.Policy__c).toBe('string');
    const policyData = JSON.parse(result.Policy__c);
    expect(policyData).toHaveProperty('name', 'Test Policy');
    expect(policyData).toHaveProperty('enabled', true);
    expect(policyData).toHaveProperty('type', 'CALL');
  });

  it('should extract phone numbers from subItems', () => {
    policy.nodes = [
      { id: 'init', data: { name: 'Init' } },
      {
        id: 'node-1',
        data: {
          templateId: 3,
          subItems: [
            { id: 'sub1', variables: { publicNumber: '12345' } },
            { id: 'sub2', variables: { publicNumber: '67890' } },
          ],
        },
      },
    ];

    const result = buildPayload({ policy, config, sounds });

    expect(result.PhoneNumbers__c).toBe('12345,67890');
  });

  it('should handle empty nodes array', () => {
    policy.nodes = [];
    
    const result = buildPayload({ policy, config, sounds });
    
    expect(result.PhoneNumbers__c).toBe('');
  });

  it('should handle missing Description__c', () => {
    delete policy.Description__c;
    
    const result = buildPayload({ policy, config, sounds });
    
    expect(result.Description__c).toBe('');
  });

  it('should handle missing Id fields', () => {
    delete policy.Id;
    delete policy.Id__c;
    
    const result = buildPayload({ policy, config, sounds });
    
    expect(result.Id).toBeNull();
    expect(result.Id__c).toBeNull();
  });

  it('should default Type__c to POLICY_TYPE_CALL', () => {
    delete policy.Type__c;
    
    const result = buildPayload({ policy, config, sounds });
    
    expect(result.Type__c).toBe(POLICY_TYPE.CALL);
  });
});

describe('buildBody__c function', () => {
  it('should build a valid body__c structure', () => {
    const policy = {
      Id: 'test-id',
      Id__c: 'test-remote-id',
      Name: 'Test Name',
      Description__c: 'Test Description',
      Type__c: POLICY_TYPE.CALL,
      nodes: [{ id: 'init', data: {} }, { id: 'node-1', data: {} }],
      edges: [],
      finishId: 'finish-node-id',
    };
    const config = { DevOrgId__c: 'dev123', ConnectorId__c: 'conn123' };

    const result = buildBody__c({ policy, config });
    
    expect(result).toHaveProperty('id', 'test-id');
    expect(result).toHaveProperty('name', 'Test Name');
    expect(result).toHaveProperty('finishId', 'finish-node-id');
    expect(result).toHaveProperty('connections');
    expect(Array.isArray(result.connections)).toBe(true);
  });

  it('should include type with advanced and basic properties', () => {
    const policy = {
      Id: 'test-id',
      Name: 'Test',
      Type__c: POLICY_TYPE.CALL,
      nodes: [{ id: 'init', data: {} }],
      edges: [],
      finishId: 'finish-id',
    };
    const config = {};

    const result = buildBody__c({ policy, config });
    
    expect(result.type).toEqual({
      advanced: POLICY_TYPE.CALL,
      basic: 'CALL',
    });
  });

  it('should handle Data Analytics policy type', () => {
    const policy = {
      Id: 'test-id',
      Name: 'Test',
      Type__c: POLICY_TYPE.DATA_ANALYTICS,
      nodes: [{ id: 'init', data: {} }],
      edges: [],
      finishId: 'finish-id',
    };
    const config = {};

    const result = buildBody__c({ policy, config });
    
    expect(result.type).toEqual({
      advanced: POLICY_TYPE.DATA_ANALYTICS,
      basic: 'NON_CALL',
    });
  });

  it('should handle Digital policy type', () => {
    const policy = {
      Id: 'test-id',
      Name: 'Test',
      Type__c: POLICY_TYPE.DIGITAL,
      nodes: [{ id: 'init', data: {} }],
      edges: [],
      finishId: 'finish-id',
    };
    const config = {};

    const result = buildBody__c({ policy, config });
    
    expect(result.type).toEqual({
      advanced: POLICY_TYPE.DIGITAL,
      basic: 'DIGITAL',
    });
  });

  it('should include default navigator settings', () => {
    const policy = {
      Name: 'Test',
      nodes: [{ id: 'init', data: {} }],
      edges: [],
      finishId: 'finish-id',
    };
    const config = {};

    const result = buildBody__c({ policy, config });
    
    expect(result.navigator).toBe(true);
    expect(result.navigatorPositionIndex).toBe(5);
    expect(result.zoom).toBe(1);
    expect(result.grid).toBe(false);
  });

  it('should use existing connections if no edges', () => {
    const existingConnections = [
      { source: { nodeID: '1', id: 'o1' }, dest: { nodeID: '2', id: 'i1' } },
    ];
    const policy = {
      Name: 'Test',
      nodes: [{ id: 'init', data: {} }],
      connections: existingConnections,
      finishId: 'finish-id',
    };
    const config = {};

    const result = buildBody__c({ policy, config });
    
    expect(result.connections).toEqual(existingConnections);
  });

  it('should include lastModifiedDate timestamp', () => {
    const policy = {
      Name: 'Test',
      nodes: [{ id: 'init', data: {} }],
      edges: [],
      finishId: 'finish-id',
    };
    const config = {};

    const beforeTime = Date.now();
    const result = buildBody__c({ policy, config });
    const afterTime = Date.now();
    
    expect(result.lastModifiedDate).toBeGreaterThanOrEqual(beforeTime);
    expect(result.lastModifiedDate).toBeLessThanOrEqual(afterTime);
  });
});

describe('buildPolicy__c function', () => {
  it('should build a valid policy__c structure', () => {
    const policy = {
      Name: 'Test Policy',
      Type__c: POLICY_TYPE.CALL,
      nodes: [
        { id: 'init', data: {} },
        { id: 'node-1', name: 'Node 1', data: { name: 'Node 1' } },
      ],
      finishId: 'finish-id',
    };

    const result = buildPolicy__c({ policy, config: {} });
    
    expect(result.name).toBe('Test Policy');
    expect(result.enabled).toBe(true);
    expect(result.type).toBe('CALL');
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('should include a finish node in items', () => {
    const policy = {
      Name: 'Test Policy',
      Type__c: POLICY_TYPE.CALL,
      nodes: [{ id: 'init', data: {} }],
      finishId: 'finish-id',
    };

    const result = buildPolicy__c({ policy, config: {} });
    
    const finishItem = result.items.find(item => item.name === 'Finish');
    expect(finishItem).toBeDefined();
    expect(finishItem?.id).toBe('finish-id');
  });

  it('should set correct finish templateId for Data Analytics', () => {
    const policy = {
      Name: 'Test Policy',
      Type__c: POLICY_TYPE.DATA_ANALYTICS,
      nodes: [{ id: 'init', data: {} }],
      finishId: 'finish-id',
    };

    const result = buildPolicy__c({ policy, config: {} });
    
    const finishItem = result.items.find(item => item.name === 'Finish');
    // Should use FINISH_ANALYTICS templateId (58)
    expect(finishItem?.templateId).toBe(58);
  });

  it('should set correct finish templateId for Digital', () => {
    const policy = {
      Name: 'Test Policy',
      Type__c: POLICY_TYPE.DIGITAL,
      nodes: [{ id: 'init', data: {} }],
      finishId: 'finish-id',
    };

    const result = buildPolicy__c({ policy, config: {} });
    
    const finishItem = result.items.find(item => item.name === 'Finish');
    // Should use DIGITAL_FINISH templateId (144)
    expect(finishItem?.templateId).toBe(144);
  });
});

describe('getPolicyType', () => {
  it('should return Type__c if present', () => {
    const policy = { Type__c: POLICY_TYPE.DIGITAL };
    expect(getPolicyType(policy as any)).toBe(POLICY_TYPE.DIGITAL);
  });

  it('should default to POLICY_TYPE_CALL if Type__c not present', () => {
    const policy = {};
    expect(getPolicyType(policy as any)).toBe(POLICY_TYPE.CALL);
  });
});

describe('POLICY_TYPE_VALUES', () => {
  it('should map CALL policy type', () => {
    expect(POLICY_TYPE_VALUES[POLICY_TYPE.CALL]).toBe('CALL');
  });

  it('should map DATA_ANALYTICS policy type', () => {
    expect(POLICY_TYPE_VALUES[POLICY_TYPE.DATA_ANALYTICS]).toBe('NON_CALL');
  });

  it('should map DIGITAL policy type', () => {
    expect(POLICY_TYPE_VALUES[POLICY_TYPE.DIGITAL]).toBe('DIGITAL');
  });
});

