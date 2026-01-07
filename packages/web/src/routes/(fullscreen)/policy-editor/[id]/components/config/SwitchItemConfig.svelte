<script lang="ts">
  /**
   * Switch Item & Get Info App Configuration Component
   * 
   * Data Sources:
   * - DTMF tones: Static from defaults.ts
   * - Pattern assign options: Static from defaults.ts
   * 
   * Validation:
   * - tone: Required for SwitchItem
   * - pattern: Must be valid regex if provided
   * 
   * Storage Location:
   * - node.variables.itemPhrase
   * - node.variables.tone
   * - node.variables.pattern
   * - node.variables.patternAssignTo
   * - node.variables.patternAssignType (GetInfo only)
   * - node.variables.patternAssignMacro (GetInfo only)
   * - node.variables.selectedPhrase
   * - node.variables.callerIdName
   * 
   * This component handles both 'switchItem' and 'getInfo' types
   */
  
  import { 
    DTMF_TONE_OPTIONS,
    PATTERN_ASSIGN_TO_OPTIONS,
    PATTERN_ASSIGN_TYPE_OPTIONS,
    isValidRegex
  } from '$lib/policy-editor/defaults';
  
  interface Props {
    config: {
      itemPhrase?: string;
      tone?: string;
      pattern?: string;
      patternAssignTo?: string;
      patternAssignType?: string;
      patternAssignMacro?: string;
      selectedPhrase?: string;
      callerIdName?: string;
    };
    isGetInfo?: boolean;
    onChange: (field: string, value: unknown) => void;
  }
  
  let { config, isGetInfo = false, onChange }: Props = $props();
  
  // Local state
  let itemPhrase = $state(config.itemPhrase || '');
  let tone = $state(config.tone || '1');
  let pattern = $state(config.pattern || '');
  let patternAssignTo = $state(config.patternAssignTo || 'NONE');
  let patternAssignType = $state(config.patternAssignType || 'VALUE');
  let patternAssignMacro = $state(config.patternAssignMacro || '');
  let selectedPhrase = $state(config.selectedPhrase || '');
  let callerIdName = $state(config.callerIdName || '');
  
  // Validation
  let errors = $state<Record<string, string>>({});
  
  $effect(() => {
    itemPhrase = config.itemPhrase || '';
    tone = config.tone || '1';
    pattern = config.pattern || '';
    patternAssignTo = config.patternAssignTo || 'NONE';
    patternAssignType = config.patternAssignType || 'VALUE';
    patternAssignMacro = config.patternAssignMacro || '';
    selectedPhrase = config.selectedPhrase || '';
    callerIdName = config.callerIdName || '';
  });
  
  function handleChange(field: string, value: unknown) {
    // Validate pattern as regex
    if (field === 'pattern' && value) {
      if (!isValidRegex(String(value))) {
        errors.pattern = 'Invalid regex pattern';
      } else {
        delete errors.pattern;
      }
    }
    onChange(field, value);
  }
</script>

<div class="config-section">
  <h4 class="section-title">{isGetInfo ? 'Get Info' : 'Switch Item'} Settings</h4>
  
  <div class="space-y-4">
    <!-- Item Phrase (TTS prompt) -->
    <div>
      <label class="config-label">
        {isGetInfo ? 'Prompt' : 'Menu Option'} (TTS)
      </label>
      <textarea 
        class="config-input resize-none"
        rows="2"
        bind:value={itemPhrase}
        onchange={() => handleChange('itemPhrase', itemPhrase)}
        placeholder={isGetInfo 
          ? 'Please enter your account number...' 
          : 'Press 1 for Sales...'}
      ></textarea>
      <p class="text-xs text-surface-500 mt-1">
        Text-to-speech prompt played to the caller.
      </p>
    </div>
    
    <!-- DTMF Tone (for SwitchItem) -->
    {#if !isGetInfo}
      <div>
        <label class="config-label">DTMF Tone <span class="text-red-500">*</span></label>
        <select 
          class="config-select"
          bind:value={tone}
          onchange={() => handleChange('tone', tone)}
        >
          {#each DTMF_TONE_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <p class="text-xs text-surface-500 mt-1">
          The key press that activates this menu option.
        </p>
      </div>
    {/if}
    
    <!-- Pattern (for speech recognition) -->
    <div>
      <label class="config-label">
        Speech Pattern {isGetInfo ? '' : '(Optional)'}
      </label>
      <input 
        type="text" 
        class="config-input"
        class:border-red-500={errors.pattern}
        bind:value={pattern}
        onchange={() => handleChange('pattern', pattern)}
        placeholder="sales|support|billing"
      />
      {#if errors.pattern}
        <p class="text-xs text-red-500 mt-1">{errors.pattern}</p>
      {:else}
        <p class="text-xs text-surface-500 mt-1">
          Regex pattern to match spoken words. Use | for alternatives.
        </p>
      {/if}
    </div>
    
    <!-- Pattern Assign To -->
    <div>
      <label class="config-label">Store Matched Value In</label>
      <select 
        class="config-select"
        bind:value={patternAssignTo}
        onchange={() => handleChange('patternAssignTo', patternAssignTo)}
      >
        {#each PATTERN_ASSIGN_TO_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    
    <!-- Pattern Assign Type & Macro (GetInfo only) -->
    {#if isGetInfo && patternAssignTo !== 'NONE'}
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="config-label text-xs">Store As</label>
          <select 
            class="config-select"
            bind:value={patternAssignType}
            onchange={() => handleChange('patternAssignType', patternAssignType)}
          >
            {#each PATTERN_ASSIGN_TYPE_OPTIONS as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        
        {#if patternAssignType === 'MACRO'}
          <div>
            <label class="config-label text-xs">Macro Variable Name</label>
            <input 
              type="text" 
              class="config-input"
              bind:value={patternAssignMacro}
              onchange={() => handleChange('patternAssignMacro', patternAssignMacro)}
              placeholder="user_input"
            />
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- Selected Phrase (confirmation TTS) -->
    <div>
      <label class="config-label">Confirmation Phrase (TTS)</label>
      <textarea 
        class="config-input resize-none"
        rows="2"
        bind:value={selectedPhrase}
        onchange={() => handleChange('selectedPhrase', selectedPhrase)}
        placeholder={isGetInfo 
          ? "You entered \u007Binput\u007D. Is that correct?" 
          : 'Connecting you to Sales...'}
      ></textarea>
      <p class="text-xs text-surface-500 mt-1">
        Played after the option is selected or input is received.
      </p>
    </div>
    
    <!-- Caller ID Name Override -->
    <div>
      <label class="config-label">Caller ID Name Override</label>
      <input 
        type="text" 
        class="config-input"
        bind:value={callerIdName}
        onchange={() => handleChange('callerIdName', callerIdName)}
        placeholder="Leave empty to use original"
      />
      <p class="text-xs text-surface-500 mt-1">
        Override the caller ID name for subsequent actions. Supports macros.
      </p>
    </div>
  </div>
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
</style>

