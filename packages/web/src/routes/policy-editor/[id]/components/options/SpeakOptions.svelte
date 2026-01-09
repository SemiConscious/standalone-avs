<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { MessageSquare, Volume2, Languages, Play } from 'lucide-svelte';
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'Speak');
  let message = $state(node.data?.message as string || '');
  let voice = $state(node.data?.voice as string || 'en-US-Neural2-C');
  let speed = $state(node.data?.speed as number || 1.0);
  let soundId = $state(node.data?.soundId as string || '');
  let useSound = $state(node.data?.useSound as boolean || false);
  
  const voices = [
    { value: 'en-US-Neural2-C', label: 'English (US) - Female' },
    { value: 'en-US-Neural2-D', label: 'English (US) - Male' },
    { value: 'en-GB-Neural2-A', label: 'English (UK) - Female' },
    { value: 'en-GB-Neural2-B', label: 'English (UK) - Male' },
    { value: 'de-DE-Neural2-A', label: 'German - Female' },
    { value: 'de-DE-Neural2-B', label: 'German - Male' },
    { value: 'fr-FR-Neural2-A', label: 'French - Female' },
    { value: 'fr-FR-Neural2-B', label: 'French - Male' },
    { value: 'es-ES-Neural2-A', label: 'Spanish - Female' },
    { value: 'es-ES-Neural2-B', label: 'Spanish - Male' },
  ];
  
  function handleUpdate() {
    onUpdate({
      label,
      message,
      voice,
      speed,
      soundId,
      useSound,
    });
  }
</script>

<div class="space-y-4">
  <!-- Label -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">Label</label>
    <input
      type="text"
      bind:value={label}
      onblur={handleUpdate}
      class="input w-full"
    />
  </div>
  
  <!-- Source Toggle -->
  <div class="flex rounded-lg overflow-hidden border border-surface-300-700">
    <button
      class="flex-1 py-2 px-3 text-sm font-medium transition-colors
        {!useSound ? 'bg-primary-500 text-white' : 'bg-surface-200-800 text-text-secondary hover:bg-surface-300-700'}"
      onclick={() => { useSound = false; handleUpdate(); }}
    >
      <MessageSquare class="w-4 h-4 inline mr-1" />
      Text-to-Speech
    </button>
    <button
      class="flex-1 py-2 px-3 text-sm font-medium transition-colors
        {useSound ? 'bg-primary-500 text-white' : 'bg-surface-200-800 text-text-secondary hover:bg-surface-300-700'}"
      onclick={() => { useSound = true; handleUpdate(); }}
    >
      <Volume2 class="w-4 h-4 inline mr-1" />
      Audio File
    </button>
  </div>
  
  {#if !useSound}
    <!-- Text-to-Speech Options -->
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        <MessageSquare class="w-4 h-4 inline mr-1" />
        Message
      </label>
      <textarea
        bind:value={message}
        onblur={handleUpdate}
        class="textarea w-full"
        rows="4"
        placeholder="Enter the message to speak..."
      ></textarea>
      <p class="text-xs text-text-secondary mt-1">
        Use {'{{macros}}'} for dynamic values like {'{{caller.name}}'}
      </p>
    </div>
    
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        <Languages class="w-4 h-4 inline mr-1" />
        Voice
      </label>
      <select
        bind:value={voice}
        onchange={handleUpdate}
        class="select w-full"
      >
        {#each voices as v}
          <option value={v.value}>{v.label}</option>
        {/each}
      </select>
    </div>
    
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        Speed: {speed.toFixed(1)}x
      </label>
      <input
        type="range"
        bind:value={speed}
        onchange={handleUpdate}
        class="w-full"
        min="0.5"
        max="2.0"
        step="0.1"
      />
      <div class="flex justify-between text-xs text-text-secondary">
        <span>0.5x</span>
        <span>1.0x</span>
        <span>2.0x</span>
      </div>
    </div>
    
    {#if message}
      <button class="btn btn-sm preset-tonal-primary w-full">
        <Play class="w-4 h-4" />
        Preview
      </button>
    {/if}
  {:else}
    <!-- Audio File Options -->
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        <Volume2 class="w-4 h-4 inline mr-1" />
        Select Sound
      </label>
      <select
        bind:value={soundId}
        onchange={handleUpdate}
        class="select w-full"
      >
        <option value="">Select a sound file...</option>
        {#each context.sounds as sound}
          <option value={sound.id}>{sound.name}</option>
        {/each}
      </select>
    </div>
    
    {#if soundId}
      <button class="btn btn-sm preset-tonal-primary w-full">
        <Play class="w-4 h-4" />
        Preview Sound
      </button>
    {/if}
  {/if}
</div>

