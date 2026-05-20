/**
 * Typed GraphQL operations against Charlie.
 *
 * Phase 0 (boot + agent + events):
 *   - `getMediaTransport` (boot the SIP UA)
 *   - `getAgentState` / `setAvailability` / `wrapupComplete` (agent widget)
 *   - the two CallEvent subscriptions for cross-device sync /
 *     observability
 *
 * Phase B.3 (Tier 1 — read-side data-plane migration):
 *   Per-domain `list*` + `get*` queries the SvelteKit page-server loaders
 *   call to populate /users, /groups, /devices, /phone-numbers,
 *   /routing-policies, /call-logs. Backed by `@charlie/adapters-sapien`
 *   when the dispatcher Lambda has `CHARLIE_ADAPTER=sapien`.
 *
 * Phase B.5 (SIP-driven pivot — May 2026):
 *   SIP-layer call-control mutations (dial / answer / hangup / hold /
 *   unhold / mute / unmute / sendDtmf / blindTransfer / attendedTransfer*)
 *   moved out of Charlie's GraphQL surface. The webphone widget drives
 *   those directly via JsSIP against `webphoned`. See
 *   `charlie-api/docs/CTI_INTEGRATION.md`.
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
      state {
        organizationId
        userId
        availability
        availabilityProfile
        since
        wrapupCode
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
      state {
        organizationId
        userId
        availability
        availabilityProfile
        since
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
      state {
        organizationId
        userId
        availability
        wrapupCode
      }
      errors {
        code
        description
      }
    }
  }
`;

export const OnAgentStateChangedSubscription = gql`
  subscription OnAgentStateChanged($userId: Int) {
    onAgentStateChanged(userId: $userId) {
      correlationId
      state {
        organizationId
        userId
        availability
        availabilityProfile
        since
        wrapupCode
      }
    }
  }
`;

// =============================================================================
// Call events (subscriptions only — SIP-layer call control happens
// via JsSIP in the webphone widget; see Phase B.5 note above)
// =============================================================================

// Charlie's `CallEvent` union members all carry `{ correlationId, type,
// call: Call }` (per `packages/server/src/schema/calls.graphql`).
// Earlier this client speculatively asked for flat `callId / userId /
// from / to / ringingAt / answeredAt / progress` fields on each event
// type — those don't exist on the server and AppSync rejected the
// subscription with a wall of `Validation error of type FieldUndefined`.
//
// The shape below mirrors the schema verbatim. The few flat-shaped
// events (`CallDtmfEvent`, recording started/stopped) ARE flat on the
// server, so we keep their flat selection.
const CallSummaryFragment = gql`
  fragment CallSummary on Call {
    id
    organizationId
    userId
    direction
    state
    startedAt
    answeredAt
    endedAt
  }
`;

export const OnCallEventSubscription = gql`
  ${CallSummaryFragment}
  subscription OnCallEvent($userId: Int, $callId: ID) {
    onCallEvent(userId: $userId, callId: $callId) {
      __typename
      ... on CallRingingEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
      }
      ... on CallProgressEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
      }
      ... on CallAnsweredEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
      }
      ... on CallHeldEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
      }
      ... on CallUnheldEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
      }
      ... on CallMutedEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
      }
      ... on CallUnmutedEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
      }
      ... on CallTransferringEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
        consultCallId
      }
      ... on CallTransferredEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
        transferredTo
      }
      ... on CallConferencedEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
        participantCallIds
      }
      ... on CallHungupEvent {
        correlationId
        type
        call {
          ...CallSummary
        }
        cause
      }
      ... on CallDtmfEvent {
        correlationId
        type
        callId
        userId
        digits
      }
      ... on CallRecordingStartedEvent {
        correlationId
        type
        callId
        userId
        recordingId
      }
      ... on CallRecordingStoppedEvent {
        correlationId
        type
        callId
        userId
        recordingId
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

// =============================================================================
// Phase B.3 / Tier 1 — Read-side data-plane queries
//
// One List* + Get* per domain. Field selection is the union of what the
// SvelteKit list/detail page-server loaders currently project off the
// SF-backed repository — kept conservative so the projection shape doesn't
// have to change on the page-component side.
// =============================================================================

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------

const UserFieldsFragment = gql`
  fragment UserFields on User {
    id
    platformId
    name
    firstName
    lastName
    email
    username
    extension
    mobilePhone
    status
    enabled
    licenses {
      cti
      pbx
      manager
      record
      pci
      scv
      sms
      whatsApp
      insights
      freedom
    }
    permissionLevel
    trackOutboundCtiDevice
    availabilityProfile
    availabilityState
    linkedCrmUser {
      name
      email
    }
    groups
  }
`;

export const ListUsersQuery = gql`
  ${UserFieldsFragment}
  query ListUsers($input: ListUsersInput) {
    listUsers(input: $input) {
      correlationId
      items {
        ...UserFields
      }
      continuationToken
      hasMore
    }
  }
`;

export const GetUserQuery = gql`
  ${UserFieldsFragment}
  query GetUser($input: GetUserInput!) {
    getUser(input: $input) {
      correlationId
      user {
        ...UserFields
      }
      errors {
        code
        description
      }
    }
  }
`;

// -----------------------------------------------------------------------------
// Groups
// -----------------------------------------------------------------------------

const GroupFieldsFragment = gql`
  fragment GroupFields on Group {
    id
    platformId
    name
    description
    email
    extension
    groupPickup
    pbx
    manager
    record
    lastModified
    memberCount
  }
`;

export const ListGroupsQuery = gql`
  ${GroupFieldsFragment}
  query ListGroups($input: ListGroupsInput) {
    listGroups(input: $input) {
      correlationId
      items {
        ...GroupFields
      }
      continuationToken
      hasMore
    }
  }
`;

export const GetGroupQuery = gql`
  ${GroupFieldsFragment}
  query GetGroup($input: GetGroupInput!) {
    getGroup(input: $input) {
      correlationId
      group {
        ...GroupFields
      }
      errors {
        code
        description
      }
    }
  }
`;

export const GetGroupMembersQuery = gql`
  query GetGroupMembers($input: GetGroupMembersInput!) {
    getGroupMembers(input: $input) {
      correlationId
      members {
        id
        groupId
        groupName
        userId
        userName
        ringOrder
      }
      errors {
        code
        description
      }
    }
  }
`;

// -----------------------------------------------------------------------------
// Devices
// -----------------------------------------------------------------------------

const DeviceFieldsFragment = gql`
  fragment DeviceFields on Device {
    id
    platformId
    extension
    location
    description
    type
    model
    macAddress
    enabled
    registered
    registrationExpiry
    lastModified
    assignedUserId
    assignedUserName
  }
`;

export const ListDevicesQuery = gql`
  ${DeviceFieldsFragment}
  query ListDevices($input: ListDevicesInput) {
    listDevices(input: $input) {
      correlationId
      items {
        ...DeviceFields
      }
      continuationToken
      hasMore
    }
  }
`;

export const GetDeviceQuery = gql`
  ${DeviceFieldsFragment}
  query GetDevice($input: GetDeviceInput!) {
    getDevice(input: $input) {
      correlationId
      device {
        ...DeviceFields
      }
      errors {
        code
        description
      }
    }
  }
`;

// -----------------------------------------------------------------------------
// Phone numbers
// -----------------------------------------------------------------------------

const PhoneNumberFieldsFragment = gql`
  fragment PhoneNumberFields on PhoneNumber {
    id
    name
    number
    formattedNumber
    country
    countryCode
    area
    areaCode
    localNumber
    isDDI
    isGeographic
    smsEnabled
    mmsEnabled
    voiceEnabled
    localPresenceEnabled
    lastModified
    userId
    userName
    callFlowId
    callFlowName
  }
`;

export const ListPhoneNumbersQuery = gql`
  ${PhoneNumberFieldsFragment}
  query ListPhoneNumbers($input: ListPhoneNumbersInput) {
    listPhoneNumbers(input: $input) {
      correlationId
      items {
        ...PhoneNumberFields
      }
      continuationToken
      hasMore
    }
  }
`;

export const GetPhoneNumberQuery = gql`
  ${PhoneNumberFieldsFragment}
  query GetPhoneNumber($input: GetPhoneNumberInput!) {
    getPhoneNumber(input: $input) {
      correlationId
      phoneNumber {
        ...PhoneNumberFields
      }
      errors {
        code
        description
      }
    }
  }
`;

// -----------------------------------------------------------------------------
// Routing policies
// -----------------------------------------------------------------------------

const RoutingPolicyFieldsFragment = gql`
  fragment RoutingPolicyFields on RoutingPolicy {
    id
    platformId
    name
    description
    source
    type
    status
    createdById
    createdByName
    createdDate
    lastModifiedById
    lastModifiedByName
    lastModifiedDate
    phoneNumbers
  }
`;

export const ListRoutingPoliciesQuery = gql`
  ${RoutingPolicyFieldsFragment}
  query ListRoutingPolicies($input: ListRoutingPoliciesInput) {
    listRoutingPolicies(input: $input) {
      correlationId
      items {
        ...RoutingPolicyFields
      }
      continuationToken
      hasMore
    }
  }
`;

export const GetRoutingPolicyQuery = gql`
  ${RoutingPolicyFieldsFragment}
  query GetRoutingPolicy($input: GetRoutingPolicyInput!) {
    getRoutingPolicy(input: $input) {
      correlationId
      routingPolicy {
        ...RoutingPolicyFields
      }
      errors {
        code
        description
      }
    }
  }
`;

// -----------------------------------------------------------------------------
// Call logs
// -----------------------------------------------------------------------------

export const ListCallLogsQuery = gql`
  query ListCallLogs($input: ListCallLogsInput) {
    listCallLogs(input: $input) {
      correlationId
      items {
        id
        callId
        direction
        outcome
        fromNumber
        toNumber
        fromUserId
        fromUserName
        toUserId
        toUserName
        startedAt
        answeredAt
        endedAt
        durationSeconds
        ringingTimeSeconds
        huntingTimeSeconds
        hasRecording
        recordingId
      }
      continuationToken
      hasMore
    }
  }
`;
