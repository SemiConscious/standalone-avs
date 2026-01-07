/**
 * Build Payload for saving policies.
 * Ported from natterbox-routing-policies/src/services/buildPayload.js
 * 
 * This module provides the main function to build the payload for saving
 * a policy back to Salesforce.
 */

import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash-es';
import { NODE_ID } from './nodeClassName';
import {
  PayloadService,
  type PayloadNode,
  type PayloadEdge,
  type PayloadConnection,
  type SalesforceConfig,
  type LicenseData,
} from './payloadService';

const {
  processPayloadItems,
  filterPayloadNodes,
  mapNodesToPayloadFormat,
  mapEdgesToConnections,
} = PayloadService;

// Policy type constants
export const POLICY_TYPE = {
  CALL: 'POLICY_TYPE_CALL',
  DATA_ANALYTICS: 'POLICY_TYPE_DATA_ANALYTICS',
  DIGITAL: 'POLICY_TYPE_DIGITAL',
} as const;

export const POLICY_TYPE_VALUES: Record<string, string> = {
  POLICY_TYPE_CALL: 'CALL',
  POLICY_TYPE_DATA_ANALYTICS: 'NON_CALL',
  POLICY_TYPE_DIGITAL: 'DIGITAL',
};

// Types
export interface PolicyData {
  Id?: string | null;
  Id__c?: string | null;
  Name: string;
  Description__c?: string;
  Type__c?: string;
  Source__c?: string;
  nodes: PayloadNode[];
  edges?: PayloadEdge[];
  connections?: PayloadConnection[];
  finishId?: string;
  zoom?: number;
  grid?: boolean;
  navigator?: boolean;
  navigatorPositionIndex?: number;
  connectionType?: string;
  color?: boolean;
  translateX?: number;
  translateY?: number;
  [key: string]: unknown;
}

export interface SoundData {
  Id__c?: string;
  Tag__c?: string;
  RemoteId?: string;
  Tag?: string;
}

export interface BuildPayloadOptions {
  policy: PolicyData;
  config: SalesforceConfig;
  sounds?: SoundData[];
  licenseData?: LicenseData;
  skipDisplayErrors?: boolean;
}

export interface SavePayload {
  Body__c: string;
  Description__c: string;
  Id: string | null;
  Id__c: string | null;
  Name: string;
  Policy__c: string;
  Type__c: string;
  PhoneNumbers__c: string;
}

export interface Body__cData {
  id: string | null;
  remoteId: string | null;
  name: string;
  description: string | null;
  type: {
    advanced: string;
    basic: string;
  };
  zoom: number;
  grid: boolean;
  source: string;
  navigator: boolean;
  navigatorPositionIndex: number;
  connectionType: string;
  color: boolean;
  translateX: number;
  translateY: number;
  finishId: string;
  lastModifiedDate: number;
  connections: PayloadConnection[];
  nodes: PayloadNode[];
}

export interface Policy__cData {
  name: string;
  enabled: boolean;
  type: string;
  items: PolicyItem[];
}

export interface PolicyItem {
  id: string;
  name: string;
  templateId: number;
  variables: Record<string, unknown> | null;
  subItems: unknown[];
  [key: string]: unknown;
}

/**
 * Get the policy type from a policy object
 */
export function getPolicyType(policy: PolicyData): string {
  return policy?.Type__c ?? 'POLICY_TYPE_CALL';
}

/**
 * Build the Body__c field for the save payload
 */
export function buildBody__c({
  policy,
  config,
  licenseData,
  skipDisplayErrors,
}: {
  policy: PolicyData;
  config: SalesforceConfig;
  licenseData?: LicenseData;
  skipDisplayErrors?: boolean;
}): Body__cData {
  // Filter out init node (first node) from the payload
  const filteredNodes = filterPayloadNodes(policy.nodes.slice(1));
  
  const buildPolicy: Omit<Body__cData, 'connections' | 'nodes'> = {
    id: policy.Id || null,
    remoteId: policy.Id__c || null,
    name: policy.Name,
    description: policy.Description__c || null,
    type: {
      advanced: policy.Type__c ?? POLICY_TYPE.CALL,
      basic: POLICY_TYPE_VALUES[policy.Type__c ?? POLICY_TYPE.CALL] ?? 'CALL',
    },
    zoom: policy.zoom || 1,
    grid: policy.grid ?? false,
    source: policy?.Source__c ?? 'USER',
    navigator: policy.navigator ?? true,
    navigatorPositionIndex: policy.navigatorPositionIndex ?? 5,
    connectionType: policy.connectionType || 'smooth',
    color: policy.color ?? true,
    translateX: policy.translateX || 0,
    translateY: policy.translateY || 0,
    finishId: policy.finishId ?? '',
    lastModifiedDate: new Date().getTime(),
  };

  return {
    ...buildPolicy,
    connections: policy.edges
      ? mapEdgesToConnections(policy.edges, policy.nodes)
      : policy.connections || [],
    nodes: mapNodesToPayloadFormat({
      config,
      licenseData,
      skipDisplayErrors,
      nodes: filteredNodes,
      policyType: POLICY_TYPE_VALUES[policy.Type__c ?? POLICY_TYPE.CALL] ?? 'CALL',
    }),
  };
}

/**
 * Build a policy item for the Policy__c field
 * Simplified version - full implementation would require porting processPolicy.js
 */
function buildPolicyItem({
  policyItems,
  data,
  finishId,
}: {
  policyItems: PolicyItem[];
  data: PayloadNode['data'];
  finishId: string;
  policyType: string;
}): PolicyItem[] {
  const result = [...policyItems];
  
  // Simplified: just create a basic item
  // Full implementation would use PolicyConfig.getDefaultConfig etc.
  if (data?.name) {
    result.push({
      id: data.id as string || uuidv4(),
      name: data.name as string,
      templateId: data.templateId as number ?? 0,
      variables: (data.variables as Record<string, unknown>) ?? null,
      subItems: (data.subItems as unknown[]) ?? [],
      finishId,
    });
  }
  
  return result;
}

/**
 * Build the Policy__c field for the save payload
 */
export function buildPolicy__c({
  policy,
  config,
  sounds,
  licenseData,
  edges,
}: {
  policy: PolicyData;
  config: SalesforceConfig;
  sounds?: SoundData[];
  licenseData?: LicenseData;
  edges?: PayloadEdge[];
}): Policy__cData {
  const policyType = getPolicyType(policy);

  // Build finish node based on policy type
  const finishNode: PolicyItem = {
    id: policy.finishId ?? uuidv4(),
    name: 'Finish',
    templateId: NODE_ID.FINISH,
    variables: null,
    subItems: [],
  };

  switch (policyType) {
    case POLICY_TYPE.DATA_ANALYTICS:
      finishNode.templateId = NODE_ID.FINISH_ANALYTICS;
      break;
    case POLICY_TYPE.DIGITAL:
      finishNode.templateId = NODE_ID.DIGITAL_FINISH;
      break;
    default:
      finishNode.templateId = NODE_ID.FINISH;
      break;
  }

  // Clone nodes and update output parentIds
  const updatedData = cloneDeep(policy.nodes).map((node) => {
    if (!Object.hasOwn(node, 'outputs') || !node.outputs?.length) return node;
    return {
      ...node,
      outputs: node.outputs.map((output, outputIndex) => {
        if (node.id === output.parentId && outputIndex > 0) {
          return { ...output, parentId: uuidv4() };
        }
        return output;
      }),
    };
  });

  // Build policy items from nodes (skip init node at index 0)
  let items = updatedData.slice(1).reduce<PolicyItem[]>((policyItems, item) => {
    if ((item.name || item.data?.name) && !item.parentId && !item.parentNode) {
      return buildPolicyItem({
        policyItems,
        data: item.data,
        finishId: finishNode.id,
        policyType: policyType,
      });
    }

    return policyItems;
  }, []);

  const updatedItems = processPayloadItems(items);
  updatedItems.push(finishNode);
  
  return {
    name: policy.Name,
    enabled: true,
    type: POLICY_TYPE_VALUES[policy.Type__c ?? POLICY_TYPE.CALL] ?? 'CALL',
    items: [...updatedItems],
  };
}

/**
 * Build the PhoneNumbers__c field from nodes
 */
function buildPhoneNumbers__c(nodes: PayloadNode[]): string {
  if (!Array.isArray(nodes)) {
    return '';
  }
  
  return nodes
    .filter(({ data }) => data?.templateId === 3 && !!data.subItems?.length)
    .flatMap(({ data }) =>
      (data?.subItems ?? []).map((subItem) => subItem.variables?.publicNumber)
    )
    .filter(Boolean)
    .join(',');
}

/**
 * Main function to build the complete save payload
 */
export function buildPayload({
  policy,
  config,
  sounds = [],
  licenseData = {},
  skipDisplayErrors,
}: BuildPayloadOptions): SavePayload {
  // Ensure finishId exists
  if (!policy.finishId) {
    policy.finishId = uuidv4();
  }
  
  const clonedPolicy = JSON.parse(JSON.stringify(policy)) as PolicyData;

  return {
    Body__c: JSON.stringify(
      buildBody__c({
        policy: clonedPolicy,
        config,
        skipDisplayErrors,
        licenseData,
      })
    ),
    Description__c: clonedPolicy.Description__c || '',
    Id: clonedPolicy.Id || null,
    Id__c: clonedPolicy.Id__c || null,
    Name: clonedPolicy.Name,
    Policy__c: JSON.stringify(
      buildPolicy__c({
        policy: clonedPolicy,
        config,
        sounds,
        licenseData,
        edges: policy.edges,
      })
    ),
    Type__c: clonedPolicy.Type__c || POLICY_TYPE.CALL,
    PhoneNumbers__c: buildPhoneNumbers__c(clonedPolicy.nodes),
  };
}

export default buildPayload;

