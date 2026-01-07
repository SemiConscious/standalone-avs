<script lang="ts">
  /**
   * Speak App Configuration Component
   * 
   * Data Sources:
   * - Voice list: Static from defaults.ts (SPEAK_VOICE_LIST)
   * 
   * Validation:
   * - sayPhrase: Required (non-empty)
   * - voice: Must be valid voice code from list
   * 
   * Storage Location:
   * - node.variables.voice
   * - node.variables.sayPhrase
   */
  
  import { SPEAK_VOICE_LIST, DEFAULT_VOICE } from '$lib/policy-editor/defaults';
  
  interface Props {
    config: {
      voice?: string;
      sayPhrase?: string;
    };
    onChange: (field: string, value: unknown) => void;
  }
  
  let { config, onChange }: Props = $props();
  
  // Local state bound to config
  let voice = $state(config.voice || DEFAULT_VOICE);
  let sayPhrase = $state(config.sayPhrase || '');
  
  // Validation state
  let errors = $state<Record<string, string>>({});
  
  // Update local state when config changes
  $effect(() => {
    voice = config.voice || DEFAULT_VOICE;
    sayPhrase = config.sayPhrase || '';
  });
  
  function handleVoiceChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    voice = target.value;
    onChange('voice', voice);
  }
  
  function handlePhraseChange() {
    // Validate
    if (!sayPhrase.trim()) {
      errors.sayPhrase = 'Text to speak is required';
    } else {
      delete errors.sayPhrase;
    }
    onChange('sayPhrase', sayPhrase);
  }
  
  // Group voices by language for better organization
  const voicesByLanguage = $derived(() => {
    const groups: Record<string, typeof SPEAK_VOICE_LIST[number][]> = {};
    for (const v of SPEAK_VOICE_LIST) {
      const lang = v.language.split('-')[0].toUpperCase();
      if (!groups[lang]) groups[lang] = [];
      groups[lang].push(v);
    }
    return groups;
  });
</script>

<div class="config-section">
  <h4 class="section-title">Speak Settings</h4>
  
  <div class="space-y-4">
    <!-- Voice Selection -->
    <div>
      <label class="config-label" for="voice-select">
        Voice
        <span class="text-xs text-surface-500 ml-1">({SPEAK_VOICE_LIST.length} voices available)</span>
      </label>
      <select 
        id="voice-select"
        class="config-select"
        value={voice}
        onchange={handleVoiceChange}
      >
        {#each Object.entries(voicesByLanguage()) as [lang, voices]}
          <optgroup label={lang}>
            {#each voices as v}
              <option value={v.value}>{v.label}</option>
            {/each}
          </optgroup>
        {/each}
      </select>
      <p class="text-xs text-surface-500 mt-1">
        Select a text-to-speech voice for the spoken message.
      </p>
    </div>
    
    <!-- Text to Speak -->
    <div>
      <label class="config-label" for="say-phrase">
        Text to Speak <span class="text-red-500">*</span>
      </label>
      <textarea 
        id="say-phrase"
        bind:value={sayPhrase}
        onchange={handlePhraseChange}
        placeholder="Enter the phrase you want to say..."
        rows="4"
        class="config-input resize-none"
        class:border-red-500={errors.sayPhrase}
      ></textarea>
      {#if errors.sayPhrase}
        <p class="text-xs text-red-500 mt-1">{errors.sayPhrase}</p>
      {:else}
        <p class="text-xs text-surface-500 mt-1">
          Use <code class="bg-surface-200 dark:bg-surface-700 px-1 rounded">{'{property}'}</code> syntax to include dynamic values.
          For example: <code class="bg-surface-200 dark:bg-surface-700 px-1 rounded">{'{caller_name}'}</code>
        </p>
      {/if}
    </div>
    
    <!-- Preview of selected voice -->
    {#if voice}
      {@const selectedVoice = SPEAK_VOICE_LIST.find(v => v.value === voice)}
      {#if selectedVoice}
        <div class="p-3 bg-surface-100 dark:bg-surface-700 rounded-md">
          <p class="text-xs font-medium text-surface-600 dark:text-surface-300">Selected Voice</p>
          <p class="text-sm mt-1">{selectedVoice.label}</p>
          <p class="text-xs text-surface-500 mt-0.5">
            Language: {selectedVoice.language} • Gender: {selectedVoice.gender}
          </p>
        </div>
      {/if}
    {/if}
  </div>
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
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  
  :global(.dark) .config-input {
    background-color: rgb(var(--color-surface-900));
    border-color: rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-100));
  }
  
  .config-input:focus {
    outline: none;
    border-color: rgb(var(--color-primary-500));
    box-shadow: 0 0 0 2px rgba(var(--color-primary-500), 0.2);
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
  
  .config-select:focus {
    outline: none;
    border-color: rgb(var(--color-primary-500));
    box-shadow: 0 0 0 2px rgba(var(--color-primary-500), 0.2);
  }
</style>

