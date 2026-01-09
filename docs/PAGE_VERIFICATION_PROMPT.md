# Page-by-Page Verification Prompt

Use this prompt to systematically verify each page in the application. Copy and customize for each page you're reviewing.

---

## Prompt Template

```
Please systematically verify the [PAGE NAME] page by checking the following categories:

### 1. DATA SOURCE CONNECTIONS
- [ ] All required data is being fetched from the correct sources (Salesforce, Sapien API, etc.)
- [ ] Error handling exists for failed API calls
- [ ] Loading states are shown while data is being fetched
- [ ] Demo/fallback data is used appropriately when real data is unavailable

### 2. VISUAL DISPLAY & THEMING
- [ ] All text is readable against its background (check for dark blue/accent text on dark backgrounds)
- [ ] Icons for enabled/disabled states are clearly visible (avoid `text-text-tertiary` on dark backgrounds - use `text-gray-500` or similar)
- [ ] Links use appropriate contrast colors (`text-primary-400` not `text-accent`)
- [ ] Spacing is consistent between similar elements
- [ ] Cards and containers allow content to determine their height where appropriate
- [ ] Headers and titles use `text-text-primary` for readability

### 3. USER INPUT & FORMS
- [ ] All form fields accept valid input
- [ ] Required fields are clearly marked
- [ ] Input validation provides clear error messages
- [ ] Edit mode vs. non-edit mode are clearly distinguished:
  - Non-edit: Plain text values, icons for boolean states (not interactive controls)
  - Edit mode: Interactive inputs, dropdowns, toggles

### 4. ACTION BUTTONS & LINKS
- [ ] Every button has a working onclick handler
- [ ] Every "Edit" link in data tables opens a functional edit modal/form
- [ ] Every "Delete" button has a confirmation and working delete action
- [ ] Every "Play" button (for media) has working playback functionality
- [ ] Every "Upload" button has a complete upload flow (file selection, validation, progress, submission)
- [ ] External links (e.g., Salesforce URLs) open correctly in new tabs
- [ ] Refresh buttons actually refresh the relevant data

### 5. MODALS & DIALOGS
- [ ] All modals have complete implementations (not placeholder content)
- [ ] Modals can be closed via X button, Cancel button, or clicking outside
- [ ] Form submissions in modals show loading states
- [ ] Success/error feedback is provided after modal actions
- [ ] Modal state is properly reset when reopened

### 6. SERVICE UPDATES
- [ ] Create operations work and refresh the UI
- [ ] Update operations persist changes correctly
- [ ] Delete operations work with proper confirmation
- [ ] Toggle/switch changes are saved to the backend

### 7. CONDITIONAL UI ELEMENTS
- [ ] Elements that require specific licenses are hidden/shown appropriately
- [ ] Admin-only features are properly gated
- [ ] Empty states are shown when no data exists

### 8. NAVIGATION & TABS
- [ ] Tab switching works correctly
- [ ] Tab-specific controls (Edit/Refresh buttons) appear/hide appropriately
- [ ] Active tab is visually indicated
```

---

## Key Patterns to Watch For

These are common issues discovered during development that should be checked proactively.

### Theming Issues

| Problem | Bad Pattern | Good Pattern |
|---------|-------------|--------------|
| Dark text on dark background | `text-accent` | `text-primary-400` |
| Invisible disabled icons | `text-text-tertiary` | `text-gray-500` |
| Unreadable headers | Default/inherited color | `text-text-primary` |
| Low contrast links | `text-accent` | `text-primary-400 hover:text-primary-300` |

### Incomplete Action Handlers

Look for these warning signs:
- `onclick={() => console.log(...)}` - Placeholder handlers
- `onclick={() => {}}` - Empty handlers
- Missing `onclick` on buttons entirely
- Data table action columns with non-functional icons

### API Endpoint Checklist

For features that interact with external services, verify:

| Feature | Required Endpoint | Auth Type |
|---------|-------------------|-----------|
| Sound playback | `/api/sounds/[id]` | Sapien Access Token |
| Sound upload | `/api/sounds/upload` | Sapien Access Token |
| Call recordings | `/api/recordings/[uuid]` | Sapien Access Token |
| Wallboard stats | `/api/wallboards/stats` | Gatekeeper JWT (`omni:basic`) |
| Routing policies | Various | Gatekeeper JWT (`routing-policies:admin`) |

### Authentication Token Usage

Two types of tokens are used for Sapien API access:

1. **Sapien Access Token** (via `getSapienAccessToken`)
   - Used for: General API access (sounds, recordings, call logs, license data)
   - Obtained from: OAuth password grant with API service account
   - Scope: Broad "user admin" access

2. **Gatekeeper JWT** (via `getJwt`)
   - Used for: Scoped operations (wallboards, routing policies)
   - Obtained from: Gatekeeper service with specific scope request
   - Scope: Intersection of requested scope and user's assigned scopes

---

## Page-Specific Notes

### Admin Home
- License data comes from Sapien API (`/extra/license/{orgId}`), not Salesforce SOQL
- Call Reporting job status is determined by `API_v1__c.ReportingPolicyId__c`, not CronTrigger
- "Grant Login Access" should be an `<a>` tag linking to Salesforce, not a button

### Account Settings
- Edit/Refresh buttons should only appear on General, Telephony, and Integrations tabs
- Profiles, Skills, and Sounds tabs should NOT have global Edit/Refresh buttons
- Each data table row should have working Edit and Delete actions
- Sounds tab needs working Play and Upload functionality

### User Home (My Profile)
- "My Devices" data comes from both `UserRingTarget__c` and `RegisteredNumber__c`
- Call logs require Sapien Access Token, not Gatekeeper JWT
- Subscription icons reflect license data from Sapien

---

## Verification Progress Tracker

Use this to track which pages have been verified:

| Page | Data Sources | Theming | Forms | Actions | Modals | Updates | Status |
|------|--------------|---------|-------|---------|--------|---------|--------|
| Admin Home | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | **Complete** |
| Account Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ⏳ | **In Progress** |
| User Home | ✅ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Natterbox Users | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Groups | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Devices | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Phone Numbers | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Routing Policies | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Call Status | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Call Logs | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Monitoring/Wallboards | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |
| Sounds | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |

---

## Quick Reference: CSS Classes

### Text Colors (Dark Theme)
```css
/* Primary text - high contrast */
text-text-primary     /* White/light - for headings, important text */

/* Secondary text - medium contrast */
text-text-secondary   /* Gray - for labels, descriptions */

/* Tertiary text - low contrast (use sparingly!) */
text-text-tertiary    /* Dark gray - nearly invisible on dark backgrounds */

/* Accent colors */
text-primary-400      /* Blue - for links, icons, interactive elements */
text-accent           /* Dark blue - AVOID on dark backgrounds */

/* State colors */
text-success          /* Green - for enabled/positive states */
text-error            /* Red - for errors, delete actions */
text-warning          /* Yellow/orange - for warnings */
text-gray-500         /* Pale gray - for disabled states (visible!) */
```

### Common Fixes
```svelte
<!-- BAD: Invisible on dark background -->
<XCircle class="w-4 h-4 text-text-tertiary" />

<!-- GOOD: Visible pale gray -->
<XCircle class="w-4 h-4 text-gray-500" />

<!-- BAD: Dark blue link -->
<a class="text-accent">Link</a>

<!-- GOOD: Readable blue link -->
<a class="text-primary-400 hover:text-primary-300">Link</a>

<!-- BAD: Default header color -->
<h3 class="font-semibold">Title</h3>

<!-- GOOD: Explicit readable color -->
<h3 class="font-semibold text-text-primary">Title</h3>
```
