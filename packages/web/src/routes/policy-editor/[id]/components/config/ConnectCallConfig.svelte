<script lang="ts">
  /**
   * Connect Call App Configuration Component
   * 
   * Data Sources:
   * - Connect types: Static from defaults.ts
   * - Users: Salesforce User__c (passed as prop)
   * - Phone numbers: Salesforce PhoneNumber__c (passed as prop)
   * - Groups: Salesforce Group__c (passed as prop)
   * 
   * Validation:
   * - connectValue: Required based on connectType
   * - transferAfterConnect and hangupAfterBridge are mutually exclusive
   * 
   * Storage Location:
   * - node.config.* (various configuration fields)
   * - node.configScreen.* (screen pop settings)
   * 
   * Tabs: CONNECT, ADVANCED, SCREEN, CAMP
   */
  
  import { 
    CONNECT_TYPES,
    CALLER_ID_PRESENTATION_OPTIONS,
    TRIGGER_WHEN_LIST_CONNECT,
    KEY_OPTIONS,
    DEFAULT_CONFIG
  } from '$lib/policy-editor/defaults';
  
  interface UserData {
    id: string;
    name: string;
  }
  
  interface PhoneNumberData {
    id: string;
    name: string;
    number: string;
  }
  
  interface GroupData {
    id: string;
    name: string;
  }
  
  interface Props {
    config: {
      trigger?: string;
      connectType?: string;
      connectValue?: string;
      callerIdPresentation?: string;
      customCallerId?: string;
      transferAfterConnect?: boolean;
      hangupAfterBridge?: boolean;
      ringDuration?: number;
      screen?: {
        enabled?: boolean;
        announcement?: string;
        acceptKey?: string;
        waitForResponse?: number;
        repeat?: number;
      };
      camp?: {
        enabled?: boolean;
        maxAttempts?: number;
        intervalSeconds?: number;
      };
    };
    users?: UserData[];
    phoneNumbers?: PhoneNumberData[];
    groups?: GroupData[];
    onChange: (field: string, value: unknown) => void;
  }
  
  let { config, users = [], phoneNumbers = [], groups = [], onChange }: Props = $props();
  
  // Active tab
  let activeTab = $state<'connect' | 'advanced' | 'screen' | 'camp'>('connect');
  
  // Local state
  let trigger = $state(config.trigger || 'ALWAYS');
  let connectType = $state(config.connectType || DEFAULT_CONFIG.connectCall.connectType);
  let connectValue = $state(config.connectValue || '');
  let callerIdPresentation = $state(config.callerIdPresentation || DEFAULT_CONFIG.connectCall.callerIdPresentation);
  let customCallerId = $state(config.customCallerId || '');
  let transferAfterConnect = $state(config.transferAfterConnect || false);
  let hangupAfterBridge = $state(config.hangupAfterBridge || false);
  let ringDuration = $state(config.ringDuration || DEFAULT_CONFIG.connectCall.ringDuration);
  
  // Screen config
  let screenEnabled = $state(config.screen?.enabled || false);
  let screenAnnouncement = $state(config.screen?.announcement || '');
  let screenAcceptKey = $state(config.screen?.acceptKey || '1');
  let screenWaitForResponse = $state(config.screen?.waitForResponse || 10);
  let screenRepeat = $state(config.screen?.repeat || 3);
  
  // Camp config
  let campEnabled = $state(config.camp?.enabled || false);
  let campMaxAttempts = $state(config.camp?.maxAttempts || 3);
  let campIntervalSeconds = $state(config.camp?.intervalSeconds || 30);
  
  // Validation
  let errors = $state<Record<string, string>>({});
  
  $effect(() => {
    trigger = config.trigger || 'ALWAYS';
    connectType = config.connectType || DEFAULT_CONFIG.connectCall.connectType;
    connectValue = config.connectValue || '';
    callerIdPresentation = config.callerIdPresentation || DEFAULT_CONFIG.connectCall.callerIdPresentation;
    transferAfterConnect = config.transferAfterConnect || false;
    hangupAfterBridge = config.hangupAfterBridge || false;
    ringDuration = config.ringDuration || DEFAULT_CONFIG.connectCall.ringDuration;
  });
  
  function handleChange(field: string, value: unknown) {
    // Handle mutual exclusivity
    if (field === 'transferAfterConnect' && value === true) {
      hangupAfterBridge = false;
      onChange('hangupAfterBridge', false);
    }
    if (field === 'hangupAfterBridge' && value === true) {
      transferAfterConnect = false;
      onChange('transferAfterConnect', false);
    }
    onChange(field, value);
  }
  
  function saveScreenConfig() {
    onChange('screen', {
      enabled: screenEnabled,
      announcement: screenAnnouncement,
      acceptKey: screenAcceptKey,
      waitForResponse: screenWaitForResponse,
      repeat: screenRepeat
    });
  }
  
  function saveCampConfig() {
    onChange('camp', {
      enabled: campEnabled,
      maxAttempts: campMaxAttempts,
      intervalSeconds: campIntervalSeconds
    });
  }
  
  // Get destination options based on connect type
  const destinationOptions = $derived(() => {
    switch (connectType) {
      case 'DDI_USER':
        return users.map(u => ({ value: u.id, label: u.name }));
      case 'ORGANIZATION_NUMBER':
        return phoneNumbers.map(p => ({ value: p.id, label: `${p.name} (${p.number})` }));
      default:
        return [];
    }
  });
</script>

<div class="config-section">
  <h4 class="section-title">Connect Call Settings</h4>
  
  <!-- Tab Navigation -->
  <div class="tab-nav mb-4">
    <button class="tab-btn" class:active={activeTab === 'connect'} onclick={() => activeTab = 'connect'}>
      Connect
    </button>
    <button class="tab-btn" class:active={activeTab === 'advanced'} onclick={() => activeTab = 'advanced'}>
      Advanced
    </button>
    <button class="tab-btn" class:active={activeTab === 'screen'} onclick={() => activeTab = 'screen'}>
      Screen
    </button>
    <button class="tab-btn" class:active={activeTab === 'camp'} onclick={() => activeTab = 'camp'}>
      Camp
    </button>
  </div>
  
  <!-- CONNECT Tab -->
  {#if activeTab === 'connect'}
    <div class="space-y-4">
      <!-- Trigger -->
      <div>
        <label class="config-label">Trigger When</label>
        <select 
          class="config-select"
          bind:value={trigger}
          onchange={() => handleChange('trigger', trigger)}
        >
          {#each TRIGGER_WHEN_LIST_CONNECT as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      
      <!-- Connect Type -->
      <div>
        <label class="config-label">Connect To</label>
        <select 
          class="config-select"
          bind:value={connectType}
          onchange={() => handleChange('connectType', connectType)}
        >
          {#each CONNECT_TYPES as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
        <p class="text-xs text-surface-500 mt-1">
          {CONNECT_TYPES.find(t => t.value === connectType)?.description || ''}
        </p>
      </div>
      
      <!-- Destination -->
      <div>
        <label class="config-label">Destination <span class="text-red-500">*</span></label>
        {#if connectType === 'OUTBOUND_CALL' || connectType === 'SIP'}
          <input 
            type="text" 
            class="config-input"
            bind:value={connectValue}
            onchange={() => handleChange('connectValue', connectValue)}
            placeholder={connectType === 'SIP' ? 'sip:user@domain.com' : '+44 20 1234 5678'}
          />
        {:else}
          <select 
            class="config-select"
            bind:value={connectValue}
            onchange={() => handleChange('connectValue', connectValue)}
          >
            <option value="">Select destination...</option>
            {#each destinationOptions() as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        {/if}
      </div>
      
      <!-- Ring Duration -->
      <div>
        <label class="config-label">Ring Duration (seconds)</label>
        <input 
          type="number" 
          class="config-input"
          bind:value={ringDuration}
          onchange={() => handleChange('ringDuration', ringDuration)}
          min="5"
          max="120"
        />
      </div>
    </div>
  {/if}
  
  <!-- ADVANCED Tab -->
  {#if activeTab === 'advanced'}
    <div class="space-y-4">
      <!-- Caller ID Presentation -->
      <div>
        <label class="config-label">Caller ID Presentation</label>
        <select 
          class="config-select"
          bind:value={callerIdPresentation}
          onchange={() => handleChange('callerIdPresentation', callerIdPresentation)}
        >
          {#each CALLER_ID_PRESENTATION_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      
      {#if callerIdPresentation === 'CUSTOM'}
        <div>
          <label class="config-label">Custom Caller ID</label>
          <input 
            type="text" 
            class="config-input"
            bind:value={customCallerId}
            onchange={() => handleChange('customCallerId', customCallerId)}
            placeholder="+44 20 1234 5678"
          />
        </div>
      {/if}
      
      <!-- Transfer Options -->
      <div class="p-3 bg-surface-100 dark:bg-surface-700 rounded-md space-y-2">
        <p class="text-xs font-medium text-surface-600 dark:text-surface-300">After Connection</p>
        
        <label class="flex items-center gap-2">
          <input 
            type="checkbox" 
            class="config-checkbox"
            bind:checked={transferAfterConnect}
            onchange={() => handleChange('transferAfterConnect', transferAfterConnect)}
          />
          <span class="text-sm">Transfer after connect (blind transfer)</span>
        </label>
        
        <label class="flex items-center gap-2">
          <input 
            type="checkbox" 
            class="config-checkbox"
            bind:checked={hangupAfterBridge}
            onchange={() => handleChange('hangupAfterBridge', hangupAfterBridge)}
          />
          <span class="text-sm">Hang up after bridge</span>
        </label>
        
        {#if transferAfterConnect || hangupAfterBridge}
          <p class="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ These options are mutually exclusive
          </p>
        {/if}
      </div>
    </div>
  {/if}
  
  <!-- SCREEN Tab -->
  {#if activeTab === 'screen'}
    <div class="space-y-4">
      <p class="text-xs text-surface-500">
        Screen pop settings - announce the call to the target before connecting.
      </p>
      
      <label class="flex items-center gap-2">
        <input 
          type="checkbox" 
          class="config-checkbox"
          bind:checked={screenEnabled}
          onchange={saveScreenConfig}
        />
        <span class="text-sm font-medium">Enable Screen Pop</span>
      </label>
      
      {#if screenEnabled}
        <div class="space-y-3">
          <div>
            <label class="config-label">Announcement</label>
            <textarea 
              class="config-input resize-none"
              rows="2"
              bind:value={screenAnnouncement}
              onchange={saveScreenConfig}
              placeholder="Incoming call from \u007Bcaller_name\u007D"
            ></textarea>
          </div>
          
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="config-label text-xs">Accept Key</label>
              <select class="config-select" bind:value={screenAcceptKey} onchange={saveScreenConfig}>
                {#each KEY_OPTIONS as key}
                  <option value={key.value}>{key.label}</option>
                {/each}
              </select>
            </div>
            <div>
              <label class="config-label text-xs">Wait (sec)</label>
              <input type="number" class="config-input" bind:value={screenWaitForResponse} onchange={saveScreenConfig} min="5" max="60" />
            </div>
            <div>
              <label class="config-label text-xs">Repeat</label>
              <input type="number" class="config-input" bind:value={screenRepeat} onchange={saveScreenConfig} min="1" max="10" />
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- CAMP Tab -->
  {#if activeTab === 'camp'}
    <div class="space-y-4">
      <p class="text-xs text-surface-500">
        Camp-on settings - retry the connection if the target is busy or unavailable.
      </p>
      
      <label class="flex items-center gap-2">
        <input 
          type="checkbox" 
          class="config-checkbox"
          bind:checked={campEnabled}
          onchange={saveCampConfig}
        />
        <span class="text-sm font-medium">Enable Camp-On</span>
      </label>
      
      {#if campEnabled}
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="config-label">Max Attempts</label>
            <input 
              type="number" 
              class="config-input"
              bind:value={campMaxAttempts}
              onchange={saveCampConfig}
              min="1"
              max="10"
            />
          </div>
          <div>
            <label class="config-label">Retry Interval (sec)</label>
            <input 
              type="number" 
              class="config-input"
              bind:value={campIntervalSeconds}
              onchange={saveCampConfig}
              min="10"
              max="300"
            />
          </div>
        </div>
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
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  :global(.dark) .section-title { color: rgb(var(--color-surface-400)); }
  
  .tab-nav {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid rgb(var(--color-surface-300));
    padding-bottom: 0.5rem;
  }
  :global(.dark) .tab-nav { border-bottom-color: rgb(var(--color-surface-600)); }
  
  .tab-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(var(--color-surface-500));
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .tab-btn:hover { color: rgb(var(--color-surface-700)); background-color: rgb(var(--color-surface-100)); }
  :global(.dark) .tab-btn:hover { color: rgb(var(--color-surface-300)); background-color: rgb(var(--color-surface-700)); }
  .tab-btn.active {
    color: rgb(var(--color-primary-600));
    background-color: rgb(var(--color-primary-50));
  }
  :global(.dark) .tab-btn.active {
    color: rgb(var(--color-primary-400));
    background-color: rgba(var(--color-primary-500), 0.2);
  }
  
  .config-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.375rem;
  }
  :global(.dark) .config-label { color: rgb(var(--color-surface-400)); }
  
  .config-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
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
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
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
    width: 1rem;
    height: 1rem;
    accent-color: rgb(var(--color-primary-500));
  }
</style>

