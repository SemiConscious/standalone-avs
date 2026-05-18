/**
 * Types shared by the webphone components. Documented in
 * `charlie-api/docs/WEBPHONE.md` §4.
 */

export type CallLegState =
  | 'DIALING' // local user clicked dial, Charlie hasn't responded
  | 'INITIATED' // Charlie returned accepted=true, awaiting first event
  | 'RINGING' // CallRingingEvent received (inbound) or CallProgressEvent (outbound)
  | 'CONNECTED' // CallAnsweredEvent received
  | 'HELD' // CallHeldEvent received
  | 'TRANSFERRING' // attended transfer in flight
  | 'TRANSFERRED' // attended transfer completed
  | 'HUNGUP'; // CallHungupEvent received, leg is dead

export type CallDirection = 'INBOUND' | 'OUTBOUND';

export interface CallLeg {
  /** Stable Charlie call id once known. Until then, falls back to correlationId. */
  id: string;
  /** Always set — generated client-side at dial / on inbound. */
  correlationId: string;
  state: CallLegState;
  direction: CallDirection | null;
  from: string | null;
  to: string | null;
  muted: boolean;
  startedAt: number;
  endedAt: number | null;
  /** Hangup cause from `CallHungupEvent`. */
  cause: string | null;
}

export type WebphoneRegistrationStatus =
  | 'IDLE'
  | 'BOOTSTRAPPING'
  | 'REGISTERING'
  | 'REGISTERED'
  | 'REGISTRATION_FAILED'
  | 'DISCONNECTED';

export interface WebphoneStatus {
  registration: WebphoneRegistrationStatus;
  /** Most recent registration failure reason, if any. */
  lastError: string | null;
  /** SIP URI we're registered as. */
  sipUri: string | null;
  /** Where the SIP-over-WSS connection is pointed. */
  wsUrl: string | null;
}

/**
 * Mirrors `AgentAvailabilityEnum` in
 * `charlie-api/packages/server/src/schema/agent.graphql`. Keep in lockstep
 * with the schema — if Charlie adds a new variant, add it here too.
 */
export type WebphoneAgentAvailability =
  | 'AVAILABLE'
  | 'ON_BREAK'
  | 'BUSY'
  | 'AWAY'
  | 'OFFLINE';

/**
 * Mirrors the `AgentState` type in
 * `charlie-api/packages/server/src/schema/agent.graphql`. `organizationId`
 * + `userId` + `availability` + `since` are non-null in the schema; the
 * `null`-able shape here is for the local pre-bootstrap state before the
 * first `getAgentState` resolves.
 */
export interface AgentSnapshot {
  organizationId: number | null;
  userId: number | null;
  availability: WebphoneAgentAvailability;
  availabilityProfile: string | null;
  since: string | null;
  wrapupCode: string | null;
}
