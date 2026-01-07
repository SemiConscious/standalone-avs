/**
 * Tests for Policy Service
 * Validates policy cloning, validation, and export functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clonePolicy,
  validatePolicy,
  generateCloneReport,
  canDeletePolicy,
  getPolicyTypeDisplay,
  POLICY_TYPE,
  type Policy,
  type ClonePolicyOptions,
} from '../policyService';
import { NODE_ID } from '../nodeClassName';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-uuid-1234'),
}));

describe('Policy Service', () => {
  describe('clonePolicy', () => {
    const basePolicyOptions: ClonePolicyOptions = {
      policy: {
        id: 'original-id',
        Id: 'sf-original-id',
        Id__c: 12345,
        name: 'Test Policy',
        description: 'Test Description',
        Type__c: 'CALL',
        nodes: [
          {
            id: 'node-1',
            templateId: 4,
            name: 'Start Node',
          },
        ],
      },
      config: {
        ConnectorId__c: 'connector-123',
        DevOrgId__c: 'dev-org-456',
      },
      sounds: [],
      users: [],
      groups: [],
    };

    it('should clone a policy with new IDs', () => {
      const { policy, report } = clonePolicy(basePolicyOptions);

      expect(policy.Id).toBeUndefined();
      expect(policy.Id__c).toBeNull();
      expect(policy.Name).toBe('Test Policy');
      expect(policy.Description__c).toBe('Test Description');
      expect(policy.Type__c).toBe('CALL');
      // Original id/name/description should be removed
      expect(policy.id).toBeUndefined();
      expect(policy.name).toBeUndefined();
      expect(policy.description).toBeUndefined();
    });

    it('should replace UUIDs with new values', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'd7a19a88-f37d-4771-941f-2490a56ecd14',
              templateId: 4,
              name: 'Node with UUID',
            },
          ],
        },
      };

      const { policy } = clonePolicy(options);
      
      // UUID should be replaced
      expect(policy.nodes[0].id).not.toBe('d7a19a88-f37d-4771-941f-2490a56ecd14');
      expect(policy.nodes[0].id).toBe('mocked-uuid-1234');
    });

    it('should clear inbound number subItems', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'inbound-node',
              templateId: NODE_ID.INBOUND_NUMBER,
              templateClass: 'ModNumber',
              subItems: [
                {
                  name: 'Number 1',
                  variables: { publicNumber: '+1234567890' },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      expect(policy.nodes[0].subItems).toEqual([]);
      expect(report.messages).toContain('Removed Public Number: Number 1 / +1234567890');
    });

    it('should clear digital address subItems', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'digital-node',
              templateId: 140,
              templateClass: 'ModStartDigital',
              subItems: [
                {
                  name: 'Digital Address 1',
                  variables: { flowHook: 'hook-123' },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      expect(policy.nodes[0].subItems).toEqual([]);
      expect(report.messages).toContain('Removed Digital Number: Digital Address 1');
    });

    it('should clear To Policy node outputs and connections', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'to-policy-node',
              templateId: 66,
              templateClass: 'ModPolicy',
              outputs: [
                { name: 'Linked Policy A' },
                { name: 'Linked Policy B' },
              ],
              data: {
                outputs: [
                  { name: 'Linked Policy A' },
                ],
              },
            },
          ],
          connections: [
            { id: 'conn-1', source: { nodeID: 'to-policy-node' } },
            { id: 'conn-2', source: { nodeID: 'other-node' } },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      expect(policy.nodes[0].outputs).toEqual([]);
      expect(policy.nodes[0].data?.outputs).toEqual([]);
      expect(report.messages).toContain('Removed Linked Policy: Linked Policy A');
      expect(report.messages).toContain('Removed Linked Policy: Linked Policy B');
      // Connection from to-policy-node should be removed
      expect(policy.connections).toHaveLength(1);
      expect(policy.connections![0].id).toBe('conn-2');
    });

    it('should skip ModPolicy_ToNonCall and ModPolicy_ToCall nodes', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'keep-node',
              templateId: 4,
              name: 'Keep Me',
            },
            {
              id: 'skip-non-call',
              templateId: 100,
              templateClass: 'ModPolicy_ToNonCall',
            },
            {
              id: 'skip-call',
              templateId: 101,
              templateClass: 'ModPolicy_ToCall',
            },
          ],
        },
      };

      const { policy } = clonePolicy(options);

      expect(policy.nodes).toHaveLength(1);
      expect(policy.nodes[0].name).toBe('Keep Me');
    });

    it('should skip legacy inbound number nodes without templateClass', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'legacy-inbound',
              templateId: NODE_ID.INBOUND_NUMBER,
              // No templateClass - legacy node
            },
            {
              id: 'modern-inbound',
              templateId: NODE_ID.INBOUND_NUMBER,
              templateClass: 'ModNumber',
            },
          ],
        },
      };

      const { policy } = clonePolicy(options);

      // Legacy node without templateClass should be skipped
      expect(policy.nodes).toHaveLength(1);
      // Modern node should be kept (ID isn't a UUID so it won't be replaced)
      expect(policy.nodes[0].templateClass).toBe('ModNumber');
    });

    it('should remove invalid user references from ModConnect', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        users: [{ Id: 'valid-user-123' }],
        groups: [{ Id: 'valid-group-456' }],
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'connect-node',
              templateId: 50,
              name: 'Connect Node',
              outputs: [
                {
                  name: 'Connect Output',
                  templateClass: 'ModConnect',
                  config: {
                    connectAction: {
                      public: { method: 'USER', target: 'invalid-user' },
                      extension: { method: 'GROUP', target: 'valid-group-456' },
                    },
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      const connectAction = policy.nodes[0].outputs![0].config!.connectAction as Record<string, { target: string | null }>;
      expect(connectAction.public.target).toBeNull();
      expect(connectAction.extension.target).toBe('valid-group-456');
      expect(report.messages.some(m => m.includes('removed reference to User'))).toBe(true);
    });

    it('should remove invalid group references from queue ring targets', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        groups: [{ Id: 'valid-group-123' }],
        sounds: [{ Id: '350441', Tag__c: '{ValidSound}' }],
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'queue-node',
              templateId: 60,
              name: 'Queue Node',
              outputs: [
                {
                  name: 'Call Queue',
                  templateClass: 'ModConnect_Queue',
                  variables: {
                    ringTargets: [
                      { groupId: 'invalid-group' },
                      { groupId: 'valid-group-123' },
                    ],
                    announcements: [
                      { type: 'SOUND', soundId: 'invalid-sound' },
                    ],
                  },
                  configCallbackAndChime: {
                    chime: [{ chime: '{InvalidTag}' }],
                  },
                  configForLuaScript: {
                    chime: [{ chime: '{ValidSound}' }],
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      const ringTargets = policy.nodes[0].outputs![0].variables!.ringTargets as Array<{ groupId: string | null }>;
      expect(ringTargets[0].groupId).toBeNull();
      expect(ringTargets[1].groupId).toBe('valid-group-123');
      
      const announcements = policy.nodes[0].outputs![0].variables!.announcements as Array<{ soundId: string }>;
      expect(announcements[0].soundId).toBe('');
      
      // Invalid chime should be cleared
      const chime1 = (policy.nodes[0].outputs![0].configCallbackAndChime as { chime: Array<{ chime: string }> }).chime;
      expect(chime1[0].chime).toBe('');
      
      // Valid chime should be kept
      const chime2 = (policy.nodes[0].outputs![0].configForLuaScript as { chime: Array<{ chime: string }> }).chime;
      expect(chime2[0].chime).toBe('{ValidSound}');
    });

    it('should reset archivePolicyId for Record node', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'record-node',
              templateId: 70,
              name: 'Record Node',
              outputs: [
                {
                  name: 'Record Output',
                  templateClass: 'ModAction_Record',
                  variables: {
                    archivePolicyId: 'old-archive-policy-123',
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy } = clonePolicy(options);

      expect(policy.nodes[0].outputs![0].variables!.archivePolicyId).toBeNull();
    });

    it('should update connector config for RecordAnalyse node', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        namespacePrefix: 'custom_ns',
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'analyse-node',
              templateId: 80,
              name: 'Analyse Node',
              outputs: [
                {
                  name: 'Analyse Output',
                  templateClass: 'ModAction_RecordAnalyse',
                  config: {
                    existingField: 'value',
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy } = clonePolicy(options);

      const config = policy.nodes[0].outputs![0].config!;
      expect(config.existingField).toBe('value');
      expect(config.connectorId).toBe('connector-123');
      expect(config.devOrgId).toBe('dev-org-456');
      expect(config.namespacePrefix).toBe('custom_ns');
    });

    it('should remove invalid skills from RequestSkills node', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        skills: [{ Id: 'valid-skill-123' }],
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'skills-node',
              templateId: 90,
              name: 'Skills Node',
              outputs: [
                {
                  name: 'Request Skills',
                  templateClass: 'ModAction_RequestSkills',
                  config: {
                    skills: [
                      { Id__c: 'valid-skill-123', Name: 'Valid Skill' },
                      { Id__c: 'invalid-skill', Name: 'Invalid Skill' },
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      const skills = policy.nodes[0].outputs![0].config!.skills as Array<{ Id__c: string }>;
      expect(skills).toHaveLength(1);
      expect(skills[0].Id__c).toBe('valid-skill-123');
      expect(report.messages).toContain('Removed Skill "Invalid Skill" from Request Skills');
    });

    it('should reset knowledge base fields for AI Knowledge nodes', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'ai-knowledge-node',
              templateId: 200,
              name: 'AI Knowledge',
              outputs: [
                {
                  name: 'AI Knowledge Output',
                  templateClass: 'NatterboxAI_VoiceAIKnowledge',
                  config: {
                    component: {
                      knowledgeBaseId: 'kb-123',
                      tagFilter: ['tag1', 'tag2'],
                      metaPropertyFilter: [
                        { label: 'meta1', value: 'value1' },
                      ],
                      otherField: 'preserved',
                    },
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      const component = policy.nodes[0].outputs![0].config!.component as Record<string, unknown>;
      expect(component.knowledgeBaseId).toBeNull();
      expect(component.tagFilter).toEqual([]);
      expect(component.metaPropertyFilter).toEqual([]);
      expect(component.otherField).toBe('preserved');
      expect(report.messages).toContain('Removed Knowledge base with ID: kb-123');
    });

    it('should reset agent fields for AI Agent nodes', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'ai-agent-node',
              templateId: 210,
              name: 'AI Agent',
              outputs: [
                {
                  name: 'AI Agent Output',
                  templateClass: 'NatterboxAI_DigitalAIAgent',
                  config: {
                    component: {
                      agentId: 'agent-123',
                      someField: 'value',
                    },
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      const component = policy.nodes[0].outputs![0].config!.component as Record<string, unknown>;
      expect(component.agentId).toBeNull();
      expect(component.agentVersion).toBe('HEAD');
      expect(component.tokens).toEqual([]);
      expect(component.someField).toBe('value');
      expect(report.messages).toContain('Removed Agent with ID: agent-123');
    });

    it('should clear connectedFrom references for removed nodes', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'to-policy-node',
              templateId: 66,
              templateClass: 'ModPolicy',
              outputs: [{ name: 'Output' }],
            },
            {
              id: 'connected-node',
              templateId: 4,
              connectedFromNode: 'to-policy-node',
              connectedFromItem: 'item-1',
            },
          ],
        },
      };

      const { policy } = clonePolicy(options);

      const connectedNode = policy.nodes.find(n => n.templateId === 4);
      expect(connectedNode?.connectedFromNode).toBeNull();
      expect(connectedNode?.connectedFromItem).toBeNull();
    });

    it('should log macros and sound tags in report', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'script-node',
              templateId: 118,
              variables: {
                callerIdName: '$(AIConversationJsonData)',
                sayPhrase: '{SoundTag}',
              },
            },
          ],
        },
      };

      const { report } = clonePolicy(options);

      // Macros and sound tags should be logged
      expect(report.messages.some(m => m.includes('Macro:'))).toBe(true);
      expect(report.messages.some(m => m.includes('Sound Tag:'))).toBe(true);
    });

    it('should process MOD_CONNECT_FOLLOW_ME output', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        users: [],
        groups: [],
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'connect-node',
              templateId: 10,
              name: 'Connect Node',
              outputs: [
                {
                  id: 'follow-me-output',
                  name: 'Follow Me',
                  templateClass: 'ModConnect_FollowMe',
                  config: {
                    followMe: [
                      { method: 'USER', target: 'user-123' },
                      { method: 'GROUP', target: 'group-456' },
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      // Users and groups should be cleared since they don't exist in provided arrays
      const followMe = policy.nodes[0].outputs?.[0].config?.followMe as Array<{ method: string; target: string | null }>;
      expect(followMe[0].target).toBeNull();
      expect(followMe[1].target).toBeNull();
    });

    it('should process MOD_CONNECT_QUEUE output', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        groups: [],
        sounds: [],
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'connect-node',
              templateId: 10,
              name: 'Connect Node',
              outputs: [
                {
                  id: 'queue-output',
                  name: 'Queue',
                  templateClass: 'ModConnect_Queue',
                  variables: {
                    ringTargets: [{ groupId: 'group-123' }],
                    announcements: [{ soundId: 'sound-456' }],
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      // Group and sounds should be cleared since they don't exist
      const variables = policy.nodes[0].outputs?.[0].variables;
      const ringTargets = variables?.ringTargets as Array<{ groupId: string | null }>;
      const announcements = variables?.announcements as Array<{ soundId: string | number }>;
      expect(ringTargets[0].groupId).toBeNull();
      expect(announcements[0].soundId).toBe(''); // Sound cleared to empty string
    });

    it('should clear archivePolicyId for MOD_ACTION_RECORD output', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'action-node',
              templateId: 10,
              name: 'Action Node',
              outputs: [
                {
                  id: 'record-output',
                  templateClass: 'ModAction_Record',
                  variables: {
                    archivePolicyId: 'policy-123',
                    otherSetting: 'value',
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy } = clonePolicy(options);

      expect(policy.nodes[0].outputs?.[0].variables?.archivePolicyId).toBeNull();
      expect(policy.nodes[0].outputs?.[0].variables?.otherSetting).toBe('value');
    });

    it('should set config for MOD_ACTION_RECORD_ANALYSE output', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        config: {
          ConnectorId__c: 'connector-abc',
          DevOrgId__c: 'dev-org-xyz',
        },
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'action-node',
              templateId: 10,
              name: 'Action Node',
              outputs: [
                {
                  id: 'analyse-output',
                  templateClass: 'ModAction_RecordAnalyse',
                  config: { existingSetting: true },
                },
              ],
            },
          ],
        },
      };

      const { policy } = clonePolicy(options);

      expect(policy.nodes[0].outputs?.[0].config?.connectorId).toBe('connector-abc');
      expect(policy.nodes[0].outputs?.[0].config?.devOrgId).toBe('dev-org-xyz');
      expect(policy.nodes[0].outputs?.[0].config?.namespacePrefix).toBe('nbavs');
      expect(policy.nodes[0].outputs?.[0].config?.existingSetting).toBe(true);
    });

    it('should process MOD_ACTION_REQUEST_SKILLS output', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        skills: [{ Id: 'skill-1', Id__c: 'skill-1', Name: 'Sales' }],
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'action-node',
              templateId: 10,
              name: 'Action Node',
              outputs: [
                {
                  id: 'skills-output',
                  name: 'Skills',
                  templateClass: 'ModAction_RequestSkills',
                  config: {
                    skills: [
                      { Id__c: 'unknown-skill', Name: 'Unknown' },
                      { Id__c: 'skill-1', Name: 'Sales' },
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      // Unknown skill should be filtered out, known skill should be preserved
      const skills = policy.nodes[0].outputs?.[0].config?.skills as Array<{ Id__c: string }>;
      expect(skills).toHaveLength(1);
      expect(skills[0].Id__c).toBe('skill-1');
      expect(report.messages).toContain('Removed Skill "Unknown" from Skills');
    });

    it('should process MOD_ACTION_NOTIFY output with chatter', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        sfUsers: [{ Id: 'sf-user-1' }],
        chatterGroups: [{ Id: 'group-1' }],
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'action-node',
              templateId: 10,
              name: 'Action Node',
              outputs: [
                {
                  id: 'notify-output',
                  name: 'Notify',
                  templateClass: 'ModAction_Notify',
                  subItems: {
                    chatter: [
                      { targetType: 'user', target: 'unknown-user' },
                      { targetType: 'group', target: 'unknown-group' },
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      // Unknown users/groups should be cleared to empty string
      const chatter = policy.nodes[0].outputs?.[0].subItems?.chatter as Array<{ targetType: string; target: string }>;
      expect(chatter[0].target).toBe('');
      expect(chatter[1].target).toBe('');
    });

    it('should process MOD_FINISH_VOICEMAIL output', () => {
      const options: ClonePolicyOptions = {
        ...basePolicyOptions,
        users: [],
        groups: [],
        policy: {
          ...basePolicyOptions.policy,
          nodes: [
            {
              id: 'finish-node',
              templateId: 10,
              name: 'Finish Node',
              outputs: [
                {
                  id: 'voicemail-output',
                  templateClass: 'ModFinish_VoiceMail',
                  variables: {
                    mailbox: {
                      type: 'USER',
                      userId: 'unknown-user',
                    },
                  },
                },
              ],
            },
          ],
        },
      };

      const { policy, report } = clonePolicy(options);

      // Unknown user should be deleted (not null)
      const mailbox = policy.nodes[0].outputs?.[0].variables?.mailbox as { type: string; userId?: string };
      expect(mailbox.userId).toBeUndefined();
    });
  });

  describe('validatePolicy', () => {
    it('should return empty array for valid policy', () => {
      const policy: Policy = {
        Name: 'Valid Policy',
        nodes: [{ id: 'node-1', templateId: 1 }],
      };

      const errors = validatePolicy(policy);
      expect(errors).toEqual([]);
    });

    it('should return error for missing name', () => {
      const policy: Policy = {
        nodes: [{ id: 'node-1', templateId: 1 }],
      };

      const errors = validatePolicy(policy);
      expect(errors).toContain('Policy name is required');
    });

    it('should return error for empty nodes', () => {
      const policy: Policy = {
        Name: 'Test',
        nodes: [],
      };

      const errors = validatePolicy(policy);
      expect(errors).toContain('Policy must have at least one node');
    });

    it('should return error for SupportChat node without name', () => {
      const policy: Policy = {
        Name: 'Test',
        nodes: [
          {
            id: 'support-chat',
            templateId: 100,
            title: 'SupportChat',
            data: { name: '' },
          },
        ],
      };

      const errors = validatePolicy(policy);
      expect(errors).toContain('Name field for SupportChat node is required!');
    });

    it('should return error for Event node without selected event', () => {
      const policy: Policy = {
        Name: 'Test',
        nodes: [
          {
            id: 'event-node',
            templateId: 200,
            data: {
              config: {
                component: { label: null },
              },
            },
          },
        ],
      };

      const errors = validatePolicy(policy);
      expect(errors).toContain('You need to select an Event from the list!');
    });
  });

  describe('generateCloneReport', () => {
    it('should return empty string for empty report', () => {
      const report = { messages: [] };
      const result = generateCloneReport(report, 'Test Policy');
      expect(result).toBe('');
    });

    it('should generate formatted report with sorted messages', () => {
      const report = {
        messages: [
          'Removed Z item',
          'Removed A item',
          'Removed M item',
        ],
      };

      const result = generateCloneReport(report, 'My Policy');

      expect(result).toContain('Policy Clone Report for: My Policy');
      expect(result).toContain('Removed A item');
      expect(result).toContain('Removed M item');
      expect(result).toContain('Removed Z item');
      // Should be sorted
      const aIndex = result.indexOf('Removed A item');
      const mIndex = result.indexOf('Removed M item');
      const zIndex = result.indexOf('Removed Z item');
      expect(aIndex).toBeLessThan(mIndex);
      expect(mIndex).toBeLessThan(zIndex);
    });
  });

  describe('canDeletePolicy', () => {
    it('should return true for user-created policies', () => {
      const policy: Policy = { nodes: [], Source__c: 'USER' };
      expect(canDeletePolicy(policy)).toBe(true);
    });

    it('should return false for SYSTEM policies', () => {
      const policy: Policy = { nodes: [], Source__c: 'SYSTEM' };
      expect(canDeletePolicy(policy)).toBe(false);
    });

    it('should return true when Source__c is undefined', () => {
      const policy: Policy = { nodes: [] };
      expect(canDeletePolicy(policy)).toBe(true);
    });
  });

  describe('getPolicyTypeDisplay', () => {
    it('should return "Call" for CALL type', () => {
      expect(getPolicyTypeDisplay(POLICY_TYPE.CALL)).toBe('Call');
    });

    it('should return "Data Analytics" for DATA_ANALYTICS type', () => {
      expect(getPolicyTypeDisplay(POLICY_TYPE.DATA_ANALYTICS)).toBe('Data Analytics');
    });

    it('should return "Digital" for DIGITAL type', () => {
      expect(getPolicyTypeDisplay(POLICY_TYPE.DIGITAL)).toBe('Digital');
    });

    it('should return "Unknown" for undefined type', () => {
      expect(getPolicyTypeDisplay(undefined)).toBe('Unknown');
    });

    it('should return "Unknown" for unknown type', () => {
      expect(getPolicyTypeDisplay('UNKNOWN_TYPE')).toBe('Unknown');
    });
  });
});

