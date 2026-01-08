<script lang="ts">
  /**
   * Call Queue App Configuration Component
   * 
   * Data Sources:
   * - Queue algorithms: Static from defaults.ts
   * - Hold music presets: Salesforce Preset__c (passed as prop)
   * - Ring targets: Salesforce Group__c (passed as prop)
   * - Skills: Salesforce Skill__c (passed as prop)
   * 
   * Validation:
   * - ringTargets: At least 1 group required
   * - holdMusic: Required if holdMusicType is PRESET
   * 
   * Storage Location:
   * - node.variables.ringTargets
   * - node.config.* (various configuration fields)
   * - node.configScreen.* (screen pop settings)
   * 
   * Tabs: GROUPS, PROPERTIES, ANNOUNCEMENTS, SCREEN, CALLBACK
   */
  
  import { 
    QUEUE_ALGORITHM_TYPES, 
    HOLD_MUSIC_TYPES, 
    EXIT_KEYS,
    WRAP_UP_TYPES,
    ANNOUNCEMENT_TYPES,
    CHIME_FORMAT_OPTIONS,
    KEY_OPTIONS,
    CALLBACK_ACTIVATION_KEYS,
    ACL_OPTIONS,
    CLI_PRESENTATION_OPTIONS,
    MAX_CALLBACK_ATTEMPTS,
    SKILL_MODE_OPTIONS,
    SKILL_ALGORITHM_OPTIONS,
    DEFAULT_CONFIG
  } from '$lib/policy-editor/defaults';
  
  interface GroupData {
    id: string;
    name: string;
  }
  
  interface SoundData {
    id: string;
    name: string;
  }
  
  interface RingTarget {
    groupId: string;
    groupName: string;
    distribution?: string;
    priority?: number;
  }
  
  interface Announcement {
    type: 'TTS' | 'SOUND';
    content: string;
    soundId?: string;
    interval?: number;
  }
  
  interface CallbackConfig {
    enabled: boolean;
    activationKey: string;
    aclOption: string;
    cliPresentation: string;
    maxAttempts: number;
    customNumber?: string;
  }
  
  interface ScreenConfig {
    enabled: boolean;
    announcement: string;
    acceptKey: string;
    waitForResponse: number;
    repeat: number;
  }
  
  interface Props {
    config: {
      queueAlgorithm?: string;
      holdMusicType?: string;
      holdMusic?: string;
      exitKey?: string;
      wrapUpType?: string;
      ringTargets?: RingTarget[];
      announcements?: Announcement[];
      screen?: ScreenConfig;
      callback?: CallbackConfig;
      skillMode?: string;
      skillAlgorithm?: string;
    };
    groups?: GroupData[];
    sounds?: SoundData[];
    onChange: (field: string, value: unknown) => void;
  }
  
  let { config, groups = [], sounds = [], onChange }: Props = $props();
  
  // Active tab state
  let activeTab = $state<'groups' | 'properties' | 'announcements' | 'screen' | 'callback'>('groups');
  
  // Local state
  let queueAlgorithm = $state(config.queueAlgorithm || DEFAULT_CONFIG.callQueue.queueAlgorithm);
  let holdMusicType = $state(config.holdMusicType || DEFAULT_CONFIG.callQueue.holdMusicType);
  let holdMusic = $state(config.holdMusic || '');
  let exitKey = $state(config.exitKey || '');
  let wrapUpType = $state(config.wrapUpType || DEFAULT_CONFIG.callQueue.wrapUpType);
  let ringTargets = $state<RingTarget[]>(config.ringTargets || []);
  let announcements = $state<Announcement[]>(config.announcements || []);
  let screenEnabled = $state(config.screen?.enabled || false);
  let screenAnnouncement = $state(config.screen?.announcement || '');
  let screenAcceptKey = $state(config.screen?.acceptKey || '1');
  let screenWaitForResponse = $state(config.screen?.waitForResponse || 10);
  let screenRepeat = $state(config.screen?.repeat || 3);
  let callbackEnabled = $state(config.callback?.enabled || false);
  let callbackActivationKey = $state(config.callback?.activationKey || '#');
  let callbackAclOption = $state(config.callback?.aclOption || 'CALLER_ID');
  let callbackCliPresentation = $state(config.callback?.cliPresentation || 'CALLER_ID');
  let callbackMaxAttempts = $state(config.callback?.maxAttempts || 3);
  let skillMode = $state(config.skillMode || 'BUILT_IN');
  let skillAlgorithm = $state(config.skillAlgorithm || 'SUM');
  
  // Validation state
  let errors = $state<Record<string, string>>({});
  
  // Check if skills-based routing is enabled
  const isSkillsBased = $derived(queueAlgorithm === 'SKILLS_BASED' || ringTargets.some(t => t.distribution === 'SKILLS'));
  
  // Update local state when config changes
  $effect(() => {
    queueAlgorithm = config.queueAlgorithm || DEFAULT_CONFIG.callQueue.queueAlgorithm;
    holdMusicType = config.holdMusicType || DEFAULT_CONFIG.callQueue.holdMusicType;
    holdMusic = config.holdMusic || '';
    exitKey = config.exitKey || '';
    wrapUpType = config.wrapUpType || DEFAULT_CONFIG.callQueue.wrapUpType;
    ringTargets = config.ringTargets || [];
    announcements = config.announcements || [];
  });
  
  function handleChange(field: string, value: unknown) {
    onChange(field, value);
  }
  
  function addRingTarget() {
    const newTarget: RingTarget = {
      groupId: '',
      groupName: '',
      distribution: 'ROUND_ROBIN',
      priority: ringTargets.length + 1
    };
    ringTargets = [...ringTargets, newTarget];
    handleChange('ringTargets', ringTargets);
  }
  
  function removeRingTarget(index: number) {
    ringTargets = ringTargets.filter((_, i) => i !== index);
    handleChange('ringTargets', ringTargets);
  }
  
  function updateRingTarget(index: number, field: string, value: unknown) {
    ringTargets = ringTargets.map((t, i) => {
      if (i === index) {
        if (field === 'groupId') {
          const group = groups.find(g => g.id === value);
          return { ...t, groupId: value as string, groupName: group?.name || '' };
        }
        return { ...t, [field]: value };
      }
      return t;
    });
    handleChange('ringTargets', ringTargets);
  }
  
  function addAnnouncement() {
    const newAnnouncement: Announcement = {
      type: 'TTS',
      content: '',
      interval: 30
    };
    announcements = [...announcements, newAnnouncement];
    handleChange('announcements', announcements);
  }
  
  function removeAnnouncement(index: number) {
    announcements = announcements.filter((_, i) => i !== index);
    handleChange('announcements', announcements);
  }
  
  function updateAnnouncement(index: number, field: string, value: unknown) {
    announcements = announcements.map((a, i) => 
      i === index ? { ...a, [field]: value } : a
    );
    handleChange('announcements', announcements);
  }
  
  function saveScreenConfig() {
    handleChange('screen', {
      enabled: screenEnabled,
      announcement: screenAnnouncement,
      acceptKey: screenAcceptKey,
      waitForResponse: screenWaitForResponse,
      repeat: screenRepeat
    });
  }
  
  function saveCallbackConfig() {
    handleChange('callback', {
      enabled: callbackEnabled,
      activationKey: callbackActivationKey,
      aclOption: callbackAclOption,
      cliPresentation: callbackCliPresentation,
      maxAttempts: callbackMaxAttempts
    });
  }
</script>

<div class="config-section">
  <h4 class="section-title">Call Queue Settings</h4>
  
  <!-- Tab Navigation -->
  <div class="tab-nav mb-4">
    <button 
      class="tab-btn" 
      class:active={activeTab === 'groups'}
      onclick={() => activeTab = 'groups'}
    >
      Groups
    </button>
    <button 
      class="tab-btn" 
      class:active={activeTab === 'properties'}
      onclick={() => activeTab = 'properties'}
    >
      Properties
    </button>
    <button 
      class="tab-btn" 
      class:active={activeTab === 'announcements'}
      onclick={() => activeTab = 'announcements'}
    >
      Announcements
    </button>
    <button 
      class="tab-btn" 
      class:active={activeTab === 'screen'}
      onclick={() => activeTab = 'screen'}
    >
      Screen
    </button>
    <button 
      class="tab-btn" 
      class:active={activeTab === 'callback'}
      onclick={() => activeTab = 'callback'}
    >
      Callback
    </button>
  </div>
  
  <!-- GROUPS Tab -->
  {#if activeTab === 'groups'}
    <div class="space-y-4">
      <!-- Ring Targets -->
      <div>
        <label class="config-label">
          Ring Targets (Groups) <span class="text-red-500">*</span>
        </label>
        
        {#if ringTargets.length === 0}
          <p class="text-xs text-surface-500 italic mb-2">No groups configured. Add at least one group.</p>
        {/if}
        
        {#each ringTargets as target, index}
          <div class="flex gap-2 mb-2 items-center">
            <select 
              class="config-select flex-1"
              value={target.groupId}
              onchange={(e) => updateRingTarget(index, 'groupId', (e.target as HTMLSelectElement).value)}
            >
              <option value="">Select group...</option>
              {#each groups as group}
                <option value={group.id}>{group.name}</option>
              {/each}
            </select>
            <select 
              class="config-select w-32"
              value={target.distribution}
              onchange={(e) => updateRingTarget(index, 'distribution', (e.target as HTMLSelectElement).value)}
            >
              {#each QUEUE_ALGORITHM_TYPES as algo}
                <option value={algo.value}>{algo.label}</option>
              {/each}
            </select>
            <button 
              class="delete-btn"
              onclick={() => removeRingTarget(index)}
              title="Remove group"
            >
              ×
            </button>
          </div>
        {/each}
        
        <button class="add-btn" onclick={addRingTarget}>
          + Add Group
        </button>
      </div>
      
      <!-- Skill Mode (if skills-based routing) -->
      {#if isSkillsBased}
        <div class="skill-options p-3 bg-surface-100 dark:bg-surface-700 rounded-md">
          <p class="text-xs font-medium text-surface-600 dark:text-surface-300 mb-2">Skills-Based Routing Options</p>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="config-label text-xs">Skill Mode</label>
              <select 
                class="config-select"
                bind:value={skillMode}
                onchange={() => handleChange('skillMode', skillMode)}
              >
                {#each SKILL_MODE_OPTIONS as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>
            <div>
              <label class="config-label text-xs">Skill Algorithm</label>
              <select 
                class="config-select"
                bind:value={skillAlgorithm}
                onchange={() => handleChange('skillAlgorithm', skillAlgorithm)}
              >
                {#each SKILL_ALGORITHM_OPTIONS as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- PROPERTIES Tab -->
  {#if activeTab === 'properties'}
    <div class="space-y-4">
      <!-- Queue Algorithm -->
      <div>
        <label class="config-label">Queue Algorithm</label>
        <select 
          class="config-select"
          bind:value={queueAlgorithm}
          onchange={() => handleChange('queueAlgorithm', queueAlgorithm)}
        >
          {#each QUEUE_ALGORITHM_TYPES as algo}
            <option value={algo.value}>{algo.label}</option>
          {/each}
        </select>
        <p class="text-xs text-surface-500 mt-1">
          {QUEUE_ALGORITHM_TYPES.find(a => a.value === queueAlgorithm)?.description || ''}
        </p>
      </div>
      
      <!-- Hold Music -->
      <div>
        <label class="config-label">Hold Music Type</label>
        <select 
          class="config-select"
          bind:value={holdMusicType}
          onchange={() => handleChange('holdMusicType', holdMusicType)}
        >
          {#each HOLD_MUSIC_TYPES as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
      </div>
      
      {#if holdMusicType === 'PRESET'}
        <div>
          <label class="config-label">Hold Music Preset</label>
          <select 
            class="config-select"
            bind:value={holdMusic}
            onchange={() => handleChange('holdMusic', holdMusic)}
          >
            <option value="">Select preset...</option>
            {#each sounds as sound}
              <option value={sound.id}>{sound.name}</option>
            {/each}
          </select>
        </div>
      {/if}
      
      <!-- Exit Key -->
      <div>
        <label class="config-label">Exit Key (Queue Escape)</label>
        <select 
          class="config-select"
          bind:value={exitKey}
          onchange={() => handleChange('exitKey', exitKey)}
        >
          {#each EXIT_KEYS as key}
            <option value={key.value}>{key.label}</option>
          {/each}
        </select>
        <p class="text-xs text-surface-500 mt-1">
          Allow callers to press this key to exit the queue.
        </p>
      </div>
      
      <!-- Wrap Up Type -->
      <div>
        <label class="config-label">Wrap Up Type</label>
        <select 
          class="config-select"
          bind:value={wrapUpType}
          onchange={() => handleChange('wrapUpType', wrapUpType)}
        >
          {#each WRAP_UP_TYPES as type}
            <option value={type.value}>{type.label}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}
  
  <!-- ANNOUNCEMENTS Tab -->
  {#if activeTab === 'announcements'}
    <div class="space-y-4">
      <p class="text-xs text-surface-500 mb-2">
        Configure periodic announcements played to callers while waiting in the queue.
      </p>
      
      {#each announcements as announcement, index}
        <div class="announcement-item p-3 bg-surface-100 dark:bg-surface-700 rounded-md">
          <div class="flex justify-between items-center mb-2">
            <span class="text-xs font-medium">Announcement {index + 1}</span>
            <button 
              class="text-red-500 text-xs"
              onclick={() => removeAnnouncement(index)}
            >
              Remove
            </button>
          </div>
          
          <div class="space-y-3">
            <div>
              <label class="config-label text-xs">Type</label>
              <select 
                class="config-select"
                value={announcement.type}
                onchange={(e) => updateAnnouncement(index, 'type', (e.target as HTMLSelectElement).value)}
              >
                {#each ANNOUNCEMENT_TYPES as type}
                  <option value={type.value}>{type.label}</option>
                {/each}
              </select>
            </div>
            
            {#if announcement.type === 'TTS'}
              <div>
                <label class="config-label text-xs">Text</label>
                <textarea 
                  class="config-input resize-none"
                  rows="2"
                  value={announcement.content}
                  onchange={(e) => updateAnnouncement(index, 'content', (e.target as HTMLTextAreaElement).value)}
                  placeholder="Your call is important to us..."
                ></textarea>
              </div>
            {:else}
              <div>
                <label class="config-label text-xs">Sound File</label>
                <select 
                  class="config-select"
                  value={announcement.soundId}
                  onchange={(e) => updateAnnouncement(index, 'soundId', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">Select sound...</option>
                  {#each sounds as sound}
                    <option value={sound.id}>{sound.name}</option>
                  {/each}
                </select>
              </div>
            {/if}
            
            <div>
              <label class="config-label text-xs">Interval (seconds)</label>
              <input 
                type="number" 
                class="config-input" 
                value={announcement.interval}
                onchange={(e) => updateAnnouncement(index, 'interval', parseInt((e.target as HTMLInputElement).value))}
                min="10"
                max="300"
              />
            </div>
          </div>
        </div>
      {/each}
      
      <button class="add-btn" onclick={addAnnouncement}>
        + Add Announcement
      </button>
    </div>
  {/if}
  
  <!-- SCREEN Tab -->
  {#if activeTab === 'screen'}
    <div class="space-y-4">
      <p class="text-xs text-surface-500 mb-2">
        Screen pop settings - announce the call to agents before connecting.
      </p>
      
      <div class="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="screen-enabled" 
          class="config-checkbox"
          bind:checked={screenEnabled}
          onchange={saveScreenConfig}
        />
        <label for="screen-enabled" class="config-label !mb-0">Enable Screen Pop</label>
      </div>
      
      {#if screenEnabled}
        <div class="space-y-3">
          <div>
            <label class="config-label">Announcement</label>
            <textarea 
              class="config-input resize-none"
              rows="2"
              bind:value={screenAnnouncement}
              onchange={saveScreenConfig}
              placeholder="You have an incoming call from \u007Bcaller_name\u007D..."
            ></textarea>
          </div>
          
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="config-label text-xs">Accept Key</label>
              <select 
                class="config-select"
                bind:value={screenAcceptKey}
                onchange={saveScreenConfig}
              >
                {#each KEY_OPTIONS as key}
                  <option value={key.value}>{key.label}</option>
                {/each}
              </select>
            </div>
            <div>
              <label class="config-label text-xs">Wait (sec)</label>
              <input 
                type="number" 
                class="config-input"
                bind:value={screenWaitForResponse}
                onchange={saveScreenConfig}
                min="5"
                max="60"
              />
            </div>
            <div>
              <label class="config-label text-xs">Repeat</label>
              <input 
                type="number" 
                class="config-input"
                bind:value={screenRepeat}
                onchange={saveScreenConfig}
                min="1"
                max="10"
              />
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- CALLBACK Tab -->
  {#if activeTab === 'callback'}
    <div class="space-y-4">
      <p class="text-xs text-surface-500 mb-2">
        Allow callers to request a callback instead of waiting in the queue.
      </p>
      
      {#if !isSkillsBased}
        <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
          <p class="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Callback requires skills-based routing groups.
          </p>
        </div>
      {/if}
      
      <div class="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="callback-enabled" 
          class="config-checkbox"
          bind:checked={callbackEnabled}
          onchange={saveCallbackConfig}
          disabled={!isSkillsBased}
        />
        <label for="callback-enabled" class="config-label !mb-0">Enable Callback</label>
      </div>
      
      {#if callbackEnabled && isSkillsBased}
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="config-label text-xs">Activation Key</label>
              <select 
                class="config-select"
                bind:value={callbackActivationKey}
                onchange={saveCallbackConfig}
              >
                {#each CALLBACK_ACTIVATION_KEYS as key}
                  {#if key.value}
                    <option value={key.value}>{key.label}</option>
                  {/if}
                {/each}
              </select>
            </div>
            <div>
              <label class="config-label text-xs">Max Attempts</label>
              <select 
                class="config-select"
                bind:value={callbackMaxAttempts}
                onchange={saveCallbackConfig}
              >
                {#each MAX_CALLBACK_ATTEMPTS as n}
                  <option value={n}>{n}</option>
                {/each}
              </select>
            </div>
          </div>
          
          <div>
            <label class="config-label text-xs">Callback Number</label>
            <select 
              class="config-select"
              bind:value={callbackAclOption}
              onchange={saveCallbackConfig}
            >
              {#each ACL_OPTIONS as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
          
          <div>
            <label class="config-label text-xs">Outbound Caller ID</label>
            <select 
              class="config-select"
              bind:value={callbackCliPresentation}
              onchange={saveCallbackConfig}
            >
              {#each CLI_PRESENTATION_OPTIONS as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .config-section {
    padding-top: 0.5rem;
  }
  
  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  :global(.dark) .section-title {
    color: rgb(var(--color-surface-400));
  }
  
  .tab-nav {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid rgb(var(--color-surface-300));
    padding-bottom: 0.5rem;
  }
  
  :global(.dark) .tab-nav {
    border-bottom-color: rgb(var(--color-surface-600));
  }
  
  .tab-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(var(--color-surface-500));
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .tab-btn:hover {
    color: rgb(var(--color-surface-700));
    background-color: rgb(var(--color-surface-100));
  }
  
  :global(.dark) .tab-btn:hover {
    color: rgb(var(--color-surface-300));
    background-color: rgb(var(--color-surface-700));
  }
  
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
  
  :global(.dark) .config-label {
    color: rgb(var(--color-surface-400));
  }
  
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
    transition: all 0.15s ease;
  }
  
  :global(.dark) .add-btn {
    color: rgb(var(--color-primary-400));
    background-color: rgba(var(--color-primary-500), 0.1);
    border-color: rgba(var(--color-primary-500), 0.3);
  }
  
  .add-btn:hover {
    background-color: rgb(var(--color-primary-100));
  }
  
  :global(.dark) .add-btn:hover {
    background-color: rgba(var(--color-primary-500), 0.2);
  }
  
  .delete-btn {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    color: rgb(var(--color-surface-500));
    background: transparent;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .delete-btn:hover {
    color: rgb(var(--color-red-500));
    border-color: rgb(var(--color-red-300));
    background-color: rgb(var(--color-red-50));
  }
  
  :global(.dark) .delete-btn {
    border-color: rgb(var(--color-surface-600));
  }
  
  :global(.dark) .delete-btn:hover {
    background-color: rgba(var(--color-red-500), 0.2);
  }
</style>

