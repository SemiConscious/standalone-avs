<script lang="ts">
  /**
   * Record Call / Record & Analyse App Configuration Component
   * 
   * Data Sources:
   * - Channel options: Static from defaults.ts
   * - Beep options: Static from defaults.ts
   * - Archiving policies: Salesforce (passed as prop)
   * - Transcription engines: Static from defaults.ts
   * - Languages: Static from defaults.ts
   * 
   * Validation:
   * - archivePolicyId: Required if retain is true
   * - emailToAddresses: Valid email format if emailSend is true
   * 
   * Storage Location:
   * - node.variables.* (for recordCall)
   * - node.config.* (for recordAndAnalyse)
   * 
   * This component handles both 'recordCall' and 'recordAndAnalyse' types
   */
  
  import { 
    CHANNEL_OPTIONS,
    BEEP_OPTIONS,
    RECORDING_START_OPTIONS,
    TRANSCRIPTION_ENGINE_OPTIONS,
    INSIGHT_OPTIONS,
    VOICEBASE_LANGUAGES,
    DEEPGRAM_LANGUAGES,
    isValidEmail,
    DEFAULT_CONFIG
  } from '$lib/policy-editor/defaults';
  
  interface ArchivingPolicy {
    id: string;
    name: string;
  }
  
  interface Props {
    config: {
      retain?: boolean;
      archivePolicyId?: string;
      archivingPolicyId?: string;  // Alternative field name
      channel?: string;
      startOnBridge?: boolean;
      startRecording?: string;
      allowPause?: boolean;
      pauseAllowed?: boolean;
      stopAllowed?: boolean;
      beep?: string;
      beepAlert?: string;
      toneStream?: string;
      emailSend?: boolean;
      emailToAddresses?: string;
      emailCcAddresses?: string;
      emailSubject?: string;
      // AI Advisor fields (for recordAndAnalyse)
      insightConfig?: string;
      transcriptionEngine?: string;
      analysisLanguage?: string;
      analysisLeg?: string;
      disableSummarization?: boolean;
    };
    archivingPolicies?: ArchivingPolicy[];
    isRecordAndAnalyse?: boolean;
    onChange: (field: string, value: unknown) => void;
  }
  
  let { config, archivingPolicies = [], isRecordAndAnalyse = false, onChange }: Props = $props();
  
  // Active tab (only for recordAndAnalyse)
  let activeTab = $state<'record' | 'aiAdvisor'>('record');
  
  // Local state - Recording
  let retain = $state(config.retain || false);
  let archivePolicyId = $state(config.archivePolicyId || config.archivingPolicyId || '');
  let channel = $state(config.channel || DEFAULT_CONFIG.recordCall.channel);
  let startOnBridge = $state(config.startOnBridge !== undefined ? config.startOnBridge : true);
  let startRecording = $state(config.startRecording || 'ON_BRIDGE');
  let allowPause = $state(config.allowPause || config.pauseAllowed || false);
  let stopAllowed = $state(config.stopAllowed || false);
  let beep = $state(config.beep || config.beepAlert || 'OFF');
  let toneStream = $state(config.toneStream || '');
  let emailSend = $state(config.emailSend || false);
  let emailToAddresses = $state(config.emailToAddresses || '');
  let emailCcAddresses = $state(config.emailCcAddresses || '');
  let emailSubject = $state(config.emailSubject || '');
  
  // Local state - AI Advisor (recordAndAnalyse only)
  let insightConfig = $state(config.insightConfig || 'NONE');
  let transcriptionEngine = $state(config.transcriptionEngine || 'DEEPGRAM');
  let analysisLanguage = $state(config.analysisLanguage || 'en');
  let analysisLeg = $state(config.analysisLeg || 'BOTH');
  let disableSummarization = $state(config.disableSummarization || false);
  
  // Validation
  let errors = $state<Record<string, string>>({});
  
  $effect(() => {
    retain = config.retain || false;
    archivePolicyId = config.archivePolicyId || config.archivingPolicyId || '';
    channel = config.channel || DEFAULT_CONFIG.recordCall.channel;
    startOnBridge = config.startOnBridge !== undefined ? config.startOnBridge : true;
    startRecording = config.startRecording || 'ON_BRIDGE';
    allowPause = config.allowPause || config.pauseAllowed || false;
    stopAllowed = config.stopAllowed || false;
    beep = config.beep || config.beepAlert || 'OFF';
    emailSend = config.emailSend || false;
  });
  
  function handleChange(field: string, value: unknown) {
    // Validate archiving policy
    if (field === 'retain' && value === true && !archivePolicyId) {
      errors.archivePolicyId = 'Archiving policy is required when retaining recordings';
    } else if (field === 'archivePolicyId' || field === 'archivingPolicyId') {
      delete errors.archivePolicyId;
    }
    
    // Validate email
    if (field === 'emailSend' && value === true && emailToAddresses) {
      const emails = emailToAddresses.split(',').map(e => e.trim());
      const invalidEmails = emails.filter(e => e && !isValidEmail(e));
      if (invalidEmails.length > 0) {
        errors.emailToAddresses = 'Invalid email address(es)';
      }
    } else if (field === 'emailToAddresses') {
      if (emailSend && value) {
        const emails = String(value).split(',').map(e => e.trim());
        const invalidEmails = emails.filter(e => e && !isValidEmail(e));
        if (invalidEmails.length > 0) {
          errors.emailToAddresses = 'Invalid email address(es)';
        } else {
          delete errors.emailToAddresses;
        }
      }
    }
    
    onChange(field, value);
  }
  
  // Get language options based on transcription engine
  const languageOptions = $derived(() => {
    return transcriptionEngine === 'VOICEBASE' ? VOICEBASE_LANGUAGES : DEEPGRAM_LANGUAGES;
  });
</script>

<div class="config-section">
  <h4 class="section-title">{isRecordAndAnalyse ? 'Record & Analyse' : 'Record Call'} Settings</h4>
  
  {#if isRecordAndAnalyse}
    <!-- Tab Navigation for Record & Analyse -->
    <div class="tab-nav mb-4">
      <button class="tab-btn" class:active={activeTab === 'record'} onclick={() => activeTab = 'record'}>
        Record
      </button>
      <button class="tab-btn" class:active={activeTab === 'aiAdvisor'} onclick={() => activeTab = 'aiAdvisor'}>
        AI Advisor
      </button>
    </div>
  {/if}
  
  <!-- RECORD Tab -->
  {#if !isRecordAndAnalyse || activeTab === 'record'}
    <div class="space-y-4">
      <!-- Retain Recording -->
      <div class="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="retain" 
          class="config-checkbox"
          bind:checked={retain}
          onchange={() => handleChange('retain', retain)}
        />
        <label for="retain" class="text-sm font-medium">Retain a copy of the recording</label>
      </div>
      
      {#if retain}
        <div>
          <label class="config-label">
            Archiving Policy <span class="text-red-500">*</span>
          </label>
          <select 
            class="config-select"
            class:border-red-500={errors.archivePolicyId}
            bind:value={archivePolicyId}
            onchange={() => handleChange(isRecordAndAnalyse ? 'archivingPolicyId' : 'archivePolicyId', archivePolicyId)}
          >
            <option value="">Select policy...</option>
            {#each archivingPolicies as policy}
              <option value={policy.id}>{policy.name}</option>
            {/each}
          </select>
          {#if errors.archivePolicyId}
            <p class="text-xs text-red-500 mt-1">{errors.archivePolicyId}</p>
          {/if}
        </div>
      {/if}
      
      <!-- Recording Channel -->
      <div>
        <label class="config-label">Recording Channel</label>
        <select 
          class="config-select"
          bind:value={channel}
          onchange={() => handleChange('channel', channel)}
        >
          {#each CHANNEL_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      
      <!-- Start Recording -->
      {#if isRecordAndAnalyse}
        <div>
          <label class="config-label">Start Recording</label>
          <select 
            class="config-select"
            bind:value={startRecording}
            onchange={() => handleChange('startRecording', startRecording)}
          >
            {#each RECORDING_START_OPTIONS as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
      {:else}
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="startOnBridge" 
            class="config-checkbox"
            bind:checked={startOnBridge}
            onchange={() => handleChange('startOnBridge', startOnBridge)}
          />
          <label for="startOnBridge" class="text-sm">Start on Bridge (when connected)</label>
        </div>
      {/if}
      
      <!-- Pause/Stop Options -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="allowPause" 
            class="config-checkbox"
            bind:checked={allowPause}
            onchange={() => handleChange(isRecordAndAnalyse ? 'pauseAllowed' : 'allowPause', allowPause)}
          />
          <label for="allowPause" class="text-sm">Allow Pause</label>
        </div>
        
        {#if isRecordAndAnalyse}
          <div class="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="stopAllowed" 
              class="config-checkbox"
              bind:checked={stopAllowed}
              onchange={() => handleChange('stopAllowed', stopAllowed)}
            />
            <label for="stopAllowed" class="text-sm">Allow Stop</label>
          </div>
        {/if}
      </div>
      
      <!-- Beep Alert -->
      <div>
        <label class="config-label">Beep Alert</label>
        <select 
          class="config-select"
          bind:value={beep}
          onchange={() => handleChange(isRecordAndAnalyse ? 'beepAlert' : 'beep', beep)}
        >
          {#each BEEP_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      
      {#if beep !== 'OFF' && !isRecordAndAnalyse}
        <div>
          <label class="config-label">Tone Stream (TGML)</label>
          <input 
            type="text" 
            class="config-input"
            bind:value={toneStream}
            onchange={() => handleChange('toneStream', toneStream)}
            placeholder="%(500,0,800)"
          />
          <p class="text-xs text-surface-500 mt-1">TGML format for custom beep tone</p>
        </div>
      {/if}
      
      <!-- Email Notification (recordCall only) -->
      {#if !isRecordAndAnalyse}
        <div class="border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
          <div class="flex items-center gap-2 mb-3">
            <input 
              type="checkbox" 
              id="emailSend" 
              class="config-checkbox"
              bind:checked={emailSend}
              onchange={() => handleChange('emailSend', emailSend)}
            />
            <label for="emailSend" class="text-sm font-medium">Send Email Notification</label>
          </div>
          
          {#if emailSend}
            <div class="space-y-3">
              <div>
                <label class="config-label">To Addresses</label>
                <input 
                  type="text" 
                  class="config-input"
                  class:border-red-500={errors.emailToAddresses}
                  bind:value={emailToAddresses}
                  onchange={() => handleChange('emailToAddresses', emailToAddresses)}
                  placeholder="user@example.com, another@example.com"
                />
                {#if errors.emailToAddresses}
                  <p class="text-xs text-red-500 mt-1">{errors.emailToAddresses}</p>
                {:else}
                  <p class="text-xs text-surface-500 mt-1">Comma-separated email addresses</p>
                {/if}
              </div>
              
              <div>
                <label class="config-label">CC Addresses</label>
                <input 
                  type="text" 
                  class="config-input"
                  bind:value={emailCcAddresses}
                  onchange={() => handleChange('emailCcAddresses', emailCcAddresses)}
                  placeholder="cc@example.com"
                />
              </div>
              
              <div>
                <label class="config-label">Subject</label>
                <input 
                  type="text" 
                  class="config-input"
                  bind:value={emailSubject}
                  onchange={() => handleChange('emailSubject', emailSubject)}
                  placeholder="Call Recording: \u007Bcaller_name\u007D"
                />
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- AI ADVISOR Tab (recordAndAnalyse only) -->
  {#if isRecordAndAnalyse && activeTab === 'aiAdvisor'}
    <div class="space-y-4">
      <p class="text-xs text-surface-500">
        Configure AI-powered transcription and analysis settings.
      </p>
      
      <!-- Insight Configuration -->
      <div>
        <label class="config-label">Insight Configuration</label>
        <select 
          class="config-select"
          bind:value={insightConfig}
          onchange={() => handleChange('insightConfig', insightConfig)}
        >
          {#each INSIGHT_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      
      {#if insightConfig !== 'NONE'}
        <!-- Transcription Engine -->
        <div>
          <label class="config-label">Transcription Engine</label>
          <select 
            class="config-select"
            bind:value={transcriptionEngine}
            onchange={() => {
              handleChange('transcriptionEngine', transcriptionEngine);
              // Reset language when engine changes
              analysisLanguage = transcriptionEngine === 'VOICEBASE' ? 'en-US' : 'en';
              handleChange('analysisLanguage', analysisLanguage);
            }}
          >
            {#each TRANSCRIPTION_ENGINE_OPTIONS as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        
        <!-- Analysis Language -->
        <div>
          <label class="config-label">Analysis Language</label>
          <select 
            class="config-select"
            bind:value={analysisLanguage}
            onchange={() => handleChange('analysisLanguage', analysisLanguage)}
          >
            {#each languageOptions() as lang}
              <option value={lang.value}>{lang.label}</option>
            {/each}
          </select>
        </div>
        
        <!-- Analysis Leg -->
        <div>
          <label class="config-label">Analysis Channel</label>
          <select 
            class="config-select"
            bind:value={analysisLeg}
            onchange={() => handleChange('analysisLeg', analysisLeg)}
          >
            {#each CHANNEL_OPTIONS as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        
        <!-- Disable Summarization -->
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="disableSummarization" 
            class="config-checkbox"
            bind:checked={disableSummarization}
            onchange={() => handleChange('disableSummarization', disableSummarization)}
          />
          <label for="disableSummarization" class="text-sm">Disable Summarization</label>
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
  .tab-btn.active { color: rgb(var(--color-primary-600)); background-color: rgb(var(--color-primary-50)); }
  :global(.dark) .tab-btn.active { color: rgb(var(--color-primary-400)); background-color: rgba(var(--color-primary-500), 0.2); }
  
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

