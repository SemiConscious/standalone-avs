/**
 * Public barrel for `$lib/components/webphone`. Dynamic-imported by
 * `+layout.svelte` so JsSIP (~150 KB) stays out of the critical-path
 * bundle for users without webphone access.
 */

export { default as Webphone } from './Webphone.svelte';
export { default as AgentState } from './AgentState.svelte';
export {
  WebphoneClient,
  type WebphoneClientEvent,
  type MediaTransportConfig,
} from './WebphoneClient';

export {
  webphoneStatus,
  callLegs,
  callLegList,
  agentSnapshot,
  upsertCallLeg,
  setCallLegState,
  removeCallLeg,
  setAgentSnapshot,
  setWebphoneStatus,
} from './store';

export type {
  CallLeg,
  CallLegState,
  CallDirection,
  WebphoneRegistrationStatus,
  WebphoneStatus,
  WebphoneAgentAvailability,
  AgentSnapshot,
} from './types';
