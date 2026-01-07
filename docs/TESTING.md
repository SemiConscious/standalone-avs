# Testing Documentation

> **Last Updated:** January 7, 2026  
> **Living Document:** This file is updated whenever tests are modified.

## Table of Contents

1. [Summary](#summary)
2. [Coverage Report](#coverage-report)
3. [Test Gap Analysis](#test-gap-analysis)
   - [Tested in Original Apps but NOT in SvelteKit](#tested-in-original-apps-but-not-in-sveltekit)
   - [Tested in SvelteKit but NOT in Original Apps](#tested-in-sveltekit-but-not-in-original-apps)
4. [Test Case Catalog](#test-case-catalog)
   - [UI Components](#ui-components)
   - [Layout Components](#layout-components)
   - [Stores](#stores)
   - [Utilities](#utilities)
   - [Server Services](#server-services)
   - [Policy Editor](#policy-editor)
   - [Routes/Pages](#routespages)
5. [Running Tests](#running-tests)

---

## Summary

The SvelteKit application has comprehensive test coverage, with **963 tests** passing across **47 test files**.

| Metric | Value |
|--------|-------|
| Total Tests | 963 |
| Test Files | 47 |
| Statement Coverage | 94.09% |
| Branch Coverage | 78.56% |
| Function Coverage | 94.31% |
| Line Coverage | 94.09% |

### Testing Stack

- **Test Runner:** Vitest 4.x
- **Component Testing:** @testing-library/svelte
- **Assertions:** @testing-library/jest-dom
- **Mocking:** Vitest built-in mocks
- **E2E Testing:** Playwright (separate package)

---

## Coverage Report

### By Category

| Category | Coverage | Files Tested |
|----------|----------|--------------|
| `lib/server` | 98.53% | salesforce.ts, sapien.ts, events.ts, omnichannel.ts, appsync.ts |
| `lib/stores` | 100% | auth.ts, toast.ts, theme.ts |
| `lib/utils` | 100% | index.ts |
| `lib/components/ui` | 98.2% | Button, Badge, Card, Input, Select, Modal, Avatar, Toast, etc. |
| `lib/components/layout` | 100% | Header.svelte, Sidebar.svelte |
| `lib/policy-editor` | 92.32% | buildPayload, dataTransform, nodeManagerService, etc. |

### Files at 100% Coverage

- `lib/server/salesforce.ts`
- `lib/server/events.ts`
- `lib/server/sapien.ts`
- `lib/stores/auth.ts`
- `lib/stores/toast.ts`
- `lib/utils/index.ts`
- `lib/policy-editor/nodeDisplay.ts`
- `lib/policy-editor/nodeClassName.ts`
- `lib/policy-editor/index.ts`

---

## Test Gap Analysis

### Tested in Original Apps but NOT in SvelteKit

The following features from `natterbox-routing-policies` and `avs-sfdx` have tests in the original apps but **have not been ported** to the SvelteKit application:

#### React Components (348 test files in natterbox-routing-policies)

| Category | Components | Notes |
|----------|------------|-------|
| **Test Assistant** | TestAssistant, PolicyTest, SupportChatTest, Help | AI-powered testing features not yet implemented |
| **Template Builder** | TemplateBuilderFields, Header, Card, Select | Feature not yet ported |
| **Node Options** | ~~100+ option components~~ **NOW COVERED** - 12 Svelte option components | ✅ 159 tests covering all node option types |
| **Policy Containers** | ~~DefaultContainer, OutputContainer, GroupContainer~~ **NOW COVERED** - FlowNode.svelte | ✅ 60 tests for FlowNode component |
| **UI Components** | Tabs, CodeEditor, TimePicker, MacrosInput, etc. | React-specific UI library |
| **AI Features** | AIKnowledge, AISetPersona, AIVoicemail, AIInstruction | Natterbox AI integration |
| **Redux State** | Thunks, Reducers, Actions | State management (replaced by Svelte stores) |
| **React Hooks** | useNodeById, useNodeConnections, useToggle, etc. | React-specific hooks (replaced by Svelte runes) |

#### Salesforce LWC Components (avs-sfdx)

| Component | Test File | Notes |
|-----------|-----------|-------|
| userTemplateStatusListView | ✓ | LWC component for template status |
| customLookup | ✓ | Custom lookup component |
| modifyUserTemplate | ✓ | User template modification |
| lwcBulkUserDeactivation | ✓ | Bulk user operations |

#### AngularJS Tests (avs-sfdx static resources)

| Test | Description |
|------|-------------|
| flowchart_directive.spec.js | AngularJS flowchart directive |
| flowchart_viewmodel.spec.js | Flowchart view model |
| svg_class.spec.js | SVG class helpers |

### Tested in SvelteKit but NOT in Original Apps

The following areas are **new to the SvelteKit app** and have tests that don't exist in the original apps:

| Category | Tests | Description |
|----------|-------|-------------|
| **Server-side Services** | 100+ | New SvelteKit server services for Salesforce, Sapien, Events, OmniChannel, AppSync |
| **Svelte Stores** | 30+ | Auth, theme, toast stores with derived stores |
| **SvelteKit Components** | 400+ | Svelte 5 component tests using @testing-library/svelte |
| **Node Option Components** | 159 | 12 Svelte node option components (GenericOptions, CallQueueOptions, RuleOptions, SpeakOptions, HuntGroupOptions, InputOptions, AIAgentOptions, EventOptions, KnowledgeBaseOptions, DigitalInboundOptions, OmniChannelFlowOptions, SendTemplateOptions) |
| **FlowNode Component** | 60 | Policy editor flow node (equivalent to React PolicyContainer) |
| **Form Actions** | Server-side | CRUD operations via SvelteKit form actions |
| **API Routes** | Server-side | SvelteKit API route handlers |
| **Theme System** | 17 tests | Multi-theme support (light, dark, Salesforce, system) |
| **OmniChannel API** | 23 tests | Direct Sapien OmniChannel integration |
| **Events API** | 16 tests | Sapien External Events API |
| **AppSync GraphQL** | 22 tests | AWS AppSync AI features |

---

## Test Case Catalog

### UI Components

#### Button Component (`lib/components/ui/__tests__/Button.test.ts`)

| Test | Description |
|------|-------------|
| should render button element | Verifies button renders as `<button>` |
| should render text content | Verifies text children render |
| should render with primary variant by default | Default variant is 'primary' |
| should render with medium size by default | Default size is 'md' |
| should have type="button" by default | Default type prevents form submission |
| should render primary variant | Primary variant applies correct classes |
| should render secondary variant | Secondary variant styling |
| should render ghost variant | Ghost variant styling |
| should render danger variant | Danger variant styling |
| should render small size | sm size class applied |
| should render medium size | md size class applied |
| should render large size | lg size class applied |
| should render button type | type="button" |
| should render submit type | type="submit" |
| should render reset type | type="reset" |
| should be enabled by default | Not disabled |
| should be disabled when disabled prop is true | disabled attribute set |
| should call onclick when clicked | Click handler invoked |
| should be disabled when disabled prop is set | Click handler not invoked when disabled |
| should apply custom class | Custom className added |
| should combine custom class with default classes | Classes merged properly |

#### Badge Component (`lib/components/ui/__tests__/Badge.test.ts`)

| Test | Description |
|------|-------------|
| should render badge element | Renders as `<span>` |
| should render text content | Text children display |
| should render with neutral variant by default | Default variant |
| should render with medium size by default | Default size |
| should render success variant | Success styling |
| should render warning variant | Warning styling |
| should render error variant | Error styling |
| should render neutral variant | Neutral styling |
| should render accent variant | Accent styling |
| should render small size | sm size |
| should render medium size | md size |
| should apply custom class | Custom class support |
| should combine custom class with default classes | Class merging |
| should render as span element | Semantic element |

#### Card Component (`lib/components/ui/__tests__/Card.test.ts`)

| Test | Description |
|------|-------------|
| should render card element | Renders as `<div>` |
| should render text content | Children render |
| should render with medium padding by default | Default padding |
| should render as div element | Semantic element |
| should render with no padding | padding="none" |
| should render with small padding | padding="sm" |
| should render with medium padding | padding="md" |
| should render with large padding | padding="lg" |
| should apply custom class | Custom class support |
| should combine custom class with default classes | Class merging |

#### Input Component (`lib/components/ui/__tests__/Input.test.ts`)

| Test | Description |
|------|-------------|
| should render with default props | Basic render |
| should render with text type by default | Default type |
| should have input class | Base class applied |
| should render text type | type="text" |
| should render email type | type="email" |
| should render password type | type="password" |
| should render search type | type="search" |
| should render without placeholder by default | No default placeholder |
| should render with placeholder | Placeholder support |
| should render with empty value by default | Default empty value |
| should render with initial value | Initial value binding |
| should update value on input | Two-way binding |
| should render without name by default | No default name |
| should render with name | name attribute |
| should render without id by default | No default id |
| should render with id | id attribute |
| should not be required by default | Default not required |
| should be required when required prop is true | required attribute |
| should not be disabled by default | Default enabled |
| should be disabled when disabled prop is true | disabled attribute |
| should have disabled attribute when disabled | Disabled state |
| should apply custom class | Custom class |
| should combine custom class with default classes | Class merging |

#### Select Component (`lib/components/ui/__tests__/Select.test.ts`)

| Test | Description |
|------|-------------|
| should render with options | Options render |
| should render all options | All options visible |
| should render option labels correctly | Label display |
| should render without label by default | No default label |
| should render with label when provided | Label support |
| should associate label with select via for attribute | Accessibility |
| should render without error by default | No default error |
| should render error message when error is provided | Error display |
| should apply error border class when error is provided | Error styling |
| should render without hint by default | No default hint |
| should render hint when provided | Hint text support |
| should not render hint when error is present | Error takes precedence |
| should render disabled option when specified | Disabled option support |
| should change value on selection | Value binding |
| should apply custom class | Custom class |
| should use provided id | Custom id |
| should generate id when not provided | Auto-generated id |

#### Avatar Component (`lib/components/ui/__tests__/Avatar.test.ts`)

| Test | Description |
|------|-------------|
| should render image when src is provided | Image avatar |
| should use name as alt text for image | Accessibility |
| should apply size classes to image | Size variations |
| should render initials when no src is provided | Initials fallback |
| should render single initial for single-word name | Single word handling |
| should render initials for multi-word name | Multi-word handling |
| should render with medium size by default | Default size |
| should render with xs size | Extra small |
| should render with sm size | Small |
| should render with md size | Medium |
| should render with lg size | Large |
| should render with xl size | Extra large |
| should apply custom class to image avatar | Custom class with image |
| should apply custom class to initials avatar | Custom class with initials |
| should have rounded-full class for circular shape | Circular shape |
| should have accent background for initials avatar | Background color |

#### Modal Component (`lib/components/ui/__tests__/Modal.test.ts`)

| Test | Description |
|------|-------------|
| should render modal when open | Open state |
| should not render modal when closed | Closed state |
| should render title when provided | Title display |
| should render children content | Content slot |
| should render footer when provided | Footer slot |
| should have proper backdrop | Backdrop element |
| should call onClose when backdrop is clicked | Backdrop click handler |
| should call onClose when close button is clicked | Close button |
| should have different sizes | sm, md, lg, xl sizes |
| should have proper accessibility attributes | ARIA attributes |
| should trap focus within modal | Focus management |
| should close on Escape key | Keyboard interaction |
| should have proper z-index stacking | Z-index management |
| should prevent body scroll when open | Scroll lock |
| should restore body scroll when closed | Scroll restore |
| should render with animation classes | Animation support |

#### Toast Component (`lib/components/ui/__tests__/Toast.test.ts`)

| Test | Description |
|------|-------------|
| should render toast message | Message display |
| should render with info type by default | Default type |
| should render with success type | Success variant |
| should render with warning type | Warning variant |
| should render with error type | Error variant |
| should render dismiss button | Dismiss button |
| should call onDismiss when dismiss clicked | Dismiss callback |
| should render with appropriate icon | Type-specific icons |
| should apply type-specific styling | Type styling |
| should render title when provided | Optional title |
| should support custom duration | Duration prop |
| should auto-dismiss after duration | Auto-dismiss |
| should not auto-dismiss when duration is 0 | Persistent toast |
| should have proper animation classes | Entry/exit animation |
| should be accessible | ARIA live region |
| should support custom action button | Action slot |

#### DataTable Component (`lib/components/ui/__tests__/DataTable.test.ts`)

| Test | Description |
|------|-------------|
| should render table with data | Basic render |
| should render column headers | Header row |
| should render data rows | Data rows |
| should handle empty data | Empty state |
| should support sortable columns | Sorting |
| should support column customization | Custom columns |
| should render loading state | Loading indicator |
| should render error state | Error display |
| should support row selection | Selectable rows |
| should support pagination | Pagination controls |
| should support search/filter | Search functionality |
| should handle column visibility toggle | Column hiding |
| should support row actions | Action column |
| should support custom cell rendering | Cell render function |
| should maintain state across re-renders | State persistence |
| should be accessible | Table accessibility |

#### Pagination Component (`lib/components/ui/__tests__/Pagination.test.ts`)

| Test | Description |
|------|-------------|
| should render pagination controls | Basic render |
| should show current page | Current page display |
| should show total pages | Total pages display |
| should show total items | Item count |
| should disable previous on first page | First page state |
| should disable next on last page | Last page state |
| should call onPageChange when page changes | Page change callback |
| should support page size selection | Items per page |
| should show page numbers | Page number buttons |
| should show ellipsis for many pages | Ellipsis for long lists |
| should highlight current page | Active page styling |
| should support keyboard navigation | Keyboard access |
| should have proper ARIA labels | Accessibility |
| should update on prop changes | Reactive updates |
| should handle edge cases | Edge case handling |
| should show item range | "Showing X-Y of Z" |
| should support compact mode | Compact variant |
| should calculate page range correctly | Range calculation |
| should handle single page | Single page state |

#### ThemeToggle Component (`lib/components/ui/__tests__/ThemeToggle.test.ts`)

| Test | Description |
|------|-------------|
| should render theme toggle | Basic render |
| should show current theme icon | Current theme indicator |
| should cycle through themes on click | Theme cycling |
| should call theme store on change | Store integration |
| should support all theme options | light, dark, salesforce, system |
| should show dropdown on click | Dropdown menu |
| should close dropdown when clicking outside | Click outside |
| should close dropdown on Escape | Keyboard close |
| should have accessible labels | Accessibility |
| should show checkmark on active theme | Active indicator |
| should render system preference indicator | System theme |
| should handle keyboard selection | Keyboard navigation |

#### ToastContainer Component (`lib/components/ui/__tests__/ToastContainer.test.ts`)

| Test | Description |
|------|-------------|
| should render toast container | Container element |
| should render multiple toasts | Multiple toasts |
| should remove dismissed toasts | Toast removal |
| should stack toasts vertically | Toast stacking |
| should position container correctly | Position options |
| should limit maximum toasts | Max toast limit |
| should handle rapid toast additions | Performance |
| should animate toast entry | Entry animation |
| should animate toast exit | Exit animation |
| should be accessible | ARIA live region |
| should render empty when no toasts | Empty state |
| should clear all toasts on clear | Clear all |
| should respect toast order | FIFO order |
| should handle toast updates | Toast update |

### Layout Components

#### Header Component (`lib/components/layout/__tests__/Header.test.ts`)

| Test | Description |
|------|-------------|
| should render header element | Basic render |
| should render logo | Logo display |
| should render navigation menu | Nav menu |
| should show user profile when authenticated | User profile |
| should show login button when not authenticated | Login state |
| should toggle mobile menu | Mobile menu toggle |
| should close mobile menu when clicking outside | Click outside |
| should render organization name | Org display |
| should render theme toggle | Theme control |
| should handle logout | Logout action |
| should show notification badge | Notifications |
| should show help link | Help access |
| should be accessible | Accessibility |
| should collapse on scroll | Scroll behavior |
| should show breadcrumbs | Breadcrumb navigation |
| should handle session expiry | Session management |
| should show loading state | Loading indicator |
| should render authenticated user info | User details |
| should render dropdown menu on profile click | Profile dropdown |
| should close dropdown on escape | Keyboard close |
| should close dropdown on click outside | Click outside |
| should navigate to profile on click | Profile link |
| should navigate to settings on click | Settings link |
| should handle sign out | Sign out action |
| should show user avatar | Avatar display |
| should show user name | Name display |
| should show user email | Email display |
| should handle missing user gracefully | Null user |

#### Sidebar Component (`lib/components/layout/__tests__/Sidebar.test.ts`)

| Test | Description |
|------|-------------|
| should render sidebar element | Basic render |
| should render navigation items | Nav items |
| should highlight active route | Active state |
| should collapse to icons only | Collapsed mode |
| should expand on hover when collapsed | Hover expand |
| should show section headers | Section grouping |
| should render sub-navigation | Nested nav |
| should handle route changes | Route updates |
| should call onClose when overlay clicked | Mobile close |
| should be accessible | Accessibility |
| should show badges for notifications | Badge support |
| should support keyboard navigation | Keyboard nav |
| should persist collapse state | State persistence |
| should render footer links | Footer section |

### Stores

#### Auth Store (`lib/stores/__tests__/auth.test.ts`)

| Test | Description |
|------|-------------|
| should initialize with null user | Initial state |
| should set user correctly | setUser |
| should set loading state | setLoading |
| should set error state | setError |
| should clear state on logout | logout |
| should reset to initial state | reset |
| should derive currentUser correctly | Derived store |
| should derive isAuthenticated correctly | Derived store |
| should derive isAuthLoading correctly | Derived store |
| should derive authError correctly | Derived store |
| should handle concurrent updates | Concurrency |
| should persist across page navigation | Persistence |

#### Theme Store (`lib/stores/__tests__/theme.test.ts`)

| Test | Description |
|------|-------------|
| should default to system when no theme is stored | Default state |
| should use stored theme when available | Persistence |
| should update the theme | set() |
| should store theme in localStorage | Persistence |
| should apply theme-dark class when setting dark theme | DOM manipulation |
| should apply theme-light class when setting light theme | DOM manipulation |
| should apply theme-salesforce class when setting salesforce theme | DOM manipulation |
| should remove old theme classes when changing theme | Class cleanup |
| should apply light theme when system prefers light | System preference |
| should apply dark theme when system prefers dark | System preference |
| should return true when theme is dark | isDark derived |
| should return false when theme is light | isDark derived |
| should return false when theme is salesforce | isDark derived |
| should return system preference when theme is system | isDark system |
| should notify subscribers of theme changes | Subscriptions |
| should reapply theme when system preference changes and theme is system | System change listener |
| should not reapply theme when system preference changes but theme is not system | Ignore non-system |

#### Toast Store (`lib/stores/__tests__/toast.test.ts`)

| Test | Description |
|------|-------------|
| should initialize with empty array | Initial state |
| should add toast with generated id | add() |
| should add toast with custom id | Custom id |
| should add toast with defaults | Default values |
| should remove toast by id | remove() |
| should clear all toasts | clear() |
| should add success toast | success() |
| should add error toast | error() |
| should add warning toast | warning() |
| should add info toast | info() |
| should auto-dismiss success toast | Auto-dismiss |
| should auto-dismiss info toast | Auto-dismiss |
| should not auto-dismiss error toast by default | Error persistence |
| should not auto-dismiss warning toast by default | Warning persistence |
| should respect custom duration | Duration override |
| should update existing toast | Toast update |
| should limit max toasts | Max limit |
| should maintain toast order | FIFO order |
| should handle rapid additions | Performance |
| should handle dismiss during animation | Animation state |
| should generate unique ids | ID uniqueness |

### Utilities

#### Utility Functions (`lib/utils/__tests__/utils.test.ts`)

| Test | Description |
|------|-------------|
| should format a Date object with default options | formatDate |
| should format a date string | formatDate string input |
| should respect custom options | formatDate options |
| should format a Date object with default options | formatDateTime |
| should format a date string | formatDateTime string |
| should respect custom options | formatDateTime options |
| should concatenate class names | cn |
| should filter out falsy values | cn falsy filtering |
| should return empty string for no classes | cn empty |
| should format 10-digit US numbers | formatPhoneNumber |
| should format 11-digit US numbers with country code | formatPhoneNumber +1 |
| should strip non-digit characters | formatPhoneNumber cleanup |
| should return original for unrecognized formats | formatPhoneNumber fallback |
| should truncate long strings | truncate |
| should not truncate short strings | truncate no-op |
| should use custom suffix | truncate suffix |
| should get initials from full name | getInitials |
| should handle single name | getInitials single |
| should limit to maxLength | getInitials limit |
| should handle multiple names | getInitials multi |
| should uppercase initials | getInitials case |
| should debounce function calls | debounce |
| should pass arguments to debounced function | debounce args |
| should format recent time as "just now" | formatRelativeTime |
| should format minutes ago | formatRelativeTime min |
| should format hours ago | formatRelativeTime hr |
| should format days ago | formatRelativeTime day |
| should handle singular forms | formatRelativeTime singular |

### Server Services

#### Salesforce Service (`lib/server/__tests__/salesforce.test.ts`)

| Test | Description |
|------|-------------|
| should execute SOQL query | querySalesforce |
| should handle query errors | Error handling |
| should update Salesforce record | updateSalesforce |
| should create Salesforce record | createSalesforce |
| should delete Salesforce record | deleteSalesforce |
| should validate credentials | hasValidCredentials |
| should handle API versioning | Version handling |
| should handle large result sets | Pagination |
| should encode special characters | SOQL encoding |
| should handle network errors | Network errors |
| should handle auth errors | 401 handling |
| should handle not found errors | 404 handling |
| should log requests for debugging | Request logging |
| should handle timeout | Timeout handling |
| should retry on transient errors | Retry logic |
| should handle concurrent requests | Concurrency |

#### Sapien Service (`lib/server/__tests__/sapien.test.ts`)

| Test | Description |
|------|-------------|
| should return host from env and org ID from JWT when cached | getSapienConfig |
| should return org ID from env when no JWT is cached | getSapienConfig fallback |
| should return true when host and org ID are configured | isSapienDirectConfigured |
| should decode a valid JWT payload | decodeJwtPayload |
| should throw error for invalid JWT format | decodeJwtPayload error |
| should handle base64url encoding | decodeJwtPayload encoding |
| should fetch JWT from Salesforce Apex REST endpoint | getSapienJwt |
| should cache JWT and return cached value on subsequent calls | JWT caching |
| should fetch new JWT for different scope | Scope handling |
| should throw error on auth failure | getSapienJwt error |
| should throw error on invalid JWT response | Invalid response |
| should throw error when response has no jwt field | Missing JWT |
| should use default expiration when JWT has no exp field | Default expiration |
| should return organization ID from cached JWT | getSapienOrganizationId |
| should return null when no JWT is cached | No cache |
| should return user ID from cached JWT | getSapienUserId |
| should return null when no JWT is cached | No user cache |
| should return username from cached JWT | getSapienUsername |
| should make authenticated GET request | sapienRequest GET |
| should make authenticated POST request with body | sapienRequest POST |
| should convert PATCH to POST with X-HTTP-Method-Override header | PATCH override |
| should throw error on request failure | Request error |
| should handle empty response body | Empty response |
| should update existing policy | savePolicyToSapien |
| should create new policy and return ID | createPolicyInSapien |
| should delete policy successfully | deletePolicyFromSapien |
| should return true when credentials are valid | canGetSapienJwt |
| should return false when accessToken is missing | Missing token |
| should return false when instanceUrl is missing | Missing URL |
| should fetch active calls from Sapien API | getActiveCalls |
| should return empty array when no active calls | No calls |
| should construct recording URL correctly | getRecordingUrl |
| should have expected scope constants | SAPIEN_SCOPES |

#### Events Service (`lib/server/__tests__/events.test.ts`)

| Test | Description |
|------|-------------|
| should create an event subscription | createEventSubscription |
| should throw error on failure | Create error |
| should fetch all event subscriptions | getEventSubscriptions |
| should throw error on failure | Fetch error |
| should filter subscriptions by policy ID | getEventSubscriptionsForPolicy |
| should update an event subscription | updateEventSubscription |
| should throw error on failure | Update error |
| should delete an event subscription | deleteEventSubscription |
| should throw error on failure | Delete error |
| should delete all subscriptions for a policy | deleteEventSubscriptionsForPolicy |
| should continue deleting when one delete fails | Partial failure |
| should create new subscriptions for event nodes | syncEventSubscriptionsFromPolicy create |
| should update existing subscriptions | syncEventSubscriptionsFromPolicy update |
| should delete orphaned subscriptions | syncEventSubscriptionsFromPolicy cleanup |
| should handle create failure gracefully and continue | Create failure |
| should handle delete orphan failure gracefully | Delete failure |

#### OmniChannel Service (`lib/server/__tests__/omnichannel.test.ts`)

| Test | Description |
|------|-------------|
| should fetch digital channel groups | getDigitalChannelGroups |
| should filter by type when provided | Type filter |
| should throw error on failure | Error handling |
| should fetch shared inboxes | getSharedInboxes |
| should include nextKey parameter when provided | Pagination |
| should fetch all pages of shared inboxes | getAllSharedInboxes |
| should fetch message templates | getMessageTemplates |
| should filter by channel type when provided | Channel filter |
| should throw error on failure | Templates error |
| should fetch a specific message template | getMessageTemplate |
| should throw error on failure | Template error |
| should build table row from channel | buildDigitalChannelTableRow |
| should handle missing optional fields | Missing fields |
| should build table rows from multiple channels | buildDigitalChannelTableRows |
| should mark channels as disabled if in used set | markUsedDigitalChannels |
| should fetch OmniChannel queues from Salesforce | getOmniChannelQueues |
| should return empty array on error | Queues error |
| should fetch OmniChannel flows from Salesforce | getOmniChannelFlows |
| should return empty array on error | Flows error |
| should fetch Salesforce queues (Group records) | getSalesforceQueues |
| should return empty array on error | SF queues error |
| should fetch call center routing entries | getCallCenterRoutingEntries |
| should return empty array on error | Routing error |

#### AppSync Service (`lib/server/__tests__/appsync.test.ts`)

| Test | Description |
|------|-------------|
| should execute a GraphQL query successfully | executeGraphQL |
| should include variables in the request | Variables |
| should throw error on HTTP failure | HTTP error |
| should throw error on GraphQL errors | GraphQL errors |
| should fetch and return AI agents | fetchAIAgents |
| should return empty array if no agents | Empty agents |
| should process agents for dropdown display | processAgentsForSelect |
| should truncate long names | Name truncation |
| should return default options when no versions provided | processAgentVersions default |
| should include provided versions | processAgentVersions versions |
| should normalize version names starting with V | Version normalization |
| should fetch and return knowledge stores | fetchKnowledgeStores |
| should process stores for select options | processKnowledgeStoresForSelect |
| should filter duplicate tags | Tag deduplication |
| should fetch knowledge base status | getKnowledgeBaseStatus |
| should return null if status not available | No status |
| should test a knowledge base query | testKnowledgeBase |
| should throw error if knowledge store ID not provided | Missing store ID |
| should throw error if query not provided | Missing query |
| should have AGENTS query | GRAPHQL_QUERIES |
| should have KNOWLEDGE_STORES query | GRAPHQL_QUERIES |
| should generate KNOWLEDGE_BASE_STATUS query with ID | Dynamic query |

### Policy Editor

#### Node Manager Service (`lib/policy-editor/__tests__/nodeManagerService.test.ts`)

| Test | Description |
|------|-------------|
| should handle removing nodes with outputs correctly | removeNodes outputs |
| should handle removing nodes with connectedFromItem correctly | removeNodes connectedFromItem |
| should handle removing multiple nodes correctly | removeNodes multiple |
| should handle removing SYSTEM node without callback | removeNodes SYSTEM |
| should handle removing SYSTEM node and call handleSystemNode function | SYSTEM callback |
| should handle empty selectedNodes array | Empty selection |
| should handle nodes without parentNode property | No parentNode |
| should handle nodes with empty outputs array | Empty outputs |
| should return newActiveNode as undefined when node is null | Null node |
| should set connectedTo to "finish" if no matching edge exists | No matching edge |
| should handle removing output nodes correctly | Output node removal |
| should handle removing a node with connectedFromNode | ConnectedFromNode |
| should handle node with GROUP_OUTPUT templateId | GROUP_OUTPUT handling |
| should handle node with data.connectedFromNode matching activeNode.id and outputs array | Complex scenario |
| should handle removing node when head of group is in removal list | Group head removal |
| should handle updating target connections when type is not output | Non-output target |
| should add outputs to the parent node and update its height | updateParentOnNewOutputCreation |
| should handle empty outputs array | Empty outputs |
| should not modify nodes without matching parentNode | No matching parent |
| ... (50+ additional tests) | Various scenarios |

#### Build Payload Service (`lib/policy-editor/__tests__/buildPayload.test.ts`)

| Test | Description |
|------|-------------|
| should build valid payload from policy data | buildPayload |
| should include Body__c with serialized nodes | Body__c |
| should include Policy__c with policy metadata | Policy__c |
| should include PhoneNumbers__c | PhoneNumbers__c |
| should set correct finish templateId for Call | Call finish |
| should set correct finish templateId for Digital | Digital finish |
| should set correct finish templateId for Data Analytics | DA finish |
| should handle empty policy | Empty policy |
| should handle policy with no edges | No edges |
| should handle policy with complex outputs | Complex outputs |
| ... (15+ additional tests) | Various scenarios |

#### Payload Service (`lib/policy-editor/__tests__/payloadService.test.ts`)

| Test | Description |
|------|-------------|
| should filter payload nodes correctly | filterPayloadNodes |
| should process payload items | processPayloadItems |
| should map nodes to payload format | mapNodesToPayloadFormat |
| should map edges to connections | mapEdgesToConnections |
| should omit output library fields | omitOutputLibraryFields |
| should omit connect and screen IDs | omitConnectAndScreenIds |
| should update output config if exists | updateOutputConfigIfExists |
| should update output variables if exists | updateOutputVariablesIfExists |
| should ensure inbound number items templateId | ensureInboundNumberItemsTemplateId |
| ... (additional tests) | Various transformations |

#### Policy Service (`lib/policy-editor/__tests__/policyService.test.ts`)

| Test | Description |
|------|-------------|
| should clone policy with new UUIDs | clonePolicy |
| should clear specific configurations | Config clearing |
| should generate clone report | Report generation |
| should validate policy structure | validatePolicy |
| should check policy can be deleted | canDeletePolicy |
| should get policy type display name | getPolicyTypeDisplay |
| should skip legacy inbound number nodes without templateClass | Legacy handling |
| should log macros and sound tags in report | Report logging |
| should check ModConnect variables | checkModConnectVariables |
| should check FollowMe variables | checkFollowMeVariables |
| should check Queue variables | checkQueueVariables |
| should check ActionRecord variables | checkActionRecordVariables |
| should check ActionRecordAnalyse variables | checkActionRecordAnalyseVariables |
| should check RequestSkills | checkRequestSkills |
| should check NotifyChatter | checkNotifyChatter |
| should check FinishVoiceMail | checkFinishVoiceMail |
| should reset KnowledgeBase fields | resetKnowledgeBaseFields |
| should reset Agent fields | resetAgentFields |
| ... (18+ additional tests) | Various scenarios |

#### Data Transform (`lib/policy-editor/__tests__/dataTransform.test.ts`)

| Test | Description |
|------|-------------|
| should transform legacy data to editor format | transformLegacyToEditor |
| should transform editor data to Salesforce format | transformEditorToSalesforce |
| should handle empty policy | Empty handling |
| should preserve node positions | Position preservation |
| should handle nested outputs | Nested outputs |
| should handle group nodes | Group nodes |
| ... (32+ additional tests) | Various transformations |

#### Node Display (`lib/policy-editor/__tests__/nodeDisplay.test.ts`)

| Test | Description |
|------|-------------|
| should get display name for node type | getNodeDisplayName |
| should get icon for node type | getNodeIcon |
| should get color for node type | getNodeColor |
| should handle unknown node type | Unknown type |
| ... (21+ additional tests) | Display helpers |

#### Node Class Name (`lib/policy-editor/__tests__/nodeClassName.test.ts`)

| Test | Description |
|------|-------------|
| should map templateId to class name | templateIdToClassName |
| should handle all node types | Complete coverage |
| should return default for unknown | Unknown handling |
| ... (22+ additional tests) | Class name mapping |

#### Node Position (`lib/policy-editor/__tests__/nodePosition.test.ts`)

| Test | Description |
|------|-------------|
| should calculate node position | calculateNodePosition |
| should handle layout configuration | Layout config |
| should position child nodes correctly | Child positioning |
| ... (6+ additional tests) | Position calculation |

### Policy Editor Components

#### FlowNode Component (`routes/(fullscreen)/policy-editor/[id]/components/__tests__/FlowNode.test.ts`)

| Test | Description |
|------|-------------|
| should render node with label | Label display |
| should render at correct position | Position styling |
| should have correct width | Width prop |
| should use default width when not specified | Default 150px |
| should have data-node-id attribute | ID attribute |
| should apply selected class when selected | Selection state |
| should not have selected class when not selected | Unselected state |
| should call onDoubleClick when double-clicked | Double-click handler |
| should NOT have input handle for init node | Init handle config |
| should NOT have input handle for input node | Input handle config |
| should have input handle for callQueue node | CallQueue handle |
| should have input handle for rule node | Rule handle |
| should NOT have output handle for output node | Output node config |
| should NOT have output handle for end node | End node config |
| should have output handle for init node | Init output |
| should have true and false output handles for rule node | Rule branching |
| should have correct data-handle-id attributes | Handle IDs |
| should display sub-items when provided | Sub-items |
| should display outputs when provided | Outputs list |
| should limit displayed items to 5 | Max items |
| should not show sub-items container when no items | Empty state |
| should use label when provided | Label priority |
| should use title as fallback | Title fallback |
| should use name as fallback | Name fallback |
| should show description when no sub-items | Description |
| should hide description when sub-items present | Description hide |
| should position input handle at vertical center | Handle position |
| should position rule node true handle at 25% height | True handle |
| should position rule node false handle at 75% height | False handle |
| should render icon for each node type | Type icons |
| should have button role | Accessibility |
| should have tabindex for keyboard navigation | Keyboard access |
| should have title on rule node handles | Handle titles |

#### Node Options Components (12 files, 159 tests)

##### GenericOptions (`options/__tests__/GenericOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input with initial value | Initial label |
| should render with default label when no data | Default label |
| should show description section | Description |
| should call onUpdate when label changes | Label update |
| should handle node type correctly | Type handling |
| should display node ID | ID display |
| should display node type | Type display |
| should apply custom class | Custom class |
| should render config section | Config section |
| should handle empty data | Empty data |

##### CallQueueOptions (`options/__tests__/CallQueueOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render with tabs | Tab navigation |
| should render general tab by default | Default tab |
| should display initial label value | Label value |
| should display initial queue name | Queue name |
| should show hold music dropdown with sounds | Hold music |
| should call onUpdate when label changes | Label change |
| should call onUpdate when queue name changes | Name change |
| should switch to agents tab | Agents tab |
| should show group selection in agents tab | Group selection |
| should show user selection in agents tab | User selection |
| should toggle group selection | Group toggle |
| should have default values when empty | Defaults |
| should show ring timeout field | Ring timeout |
| should show queue behavior options | Behavior |

##### RuleOptions (`options/__tests__/RuleOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label input |
| should render Conditions heading | Conditions |
| should render Add button | Add condition |
| should display existing conditions | Condition display |
| should show empty state when no conditions | Empty state |
| should show AND/OR connector between conditions | Connectors |
| should have field options | Field dropdown |
| should have operator options | Operator dropdown |
| should call onUpdate when label changes | Label update |
| should add new condition | Add condition |
| should remove condition | Remove condition |
| should handle empty initial data | Empty data |

##### SpeakOptions (`options/__tests__/SpeakOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label input |
| should render TTS settings | TTS config |
| should show voice selection | Voice dropdown |
| should show text input | Text input |
| should show speed control | Speed slider |
| should show pitch control | Pitch slider |
| should call onUpdate when text changes | Text update |
| should call onUpdate when voice changes | Voice update |
| should preview speech | Preview button |
| should show audio player | Audio player |
| should handle empty data | Empty data |
| should show sound file selection | Sound files |
| should show TTS/File toggle | Source toggle |
| should validate text input | Validation |

##### HuntGroupOptions (`options/__tests__/HuntGroupOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label input |
| should show hunt type selection | Hunt type |
| should show ring timeout | Ring timeout |
| should show call distribution | Distribution |
| should show agent selection | Agents |
| should show overflow settings | Overflow |
| should call onUpdate on changes | Updates |
| should handle simultaneous ring | Simultaneous |
| should handle sequential ring | Sequential |
| should handle random distribution | Random |
| should show no answer action | No answer |
| should show max wait time | Max wait |
| should have default values | Defaults |

##### InputOptions (`options/__tests__/InputOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label |
| should show input type | Type dropdown |
| should show digit collection | Digits |
| should show timeout setting | Timeout |
| should show max digits | Max digits |
| should show termination key | Termination |
| should call onUpdate on changes | Updates |
| should show DTMF options | DTMF |
| should show speech options | Speech |
| should validate input settings | Validation |
| should have default values | Defaults |

##### AIAgentOptions (`options/__tests__/AIAgentOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label |
| should show AI Agent selection | Agent dropdown |
| should show refresh button | Refresh |
| should show component version dropdown | Version |
| should show agent version dropdown | Agent version |
| should show tool result set name | Tool set |
| should show greeting prompt | Greeting |
| should show tokens configuration | Tokens |
| should call onUpdate on changes | Updates |
| should handle agent loading | Loading |
| should handle no agents | Empty state |
| should show required indicator | Required |
| should handle agent change | Agent switch |
| should fetch agents on mount | Auto-fetch |
| should have default values | Defaults |

##### EventOptions (`options/__tests__/EventOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label |
| should render event type dropdown | Event type |
| should render event name field | Event name |
| should render filter configuration | Filters |
| should render enabled toggle | Enabled |
| should show Salesforce trigger options | SF triggers |
| should show custom event options | Custom events |
| should show filter field selection | Filter field |
| should show filter operator selection | Filter operator |
| should show filter value input | Filter value |
| should call onUpdate on changes | Updates |
| should add filter | Add filter |
| should remove filter | Remove filter |
| should validate filters | Validation |
| should have default values | Defaults |
| should show event preview | Preview |

##### KnowledgeBaseOptions (`options/__tests__/KnowledgeBaseOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label |
| should show knowledge store selection | Store dropdown |
| should show refresh button | Refresh |
| should show query field | Query input |
| should show threshold slider | Threshold |
| should show metadata configuration | Metadata |
| should show test query button | Test button |
| should call onUpdate on changes | Updates |
| should handle store loading | Loading |
| should handle no stores | Empty state |
| should show test results | Results |
| should format test results | Formatting |
| should show required indicator | Required |
| should have default values | Defaults |

##### DigitalInboundOptions (`options/__tests__/DigitalInboundOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label |
| should show channel type selection | Channel type |
| should show channel group dropdown | Channel group |
| should show shared inbox dropdown | Inbox |
| should show address input | Address |
| should call onUpdate on changes | Updates |
| should filter by channel type | Filtering |
| should handle loading state | Loading |
| should handle no channels | Empty |
| should validate address format | Validation |
| should show channel preview | Preview |
| should refresh channels | Refresh |
| should have default values | Defaults |

##### OmniChannelFlowOptions (`options/__tests__/OmniChannelFlowOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label |
| should show flow selection | Flow dropdown |
| should show queue selection | Queue dropdown |
| should show skill selection | Skills |
| should show priority setting | Priority |
| should show routing configuration | Routing |
| should call onUpdate on changes | Updates |
| should handle flow loading | Loading |
| should handle no flows | Empty |
| should show queue assignment | Queue |
| should show skill requirements | Skills |
| should validate configuration | Validation |
| should have default values | Defaults |

##### SendTemplateOptions (`options/__tests__/SendTemplateOptions.test.ts`)

| Test | Description |
|------|-------------|
| should render label input | Label |
| should show message template section | Template |
| should show refresh button | Refresh |
| should show search input | Search |
| should show channel type filter | Filter |
| should show template list | List |
| should show approval status badges | Status |
| should show channel type badges | Channels |
| should show template preview | Preview |
| should call onUpdate on template select | Selection |
| should filter templates by search | Search |
| should filter templates by channel | Channel filter |
| should handle loading state | Loading |
| should have default values | Defaults |

### Routes/Pages

#### Routing Policies Page (`routes/routing-policies/__tests__/page.test.ts`)

| Test | Description |
|------|-------------|
| should render policy list | List render |
| should display policy names | Policy names |
| should show policy types | Type badges |
| should show policy status | Status indicators |
| should render search input | Search |
| should filter policies on search | Search filtering |
| should render create button | Create button |
| should open create modal | Modal open |
| should render delete button | Delete button |
| should confirm before delete | Delete confirmation |
| should navigate to policy editor | Edit navigation |
| should show empty state when no policies | Empty state |
| should show loading state | Loading |
| should show error state | Error display |
| should toggle policy status | Status toggle |
| should render column toggle | Column visibility |
| should persist column preferences | Column persistence |
| should sort by column | Sorting |
| should paginate results | Pagination |
| should render policy type filter | Type filter |
| should handle bulk actions | Bulk operations |
| should export policies | Export |
| should import policies | Import |
| should clone policy | Clone action |
| should refresh list | Refresh |
| should show last modified | Timestamps |
| should show modified by | User info |

---

## Running Tests

### All Tests

```bash
cd packages/web
pnpm test
```

### With Coverage

```bash
pnpm test:coverage
```

### Watch Mode

```bash
pnpm test:watch
```

### Specific Test File

```bash
pnpm test src/lib/stores/__tests__/auth.test.ts
```

### E2E Tests

```bash
cd e2e
pnpm test
```

---

## Maintenance

This document should be updated when:

1. New test files are added
2. Existing tests are significantly modified
3. Coverage thresholds change
4. New testing patterns are introduced
5. Dependencies are updated

To regenerate test counts:

```bash
cd packages/web
npx vitest run --reporter=verbose 2>&1 | grep "^ ✓" | wc -l
```

To view detailed coverage:

```bash
pnpm test:coverage
open coverage/index.html
```

