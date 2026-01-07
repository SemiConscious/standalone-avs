# Natterbox AVS Portal - Comprehensive Audit Report

## Executive Summary

This document provides a comprehensive audit comparing the **standalone-avs Svelte Portal** against the reference implementations:
1. **avs-sfdx** - Salesforce DX Package (478 Apex classes)
2. **natterbox-routing-policies** - React Policy Builder (255+ components)

The audit identifies feature gaps, data integrity requirements, and UI/UX improvement opportunities across all modules.

---

## 1. Module Inventory

### 1.1 Svelte Portal Routes

| Route | Status | Data Sources |
|-------|--------|--------------|
| `/users` | Implemented | Salesforce `User__c` |
| `/users/[id]` | Implemented | Salesforce `User__c`, `GroupMember__c` |
| `/users/new` | Partial | Missing implementation |
| `/groups` | Implemented | Salesforce `Group__c` |
| `/groups/[id]` | Partial | Needs member management |
| `/phone-numbers` | Implemented | Salesforce `PhoneNumber__c` |
| `/devices` | Implemented | Salesforce `Device__c`, `DeviceMapping__c` |
| `/call-logs` | Implemented | Salesforce `CallLog__c` (+ recording playback) |
| `/sounds` | Implemented | Salesforce `Sound__c` |
| `/skills` | Implemented | Salesforce `Skill__c` |
| `/messaging` | Placeholder | Not implemented |
| `/wallboards` | Placeholder | Not implemented |
| `/general-settings` | Partial | License info only |
| `/call-status` | Implemented | Real-time via Sapien |
| `/policy-editor/[id]` | In Progress | React parity work |

### 1.2 avs-sfdx Controllers (Key Classes)

| Controller | Purpose | Svelte Parity |
|------------|---------|---------------|
| `UserController` | Single user CRUD | ✅ Full |
| `UserListController` | User list + batch operations | ⚠️ Missing: Batch disable, permission sync |
| `UserLicenseController` | License management | ⚠️ Partial - UI only |
| `GroupController` | Group CRUD + purpose validation | ⚠️ Missing: Purpose validation |
| `GroupListController` | Group list | ✅ Full |
| `GroupMemberController` | Member management | ❌ Not implemented |
| `GroupAdministratorController` | Admin permissions | ❌ Not implemented |
| `PhoneNumbersController` | Phone numbers sync | ✅ Full |
| `PhoneNumberController` | Single phone CRUD | ⚠️ Missing: Call flow assignment |
| `DeviceListController` | Device list + sync | ✅ Full |
| `DeviceController` | Single device CRUD | ⚠️ Missing: Web phone config |
| `SoundController` | Sound CRUD + attachment | ✅ Full |
| `SkillListController` | Skills list | ✅ Full |
| `SkillController` | Skill CRUD + user assignment | ⚠️ Missing: User assignment |
| `CallLogsController` | Call history | ✅ Full |
| `CallFlowRemoting` | Policy builder API | ⚠️ Partial - Many methods missing |

---

## 2. Feature Gap Analysis

### 2.1 User Management

#### Implemented Features
- ✅ List users with filtering and search
- ✅ View/edit user details (name, extension, mobile)
- ✅ License assignment (CTI, PBX, Manager, Record, SMS, WhatsApp, Insights, etc.)
- ✅ Permission level management
- ✅ Availability profile assignment
- ✅ Salesforce user linking
- ✅ Group membership display (read-only)
- ✅ Enable/disable toggle

#### Missing Features
| Feature | avs-sfdx Reference | Priority |
|---------|-------------------|----------|
| Batch user disable | `UserListController.disableRemoteItem()` | High |
| Device mapping | `UserController` + `DeviceMapping__c` | High |
| Webphone enable/disable | `UserController.webPhoneDeviceMap` | Medium |
| Permission set sync | `UserController.refreshPermission()` | Medium |
| PIN validation | `UserController.isValidPin()` | Low |
| Recording access management | `RecordingAccess__c` | Medium |
| User presets management | `UserController.presetsMap` | Low |

#### Data Integrity Gaps
1. **License validation**: Need to check against `License_v1__c` limits before enabling
2. **Extension uniqueness**: Must validate against existing users AND groups
3. **LENC validation**: License encryption checksum not implemented

### 2.2 Group Management

#### Implemented Features
- ✅ List groups with search
- ✅ Create/edit groups
- ✅ Delete groups with confirmation
- ✅ Display PBX/Manager/Record purposes

#### Missing Features
| Feature | avs-sfdx Reference | Priority |
|---------|-------------------|----------|
| Member management | `GroupMemberController` | Critical |
| Purpose validation | `GroupController.checkGroupPurposeLicense()` | High |
| Purpose removal prevention | `GroupController.checkGroupPurposeRules()` | High |
| Extension range validation | Must be 2000-7999 | Medium |
| Ring time configuration | `RingTime__c` field | Medium |

#### Data Integrity Gaps
1. **Purpose cascading**: When adding group purpose, all members must have corresponding license
2. **Extension uniqueness**: Validate 2000-7999 range

### 2.3 Phone Numbers

#### Implemented Features
- ✅ List phone numbers with filtering
- ✅ Sync from Sapien API
- ✅ Export to CSV
- ✅ Display capabilities (SMS, MMS, Voice)
- ✅ Local presence indicator
- ✅ User assignment display

#### Missing Features
| Feature | avs-sfdx Reference | Priority |
|---------|-------------------|----------|
| Call flow assignment | `PhoneNumber__c.CallFlow__c` lookup | High |
| Edit phone number details | `PhoneNumberController` | Medium |
| DDI vs Local distinction | `DDI_Number__c` field | Low |

### 2.4 Devices

#### Implemented Features
- ✅ List devices with filtering (type, status)
- ✅ Sync devices from API
- ✅ Registration sync
- ✅ Enable/disable toggle
- ✅ Delete with confirmation

#### Missing Features
| Feature | avs-sfdx Reference | Priority |
|---------|-------------------|----------|
| User assignment | `DeviceMapping__c` | High |
| Web phone provisioning | `DeviceController` | Medium |
| Bulk delete | `DeviceListController.deleteRemoteItem()` | Low |

### 2.5 Call Logs

#### Implemented Features
- ✅ List call logs with date range
- ✅ Direction filtering (Inbound/Outbound)
- ✅ Recording playback
- ✅ User filtering
- ✅ Duration formatting

#### Missing Features
| Feature | avs-sfdx Reference | Priority |
|---------|-------------------|----------|
| Recording download | Recording API | Medium |
| Detailed call metadata | Extended fields | Low |
| Call type filtering | Beyond direction | Low |

### 2.6 Sounds

#### Implemented Features
- ✅ List sounds
- ✅ Play audio (with TTS simulation in demo)
- ✅ Create TTS sounds
- ✅ Delete sounds

#### Missing Features
| Feature | avs-sfdx Reference | Priority |
|---------|-------------------|----------|
| Upload audio files | `SoundAttachmentController` | High |
| Edit sound metadata | `SoundController` | Medium |
| Bulk operations | N/A | Low |

### 2.7 Skills

#### Implemented Features
- ✅ List skills by category
- ✅ Create/edit skills
- ✅ Delete with confirmation
- ✅ Category management

#### Missing Features
| Feature | avs-sfdx Reference | Priority |
|---------|-------------------|----------|
| Assign skills to users | `UserSkill__c` junction object | High |
| Skill levels (1-10) | `SkillLevel__c` field | Medium |
| Skill-based routing preview | Call queue integration | Low |

---

## 3. Policy Editor Gap Analysis

### 3.1 Current Svelte Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Canvas rendering | ✅ Complete | Using SvelteFlow |
| Burger node structure | ✅ Complete | Header/body/footer |
| Node types (Action, Switchboard, etc.) | ✅ Complete | Color schemes matching React |
| Child app rendering | ✅ Complete | With output handles |
| Double-click to configure | ✅ Complete | Opens sidebar |
| Drag-and-drop apps | ✅ Complete | From Apps tab |
| Node connections/edges | ✅ Complete | With proper styling |
| Start button | ✅ Complete | Entry point creation |

### 3.2 Child App Configuration Forms

| App Type | Svelte Status | React Reference |
|----------|---------------|-----------------|
| Speak | ✅ Complete | `Speak/Speak.js` |
| Call Queue | ⚠️ Partial | `CallQueue/CallQueue.js` (5 tabs) |
| Rule | ⚠️ Partial | `Rule/Rule.js` (5 rule types) |
| Connect Call | ⚠️ Partial | `ConnectCall/ConnectCall.js` (4 tabs) |
| Record Call | ⚠️ Partial | `RecordCall/RecordCall.js` |
| Notify | ⚠️ Partial | `Notify/Notify.js` (email/SMS/Chatter) |
| Query Object | ⚠️ Partial | `QueryObject/QueryObject.js` (SOQL builder) |
| Hunt Group | ❌ Missing | `HuntGroup/HuntGroup.js` (4 tabs) |
| Create Record | ❌ Missing | `CreateRecord/CreateRecord.js` |
| Manage Properties | ❌ Missing | `ManageProperties/ManageProperties.js` |
| Get Info | ❌ Missing | `AIGetInfo/` |
| Voicemail | ❌ Missing | `VoiceMail/VoiceMail.js` |
| Request Skill | ❌ Missing | `RequestSkill/` |
| Send Message | ❌ Missing | `SendMessage/` |
| Debug | ❌ Missing | `Debug/Debug.js` |
| AI Agent | ❌ Missing | `NatterboxAI/AIAgent/` |
| AI Instruction | ❌ Missing | `NatterboxAI/AIInstruction/` |
| AI Knowledge | ❌ Missing | `NatterboxAI/AIKnowledge/` |
| Omni Channel Route | ❌ Missing | `OmniChannelFlow/Route/` |

### 3.3 Node Options (Container Level)

| Feature | Svelte Status | React Reference |
|---------|---------------|-----------------|
| Configuration tab | ✅ Complete | Name editing |
| Link tab | ⚠️ Partial | Transfer to existing |
| Apps tab | ✅ Complete | Drag/drop palette |
| Create new containers | ⚠️ Partial | 5 types needed |

### 3.4 Data Sources Required

The policy editor requires these Salesforce data fetches:

```typescript
// Required API calls per React implementation
- getPresetsHoldMusic()     // For Call Queue hold music
- getSFUsers()              // For user selection dropdowns
- getChatterGroups()        // For Notify Chatter tab
- getSkills()               // For skill-based routing
- getRecordTypeList()       // For Query Object, Create Record
- fetchObjectFields()       // Dynamic field loading
- getOmniChannelFlows()     // For Omni Channel configuration
- getOmniChannelQueues()    // For queue selection
- getArchivingPolicies()    // For Record Call
- getSounds()               // For announcement selection
- getPhoneNumbers()         // For Connect Call destination
- getUsers()                // For ring target selection
- getGroups()               // For group-based routing
```

---

## 4. API Coverage

### 4.1 Salesforce REST API (via `$lib/server/salesforce`)

| Operation | Implemented | Notes |
|-----------|-------------|-------|
| `querySalesforce()` | ✅ | SOQL queries |
| `updateSalesforce()` | ✅ | Single record updates |
| `createSalesforce()` | ❌ | Needed for new records |
| `deleteSalesforce()` | ❌ | Needed for deletions |
| `bulkUpdateSalesforce()` | ❌ | Needed for batch operations |

### 4.2 Sapien API (via `$lib/server/sapien`)

| Operation | Implemented | Notes |
|-----------|-------------|-------|
| `sapienRequest()` | ✅ | Generic request handler |
| User sync | ⚠️ | PATCH only, missing POST/DELETE |
| Device sync | ⚠️ | GET only |
| Call status | ✅ | Real-time via `/v1/calls` |
| Policy save | ❌ | Missing `savePolicyToSapien()` |
| Policy deploy | ❌ | Missing deployment workflow |

---

## 5. Priority Matrix

### 5.1 Critical (Must Have)

1. **Group member management** - Core functionality
2. **Policy editor child configs** - Call Queue, Connect Call, Hunt Group
3. **Create/delete Salesforce records** - Basic CRUD
4. **License validation** - Prevent over-allocation

### 5.2 High Priority

1. **Device user assignment** - UserDevice mapping
2. **Phone number call flow assignment** - Routing configuration
3. **Skill user assignment** - Skills-based routing
4. **Policy save/deploy** - Complete workflow
5. **Sound file upload** - Audio management

### 5.3 Medium Priority

1. **Batch user operations** - Disable multiple users
2. **Permission set sync** - Salesforce permissions
3. **Recording downloads** - Call log feature
4. **Webphone configuration** - Device management
5. **Extension validation** - Data integrity

### 5.4 Low Priority

1. **PIN validation** - Security feature
2. **User presets** - Advanced configuration
3. **Wallboards** - Dashboard feature
4. **Messaging inbox** - Digital channels

---

## 6. Implementation Recommendations

### Phase 1: Critical Gaps (2-3 weeks)

1. **Complete Group Member Management**
   - Create `GroupMemberController` equivalent in Svelte
   - Add member add/remove UI
   - Implement purpose validation

2. **Policy Editor Child Configs**
   - Prioritize: Call Queue, Connect Call, Hunt Group
   - Port defaults from React `defaults.js` files
   - Implement dynamic field loading

3. **Salesforce CRUD Operations**
   - Add `createSalesforce()` and `deleteSalesforce()` helpers
   - Implement bulk operations

### Phase 2: High Priority Features (3-4 weeks)

1. **Device/User/Skill Assignments**
   - Junction object management
   - Drag-drop interfaces

2. **Policy Workflow**
   - Save to Salesforce
   - Deploy to Sapien
   - Version management

3. **Sound Management**
   - File upload with attachment handling
   - TTS generation

### Phase 3: Polish & Extensions (Ongoing)

1. **Validation & Error Handling**
   - License limits
   - Extension uniqueness
   - API error recovery

2. **UX Improvements**
   - Bulk operations
   - Keyboard shortcuts
   - Undo/redo

3. **Feature Extensions**
   - Wallboards
   - Messaging
   - Analytics

---

## 7. Technical Debt

### 7.1 Code Quality Issues

1. **Demo mode fallbacks** - Need real API integration
2. **Error handling** - Inconsistent across modules
3. **TypeScript types** - Some `any` types need proper definitions
4. **Loading states** - Not all async operations show loading

### 7.2 Performance Considerations

1. **Large dataset handling** - Need pagination for 20k+ users
2. **Policy editor** - Complex policies may need virtualization
3. **Real-time updates** - WebSocket consideration for call status

---

## Appendix A: Salesforce Object Reference

### Core Objects

| Object | API Name | Key Fields |
|--------|----------|------------|
| User | `nbavs__User__c` | Id__c, Username__c, SipExtension__c, Enabled__c |
| Group | `nbavs__Group__c` | Id__c, Extension__c, PBX__c, Manager__c, Record__c |
| GroupMember | `nbavs__GroupMember__c` | User__c, Group__c |
| Device | `nbavs__Device__c` | Id__c, Extension__c, Type__c, Registered__c |
| DeviceMapping | `nbavs__DeviceMapping__c` | User__c, Device__c |
| PhoneNumber | `nbavs__PhoneNumber__c` | Number__c, User__c, CallFlow__c |
| Sound | `nbavs__Sound__c` | Id__c, Name, Type__c |
| Skill | `nbavs__Skill__c` | Id__c, Name, Category__c |
| CallLog | `nbavs__CallLog__c` | Direction__c, FromNumber__c, ToNumber__c |
| CallFlow | `nbavs__CallFlow__c` | Name, Type__c, Data__c |
| License | `nbavs__License_v1__c` | PBX__c, CTI__c, Manager__c (org-wide) |

---

## Appendix B: React Component Mapping

### Child App Types to Components

```javascript
// From React natterbox-routing-policies
const APP_COMPONENT_MAP = {
  speak: 'Action/Speak/Speak.js',
  callQueue: 'Action/CallQueue/CallQueue.js',
  rule: 'Action/Rule/Rule.js',
  connectCall: 'Action/ConnectCall/ConnectCall.js',
  recordCall: 'Action/RecordCall/RecordCall.js',
  notify: 'Action/Notify/Notify.js',
  queryObject: 'Action/QueryObject/QueryObject.js',
  huntGroup: 'Action/HuntGroup/HuntGroup.js',
  createRecord: 'Action/CreateRecord/CreateRecord.js',
  manageProperties: 'Action/ManageProperties/ManageProperties.js',
  getInfo: 'SwitchBoard/GetInfo/GetInfo.js',
  voiceMail: 'VoiceMail/VoiceMail.js',
  requestSkill: 'Action/RequestSkill/RequestSkill.js',
  sendMessage: 'Action/SendMessage/SendMessage.js',
  debug: 'Action/Debug/Debug.js',
  retry: 'Retry/Retry.js',
  aiAgent: 'NatterboxAI/AIAgent/AIAgent.js',
  aiInstruction: 'NatterboxAI/AIInstruction/AIInstruction.js',
  aiKnowledge: 'NatterboxAI/AIKnowledge/AIKnowledge.js',
  omniChannelRoute: 'OmniChannelFlow/Route/Route.js',
};
```

---

*Report generated: January 2026*
*Version: 1.0*

