/**
 * Typed GraphQL operations against Charlie. Kept as exported `gql` strings
 * (rather than ASTs) so they can be hand-written without a codegen step in
 * Phase 0; we'll generate types from Charlie's published schema once the
 * dust settles.
 *
 * Only the operations the Phase-0 webphone needs are here:
 *   - `getMediaTransport` (boot the SIP UA)
 *   - `getAgentState` / `setAvailability` / `wrapupComplete` (agent widget)
 *   - call-control mutations + the two CallEvent subscriptions
 *
 * Phase 1+ adds operations per the cutover sequence in
 * `STANDALONE_AVS_INTEGRATION.md` §8.
 */

import { gql } from 'graphql-request';

// =============================================================================
// Health / sanity
// =============================================================================

export const HealthQuery = gql`
  query Health {
    health {
      correlationId
      status
      service
      version
      timestamp
    }
  }
`;

// =============================================================================
// Media transport (webphone bootstrap)
// =============================================================================

export const GetMediaTransportQuery = gql`
  query GetMediaTransport {
    getMediaTransport {
      correlationId
      transport {
        __typename
        ... on ManagedWebphoneTransport {
          sipUri
          sipPassword
          wsUrl
          iceServers {
            urls
            username
            credential
          }
          expiresAt
        }
        ... on ByoSipTransport {
          inboundDids
          outboundTrunk {
            uri
            authUsername
            authPassword
            registrationExpiresAt
          }
        }
      }
      errors {
        code
        description
      }
    }
  }
`;

// =============================================================================
// Agent state
// =============================================================================

export const GetAgentStateQuery = gql`
  query GetAgentState($input: GetAgentStateInput!) {
    getAgentState(input: $input) {
      correlationId
      agent {
        userId
        availability
        availabilityProfile
        wrapupCallId
        sinceTimestamp
      }
      errors {
        code
        description
      }
    }
  }
`;

export const SetAvailabilityMutation = gql`
  mutation SetAvailability($input: SetAvailabilityInput!) {
    setAvailability(input: $input) {
      correlationId
      accepted
      agent {
        userId
        availability
        availabilityProfile
        sinceTimestamp
      }
      errors {
        code
        description
      }
    }
  }
`;

export const WrapupCompleteMutation = gql`
  mutation WrapupComplete($input: WrapupCompleteInput!) {
    wrapupComplete(input: $input) {
      correlationId
      accepted
      agent {
        userId
        availability
        wrapupCallId
      }
      errors {
        code
        description
      }
    }
  }
`;

export const OnAgentStateChangedSubscription = gql`
  subscription OnAgentStateChanged {
    onAgentStateChanged {
      correlationId
      agent {
        userId
        availability
        availabilityProfile
        wrapupCallId
        sinceTimestamp
      }
    }
  }
`;

// =============================================================================
// Call control
// =============================================================================

export const DialMutation = gql`
  mutation Dial($input: DialInput!) {
    dial(input: $input) {
      correlationId
      accepted
      call {
        id
        state
        direction
      }
      errors {
        code
        description
      }
    }
  }
`;

export const AnswerMutation = gql`
  mutation Answer($input: AnswerInput!) {
    answer(input: $input) {
      correlationId
      accepted
      call {
        id
        state
      }
      errors {
        code
        description
      }
    }
  }
`;

export const HangupMutation = gql`
  mutation Hangup($input: HangupInput!) {
    hangup(input: $input) {
      correlationId
      accepted
      call {
        id
        state
      }
      errors {
        code
        description
      }
    }
  }
`;

export const HoldMutation = gql`
  mutation Hold($input: HoldInput!) {
    hold(input: $input) {
      correlationId
      accepted
      call {
        id
        state
      }
      errors {
        code
        description
      }
    }
  }
`;

export const UnholdMutation = gql`
  mutation Unhold($input: UnholdInput!) {
    unhold(input: $input) {
      correlationId
      accepted
      call {
        id
        state
      }
      errors {
        code
        description
      }
    }
  }
`;

export const MuteMutation = gql`
  mutation Mute($input: MuteInput!) {
    mute(input: $input) {
      correlationId
      accepted
      call {
        id
        state
      }
      errors {
        code
        description
      }
    }
  }
`;

export const UnmuteMutation = gql`
  mutation Unmute($input: UnmuteInput!) {
    unmute(input: $input) {
      correlationId
      accepted
      call {
        id
        state
      }
      errors {
        code
        description
      }
    }
  }
`;

export const SendDtmfMutation = gql`
  mutation SendDtmf($input: SendDtmfInput!) {
    sendDtmf(input: $input) {
      correlationId
      accepted
      errors {
        code
        description
      }
    }
  }
`;

export const BlindTransferMutation = gql`
  mutation BlindTransfer($input: BlindTransferInput!) {
    blindTransfer(input: $input) {
      correlationId
      accepted
      call {
        id
        state
      }
      errors {
        code
        description
      }
    }
  }
`;

export const OnCallEventSubscription = gql`
  subscription OnCallEvent($userId: Int, $callId: ID) {
    onCallEvent(userId: $userId, callId: $callId) {
      __typename
      ... on CallRingingEvent {
        callId
        userId
        from
        to
        direction
        ringingAt
      }
      ... on CallAnsweredEvent {
        callId
        userId
        answeredAt
      }
      ... on CallHeldEvent {
        callId
        userId
      }
      ... on CallUnheldEvent {
        callId
        userId
      }
      ... on CallMutedEvent {
        callId
        userId
      }
      ... on CallUnmutedEvent {
        callId
        userId
      }
      ... on CallTransferredEvent {
        callId
        userId
        transferredTo
      }
      ... on CallHungupEvent {
        callId
        userId
        cause
        endedAt
      }
      ... on CallProgressEvent {
        callId
        userId
        progress
      }
      ... on CallDtmfEvent {
        callId
        userId
        digits
      }
    }
  }
`;

export const OnCallStateChangedSubscription = gql`
  subscription OnCallStateChanged($userId: Int) {
    onCallStateChanged(userId: $userId) {
      correlationId
      call {
        id
        state
        direction
      }
    }
  }
`;
