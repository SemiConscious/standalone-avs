<script lang="ts">
  /**
   * Notify App Configuration Component
   * 
   * Data Sources:
   * - Notification types: Static from defaults.ts
   * - SF Users: Salesforce User (passed as prop)
   * - Chatter Groups: Salesforce CollaborationGroup (passed as prop)
   * 
   * Validation:
   * - Email: to address required, valid email format
   * - SMS: to number required, valid phone format
   * - Chatter: groupId required
   * 
   * Storage Location:
   * - node.subItems.email[]
   * - node.subItems.sms[]
   * - node.subItems.chatter[]
   */
  
  import { 
    NOTIFICATION_TYPES,
    isValidEmail,
    isValidPhoneNumber
  } from '$lib/policy-editor/defaults';
  
  interface UserData {
    id: string;
    name: string;
    email?: string;
  }
  
  interface ChatterGroup {
    id: string;
    name: string;
  }
  
  interface EmailNotification {
    to: string;
    cc?: string;
    subject: string;
    body: string;
    attachRecording?: boolean;
  }
  
  interface SmsNotification {
    to: string;
    body: string;
  }
  
  interface ChatterNotification {
    groupId: string;
    body: string;
  }
  
  interface Props {
    config: {
      type?: string;
      email?: EmailNotification[];
      sms?: SmsNotification[];
      chatter?: ChatterNotification[];
    };
    users?: UserData[];
    chatterGroups?: ChatterGroup[];
    onChange: (field: string, value: unknown) => void;
  }
  
  let { config, users = [], chatterGroups = [], onChange }: Props = $props();
  
  // Current notification type
  let activeType = $state(config.type || 'EMAIL');
  
  // Email notifications
  let emailNotifications = $state<EmailNotification[]>(config.email || []);
  
  // SMS notifications
  let smsNotifications = $state<SmsNotification[]>(config.sms || []);
  
  // Chatter notifications
  let chatterNotifications = $state<ChatterNotification[]>(config.chatter || []);
  
  // Validation
  let errors = $state<Record<string, string>>({});
  
  $effect(() => {
    activeType = config.type || 'EMAIL';
    emailNotifications = config.email || [];
    smsNotifications = config.sms || [];
    chatterNotifications = config.chatter || [];
  });
  
  function handleTypeChange() {
    onChange('type', activeType);
  }
  
  // ====== EMAIL NOTIFICATIONS ======
  function addEmailNotification() {
    emailNotifications = [...emailNotifications, { to: '', cc: '', subject: '', body: '', attachRecording: false }];
    onChange('email', emailNotifications);
  }
  
  function updateEmailNotification(index: number, field: keyof EmailNotification, value: unknown) {
    emailNotifications = emailNotifications.map((n, i) => 
      i === index ? { ...n, [field]: value } : n
    );
    
    // Validate email addresses
    if (field === 'to') {
      const email = String(value);
      if (email && !isValidEmail(email)) {
        errors[`email-${index}-to`] = 'Invalid email address';
      } else {
        delete errors[`email-${index}-to`];
      }
    }
    
    onChange('email', emailNotifications);
  }
  
  function removeEmailNotification(index: number) {
    emailNotifications = emailNotifications.filter((_, i) => i !== index);
    delete errors[`email-${index}-to`];
    onChange('email', emailNotifications);
  }
  
  // ====== SMS NOTIFICATIONS ======
  function addSmsNotification() {
    smsNotifications = [...smsNotifications, { to: '', body: '' }];
    onChange('sms', smsNotifications);
  }
  
  function updateSmsNotification(index: number, field: keyof SmsNotification, value: unknown) {
    smsNotifications = smsNotifications.map((n, i) => 
      i === index ? { ...n, [field]: value } : n
    );
    
    // Validate phone numbers
    if (field === 'to') {
      const phone = String(value);
      if (phone && !phone.startsWith('{') && !isValidPhoneNumber(phone)) {
        errors[`sms-${index}-to`] = 'Invalid phone number';
      } else {
        delete errors[`sms-${index}-to`];
      }
    }
    
    onChange('sms', smsNotifications);
  }
  
  function removeSmsNotification(index: number) {
    smsNotifications = smsNotifications.filter((_, i) => i !== index);
    delete errors[`sms-${index}-to`];
    onChange('sms', smsNotifications);
  }
  
  // ====== CHATTER NOTIFICATIONS ======
  function addChatterNotification() {
    chatterNotifications = [...chatterNotifications, { groupId: '', body: '' }];
    onChange('chatter', chatterNotifications);
  }
  
  function updateChatterNotification(index: number, field: keyof ChatterNotification, value: unknown) {
    chatterNotifications = chatterNotifications.map((n, i) => 
      i === index ? { ...n, [field]: value } : n
    );
    onChange('chatter', chatterNotifications);
  }
  
  function removeChatterNotification(index: number) {
    chatterNotifications = chatterNotifications.filter((_, i) => i !== index);
    onChange('chatter', chatterNotifications);
  }
  
  // Count notifications
  const notificationCounts = $derived(() => ({
    EMAIL: emailNotifications.length,
    SMS: smsNotifications.length,
    CHATTER: chatterNotifications.length
  }));
</script>

<div class="config-section">
  <h4 class="section-title">Notify Settings</h4>
  
  <p class="text-xs text-surface-500 mb-3">
    Send notifications via email, SMS, or Chatter when this component is executed.
  </p>
  
  <!-- Notification Type Tabs -->
  <div class="type-tabs mb-4">
    {#each NOTIFICATION_TYPES as type}
      <button 
        class="type-tab"
        class:active={activeType === type.value}
        onclick={() => { activeType = type.value; handleTypeChange(); }}
      >
        {type.label}
        {#if notificationCounts()[type.value as keyof typeof notificationCounts] > 0}
          <span class="count-badge">{notificationCounts()[type.value as keyof typeof notificationCounts]}</span>
        {/if}
      </button>
    {/each}
  </div>
  
  <!-- EMAIL Notifications -->
  {#if activeType === 'EMAIL'}
    <div class="space-y-3">
      {#each emailNotifications as notification, index}
        <div class="notification-card">
          <div class="notification-header">
            <span class="text-xs font-medium">Email {index + 1}</span>
            <button class="delete-btn-sm" onclick={() => removeEmailNotification(index)}>×</button>
          </div>
          
          <div class="space-y-2">
            <div>
              <label class="config-label text-xs">To <span class="text-red-500">*</span></label>
              <input 
                type="email" 
                class="config-input"
                class:border-red-500={errors[`email-${index}-to`]}
                value={notification.to}
                onchange={(e) => updateEmailNotification(index, 'to', (e.target as HTMLInputElement).value)}
                placeholder="recipient@example.com"
              />
              {#if errors[`email-${index}-to`]}
                <p class="text-xs text-red-500 mt-0.5">{errors[`email-${index}-to`]}</p>
              {/if}
            </div>
            
            <div>
              <label class="config-label text-xs">CC</label>
              <input 
                type="email" 
                class="config-input"
                value={notification.cc || ''}
                onchange={(e) => updateEmailNotification(index, 'cc', (e.target as HTMLInputElement).value)}
                placeholder="cc@example.com"
              />
            </div>
            
            <div>
              <label class="config-label text-xs">Subject</label>
              <input 
                type="text" 
                class="config-input"
                value={notification.subject}
                onchange={(e) => updateEmailNotification(index, 'subject', (e.target as HTMLInputElement).value)}
                placeholder="Notification: \u007Bcaller_name\u007D"
              />
            </div>
            
            <div>
              <label class="config-label text-xs">Body</label>
              <textarea 
                class="config-input resize-none"
                rows="3"
                value={notification.body}
                onchange={(e) => updateEmailNotification(index, 'body', (e.target as HTMLTextAreaElement).value)}
                placeholder="Email body content..."
              ></textarea>
            </div>
            
            <label class="flex items-center gap-2">
              <input 
                type="checkbox" 
                class="config-checkbox"
                checked={notification.attachRecording || false}
                onchange={(e) => updateEmailNotification(index, 'attachRecording', (e.target as HTMLInputElement).checked)}
              />
              <span class="text-xs">Attach call recording</span>
            </label>
          </div>
        </div>
      {/each}
      
      <button class="add-btn" onclick={addEmailNotification}>
        + Add Email Notification
      </button>
    </div>
  {/if}
  
  <!-- SMS Notifications -->
  {#if activeType === 'SMS'}
    <div class="space-y-3">
      {#each smsNotifications as notification, index}
        <div class="notification-card">
          <div class="notification-header">
            <span class="text-xs font-medium">SMS {index + 1}</span>
            <button class="delete-btn-sm" onclick={() => removeSmsNotification(index)}>×</button>
          </div>
          
          <div class="space-y-2">
            <div>
              <label class="config-label text-xs">To <span class="text-red-500">*</span></label>
              <input 
                type="text" 
                class="config-input"
                class:border-red-500={errors[`sms-${index}-to`]}
                value={notification.to}
                onchange={(e) => updateSmsNotification(index, 'to', (e.target as HTMLInputElement).value)}
                placeholder="+44 20 1234 5678 or \u007Bcaller_number\u007D"
              />
              {#if errors[`sms-${index}-to`]}
                <p class="text-xs text-red-500 mt-0.5">{errors[`sms-${index}-to`]}</p>
              {:else}
                <p class="text-xs text-surface-500 mt-0.5">Use macros like {'{caller_number}'} for dynamic values</p>
              {/if}
            </div>
            
            <div>
              <label class="config-label text-xs">Message</label>
              <textarea 
                class="config-input resize-none"
                rows="3"
                value={notification.body}
                onchange={(e) => updateSmsNotification(index, 'body', (e.target as HTMLTextAreaElement).value)}
                placeholder="SMS message content..."
              ></textarea>
              <p class="text-xs text-surface-500 mt-0.5">Max 160 characters for single SMS</p>
            </div>
          </div>
        </div>
      {/each}
      
      <button class="add-btn" onclick={addSmsNotification}>
        + Add SMS Notification
      </button>
    </div>
  {/if}
  
  <!-- Chatter Notifications -->
  {#if activeType === 'CHATTER'}
    <div class="space-y-3">
      {#each chatterNotifications as notification, index}
        <div class="notification-card">
          <div class="notification-header">
            <span class="text-xs font-medium">Chatter Post {index + 1}</span>
            <button class="delete-btn-sm" onclick={() => removeChatterNotification(index)}>×</button>
          </div>
          
          <div class="space-y-2">
            <div>
              <label class="config-label text-xs">Chatter Group <span class="text-red-500">*</span></label>
              <select 
                class="config-select"
                value={notification.groupId}
                onchange={(e) => updateChatterNotification(index, 'groupId', (e.target as HTMLSelectElement).value)}
              >
                <option value="">Select group...</option>
                {#each chatterGroups as group}
                  <option value={group.id}>{group.name}</option>
                {/each}
              </select>
            </div>
            
            <div>
              <label class="config-label text-xs">Post Content</label>
              <textarea 
                class="config-input resize-none"
                rows="3"
                value={notification.body}
                onchange={(e) => updateChatterNotification(index, 'body', (e.target as HTMLTextAreaElement).value)}
                placeholder="Chatter post content..."
              ></textarea>
            </div>
          </div>
        </div>
      {/each}
      
      <button class="add-btn" onclick={addChatterNotification}>
        + Add Chatter Notification
      </button>
      
      {#if chatterGroups.length === 0}
        <p class="text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-500/10 rounded">
          ⚠️ No Chatter groups available. Chatter groups must be created in Salesforce first.
        </p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .config-section { padding-top: 0.5rem; }
  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  :global(.dark) .section-title { color: rgb(var(--color-surface-400)); }
  
  .type-tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid rgb(var(--color-surface-300));
    padding-bottom: 0.5rem;
  }
  :global(.dark) .type-tabs { border-bottom-color: rgb(var(--color-surface-600)); }
  
  .type-tab {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(var(--color-surface-500));
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  .type-tab:hover { color: rgb(var(--color-surface-700)); background-color: rgb(var(--color-surface-100)); }
  :global(.dark) .type-tab:hover { color: rgb(var(--color-surface-300)); background-color: rgb(var(--color-surface-700)); }
  .type-tab.active { color: rgb(var(--color-primary-600)); background-color: rgb(var(--color-primary-50)); }
  :global(.dark) .type-tab.active { color: rgb(var(--color-primary-400)); background-color: rgba(var(--color-primary-500), 0.2); }
  
  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1rem;
    height: 1rem;
    font-size: 0.625rem;
    font-weight: 600;
    background: rgb(var(--color-primary-500));
    color: white;
    border-radius: 9999px;
  }
  
  .notification-card {
    padding: 0.75rem;
    background: rgb(var(--color-surface-50));
    border: 1px solid rgb(var(--color-surface-200));
    border-radius: 0.375rem;
  }
  :global(.dark) .notification-card {
    background: rgb(var(--color-surface-700));
    border-color: rgb(var(--color-surface-600));
  }
  
  .notification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(var(--color-surface-200));
  }
  :global(.dark) .notification-header { border-bottom-color: rgb(var(--color-surface-600)); }
  
  .delete-btn-sm {
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    color: rgb(var(--color-surface-500));
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .delete-btn-sm:hover { color: rgb(var(--color-red-500)); background: rgb(var(--color-red-50)); }
  :global(.dark) .delete-btn-sm:hover { background: rgba(var(--color-red-500), 0.2); }
  
  .config-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.25rem;
  }
  :global(.dark) .config-label { color: rgb(var(--color-surface-400)); }
  
  .config-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    background-color: white;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    color: rgb(var(--color-surface-800));
  }
  :global(.dark) .config-input {
    background-color: rgb(var(--color-surface-900));
    border-color: rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-100));
  }
  
  .config-select {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
    background-color: white;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    color: rgb(var(--color-surface-800));
    cursor: pointer;
  }
  :global(.dark) .config-select {
    background-color: rgb(var(--color-surface-900));
    border-color: rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-100));
  }
  
  .config-checkbox {
    width: 0.875rem;
    height: 0.875rem;
    accent-color: rgb(var(--color-primary-500));
  }
  
  .add-btn {
    width: 100%;
    padding: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(var(--color-primary-600));
    background-color: rgb(var(--color-primary-50));
    border: 1px dashed rgb(var(--color-primary-300));
    border-radius: 0.25rem;
    cursor: pointer;
  }
  :global(.dark) .add-btn {
    color: rgb(var(--color-primary-400));
    background-color: rgba(var(--color-primary-500), 0.1);
    border-color: rgba(var(--color-primary-500), 0.3);
  }
  .add-btn:hover { background-color: rgb(var(--color-primary-100)); }
  :global(.dark) .add-btn:hover { background-color: rgba(var(--color-primary-500), 0.2); }
</style>

