# Natterbox AVS Portal - Implementation Roadmap

## Overview

This roadmap provides a structured approach to achieving full feature parity between the Svelte portal and the reference implementations (avs-sfdx + React policy builder).

---

## Sprint Structure

Each sprint is 2 weeks. Estimates assume 1 full-time developer.

---

## Phase 1: Critical Foundation (Sprints 1-3)

### Sprint 1: Salesforce CRUD Infrastructure

**Goal**: Complete the Salesforce API layer

| Task | Effort | Priority |
|------|--------|----------|
| Implement `createSalesforce()` helper | 2 days | Critical |
| Implement `deleteSalesforce()` helper | 1 day | Critical |
| Implement `bulkUpdateSalesforce()` helper | 2 days | High |
| Add namespace handling for all SOQL queries | 1 day | Critical |
| Create reusable error handling | 1 day | High |
| Write API integration tests | 3 days | High |

**Deliverables**:
- `$lib/server/salesforce.ts` - Complete CRUD operations
- Error handling patterns documented
- Integration test suite

---

### Sprint 2: Group Member Management

**Goal**: Full group functionality with member CRUD

| Task | Effort | Priority |
|------|--------|----------|
| Create `/groups/[id]/members` route | 1 day | Critical |
| Implement member list component | 2 days | Critical |
| Add member search (from users list) | 1 day | Critical |
| Implement add/remove member actions | 2 days | Critical |
| Add group purpose validation | 2 days | High |
| Extension range validation (2000-7999) | 1 day | High |
| Create group edit form | 1 day | High |

**Deliverables**:
- Group member management UI
- Purpose validation matching avs-sfdx logic
- Extension uniqueness checks

**Reference Files**:
- `avs-sfdx/GroupController.cls` - Purpose validation
- `avs-sfdx/GroupMemberController.cls` - Member operations

---

### Sprint 3: License Validation Framework

**Goal**: Prevent license over-allocation

| Task | Effort | Priority |
|------|--------|----------|
| Create license count service | 2 days | Critical |
| Query `License_v1__c` org defaults | 1 day | Critical |
| Count active licenses per type | 1 day | Critical |
| Add validation to user license toggles | 2 days | Critical |
| Add validation to group purpose changes | 1 day | High |
| Display license usage on dashboard | 2 days | Medium |
| Create license audit report | 1 day | Low |

**Deliverables**:
- License service module
- Validation on all license-affecting operations
- Dashboard widget showing license utilization

**Reference Files**:
- `avs-sfdx/LicenseManager.cls` - License counting logic
- `avs-sfdx/UserLicenseController.cls` - License assignment

---

## Phase 2: Policy Editor Completion (Sprints 4-6)

### Sprint 4: Call Queue Configuration

**Goal**: Complete the most complex child app configuration

| Task | Effort | Priority |
|------|--------|----------|
| Port `CallQueue.js` structure | 1 day | Critical |
| Implement Groups tab (ring targets) | 2 days | Critical |
| Implement Properties tab (queue algorithm, hold music) | 2 days | Critical |
| Implement Announcements tab | 2 days | High |
| Implement Screen tab (acceptance keys) | 1 day | High |
| Implement Callback tab | 2 days | Medium |
| Fetch hold music presets from Salesforce | 1 day | High |
| Fetch skills for skill-based routing | 1 day | High |

**Deliverables**:
- Full Call Queue configuration UI
- All 5 tabs functional
- Dynamic data loading from Salesforce

**Reference Files**:
- `natterbox-routing-policies/src/components/NodeOptions/Action/CallQueue/`
- `natterbox-routing-policies/src/common/defaults/callQueue.defaults.js`

---

### Sprint 5: Connect Call & Hunt Group

**Goal**: Complete call connection configurations

| Task | Effort | Priority |
|------|--------|----------|
| Port `ConnectCall.js` structure | 1 day | Critical |
| Implement Connect tab (destination types) | 2 days | Critical |
| Implement Advanced tab (transfer, CLI) | 2 days | High |
| Implement Screen tab | 1 day | High |
| Implement Camp tab | 1 day | Medium |
| Port `HuntGroup.js` structure | 1 day | Critical |
| Implement Hunt Group connect options | 2 days | Critical |

**Deliverables**:
- Connect Call with 4 tabs
- Hunt Group with 4 tabs
- Destination type selection (User, Group, Number)

**Reference Files**:
- `natterbox-routing-policies/src/components/NodeOptions/Action/ConnectCall/`
- `natterbox-routing-policies/src/components/NodeOptions/Action/HuntGroup/`
- `natterbox-routing-policies/src/common/defaults/lists.default.js`

---

### Sprint 6: Remaining Child Apps (Batch 1)

**Goal**: Complete high-priority remaining apps

| Task | Effort | Priority |
|------|--------|----------|
| Create Record configuration | 2 days | High |
| Update Record configuration | 1 day | High |
| Query Object configuration | 2 days | High |
| Manage Properties configuration | 2 days | Medium |
| Voicemail configuration | 1 day | Medium |
| Request Skill configuration | 2 days | Medium |

**Deliverables**:
- 6 additional child app configurations
- Dynamic Salesforce object/field loading

**Reference Files**:
- `natterbox-routing-policies/src/components/NodeOptions/Action/CreateRecord/`
- `natterbox-routing-policies/src/components/NodeOptions/Action/QueryObject/`
- `natterbox-routing-policies/src/services/createRecord.service.js`
- `natterbox-routing-policies/src/services/queryObject.service.js`

---

## Phase 3: Data Integrations (Sprints 7-8)

### Sprint 7: Device & Skill Assignments

**Goal**: Complete junction object management

| Task | Effort | Priority |
|------|--------|----------|
| Device user assignment UI | 2 days | High |
| Device mapping CRUD operations | 1 day | High |
| Skill user assignment UI | 2 days | High |
| Skill level (1-10) management | 1 day | Medium |
| Bulk assignment operations | 2 days | Medium |
| Phone number call flow assignment | 2 days | High |

**Deliverables**:
- Device mapping management
- User skill assignment
- Phone number routing configuration

**Reference Files**:
- `avs-sfdx/DeviceController.cls`
- `avs-sfdx/SkillController.cls`
- `avs-sfdx/PhoneNumberController.cls`

---

### Sprint 8: Policy Save & Deploy

**Goal**: Complete policy lifecycle

| Task | Effort | Priority |
|------|--------|----------|
| Implement `savePolicyToSalesforce()` | 2 days | Critical |
| Implement `deployPolicyToSapien()` | 2 days | Critical |
| Policy validation before save | 2 days | High |
| Version management | 2 days | Medium |
| Undo/redo implementation | 2 days | Medium |

**Deliverables**:
- Save policy to `CallFlow__c`
- Deploy to Sapien via API
- Policy validation rules

**Reference Files**:
- `avs-sfdx/CallFlowRemoting.cls` - `saveCallFlow`, `encryptPolicy`
- `natterbox-routing-policies/src/services/policy.service.js`

---

## Phase 4: AI & Digital Features (Sprints 9-10)

### Sprint 9: AI Node Configurations

**Goal**: Support Natterbox AI features

| Task | Effort | Priority |
|------|--------|----------|
| AI Agent configuration | 2 days | Medium |
| AI Instruction configuration | 2 days | Medium |
| AI Knowledge configuration | 2 days | Medium |
| AI Routing configuration | 2 days | Medium |
| Human escalation settings | 1 day | Medium |

**Deliverables**:
- Complete AI node configurations
- Integration with AI services

**Reference Files**:
- `natterbox-routing-policies/src/components/NodeOptions/NatterboxAI/`

---

### Sprint 10: Omni-Channel & Digital

**Goal**: Support digital messaging workflows

| Task | Effort | Priority |
|------|--------|----------|
| Omni-Channel Flow configuration | 2 days | Medium |
| Digital Connect configuration | 2 days | Medium |
| Send Message configuration | 2 days | Medium |
| Reply configuration | 1 day | Medium |
| Shared Inbox Assignment | 2 days | Low |

**Deliverables**:
- Digital channel support
- Omni-Channel integration

**Reference Files**:
- `natterbox-routing-policies/src/components/NodeOptions/OmniChannelFlow/`
- `natterbox-routing-policies/src/components/NodeOptions/Action/DigitalConnect/`
- `natterbox-routing-policies/src/components/NodeOptions/Action/SendMessage/`

---

## Phase 5: Polish & Extensions (Sprints 11-12)

### Sprint 11: UX Improvements

| Task | Effort | Priority |
|------|--------|----------|
| Bulk user operations | 2 days | Medium |
| Keyboard shortcuts | 2 days | Low |
| Error message improvements | 1 day | High |
| Loading state refinements | 1 day | Medium |
| Accessibility audit | 2 days | Medium |
| Mobile responsiveness | 2 days | Low |

---

### Sprint 12: New Features

| Task | Effort | Priority |
|------|--------|----------|
| Wallboards dashboard | 3 days | Low |
| Messaging inbox (placeholder) | 2 days | Low |
| General settings expansion | 2 days | Medium |
| Audit logging | 2 days | Medium |
| User activity tracking | 1 day | Low |

---

## Resource Estimates

### Total Effort

| Phase | Sprints | Weeks | Story Points |
|-------|---------|-------|--------------|
| Phase 1: Foundation | 3 | 6 | 45 |
| Phase 2: Policy Editor | 3 | 6 | 50 |
| Phase 3: Integrations | 2 | 4 | 30 |
| Phase 4: AI/Digital | 2 | 4 | 25 |
| Phase 5: Polish | 2 | 4 | 20 |
| **Total** | **12** | **24 weeks** | **170 points** |

### Recommended Team

- 1 Senior Full-Stack Developer (Svelte/TypeScript)
- 1 Part-time Salesforce Developer (Apex review)
- 1 QA Engineer (part-time after Phase 2)

---

## Risk Mitigation

### High-Risk Items

1. **License validation complexity**
   - *Mitigation*: Port exact logic from `LicenseManager.cls`
   - *Fallback*: Server-side validation only initially

2. **Policy editor performance**
   - *Mitigation*: SvelteFlow virtualization for large policies
   - *Fallback*: Limit nodes per policy

3. **Sapien API changes**
   - *Mitigation*: Abstract API layer for easy updates
   - *Fallback*: Feature flags for new endpoints

### Dependencies

- Salesforce org credentials for testing
- Sapien API documentation/access
- Sample policy data for testing
- Access to production-like data volumes

---

## Success Metrics

### Phase 1 Complete
- [ ] All Salesforce CRUD operations working
- [ ] Group members can be added/removed
- [ ] License limits enforced

### Phase 2 Complete
- [ ] Policy editor matches React feature set
- [ ] All major child apps configurable
- [ ] Policies can be saved

### Phase 3 Complete
- [ ] Device assignments working
- [ ] Skill assignments working
- [ ] Policies deploy to Sapien

### Phase 4 Complete
- [ ] AI features fully supported
- [ ] Digital messaging supported

### Phase 5 Complete
- [ ] Production-ready UX
- [ ] All edge cases handled
- [ ] Documentation complete

---

## Appendix: Quick Reference

### Key File Locations

**Svelte Portal**:
```
standalone-avs/packages/web/src/
├── routes/              # Page routes
├── lib/
│   ├── components/ui/   # Shared UI components
│   ├── server/          # Server-side utilities
│   └── policy-editor/   # Policy editor utilities
```

**avs-sfdx**:
```
avs-sfdx/force-app/main/default/classes/
├── *Controller.cls      # Apex controllers
├── *Service.cls         # Business logic
├── API*.cls             # External API calls
```

**React Policy Builder**:
```
natterbox-routing-policies/src/
├── components/NodeOptions/  # All child app configs
├── common/defaults/         # Default values/constants
├── services/                # Business logic
```

---

*Roadmap Version: 1.0*
*Last Updated: January 2026*

