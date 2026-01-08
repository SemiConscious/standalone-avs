<script lang="ts">
  import { Badge, Button } from '$lib/components/ui';
  import { Plus, Trash2, Info } from 'lucide-svelte';
  import { SALESFORCE_OBJECTS, CREATE_RECORD_DEFAULTS } from '$lib/policy-editor/defaults';

  interface Props {
    data: Record<string, unknown>;
    onUpdate: (data: Record<string, unknown>) => void;
  }

  let { data, onUpdate }: Props = $props();

  // Initialize config with defaults
  let config = $state({
    trigger: (data.trigger as string[]) || CREATE_RECORD_DEFAULTS.trigger,
    objectType: (data.objectType as string) || CREATE_RECORD_DEFAULTS.objectType,
    recordTypeId: (data.recordTypeId as string) || '',
    fields: (data.fields as Array<{ field: string; value: string; type: string }>) || CREATE_RECORD_DEFAULTS.fields,
    outputVariable: (data.outputVariable as string) || CREATE_RECORD_DEFAULTS.outputVariable,
    setOwner: (data.setOwner as boolean) ?? false,
    ownerId: (data.ownerId as string) || '',
  });

  function handleChange() {
    onUpdate({
      ...data,
      ...config,
    });
  }

  function addField() {
    config.fields = [...config.fields, { field: '', value: '', type: 'text' }];
    handleChange();
  }

  function removeField(index: number) {
    config.fields = config.fields.filter((_, i) => i !== index);
    handleChange();
  }

  function updateField(index: number, key: 'field' | 'value' | 'type', value: string) {
    config.fields[index][key] = value;
    handleChange();
  }

  const triggerOptions = [
    { value: 'ANSWERED', label: 'On Answer' },
    { value: 'NO_ANSWER', label: 'On No Answer' },
    { value: 'BUSY', label: 'On Busy' },
    { value: 'FAILED', label: 'On Failed' },
  ];

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'variable', label: 'Variable' },
    { value: 'token', label: 'Token' },
  ];

  // Token options for field values
  const tokenOptions = [
    { value: '{{caller.ani}}', label: 'Caller ANI' },
    { value: '{{caller.dnis}}', label: 'Called Number (DNIS)' },
    { value: '{{call.id}}', label: 'Call ID' },
    { value: '{{call.duration}}', label: 'Call Duration' },
    { value: '{{call.startTime}}', label: 'Call Start Time' },
    { value: '{{user.id}}', label: 'User ID' },
    { value: '{{user.name}}', label: 'User Name' },
    { value: '{{queue.waitTime}}', label: 'Queue Wait Time' },
  ];
</script>

<div class="space-y-4">
  <!-- Trigger Selection -->
  <div>
    <label class="block text-sm font-medium mb-2">Trigger</label>
    <div class="flex flex-wrap gap-2">
      {#each triggerOptions as option}
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.trigger.includes(option.value)}
            onchange={(e) => {
              if (e.currentTarget.checked) {
                config.trigger = [...config.trigger, option.value];
              } else {
                config.trigger = config.trigger.filter(t => t !== option.value);
              }
              handleChange();
            }}
            class="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <span class="text-sm">{option.label}</span>
        </label>
      {/each}
    </div>
  </div>

  <!-- Object Type -->
  <div>
    <label for="objectType" class="block text-sm font-medium mb-1">Salesforce Object</label>
    <select
      id="objectType"
      bind:value={config.objectType}
      onchange={handleChange}
      class="input w-full"
    >
      {#each SALESFORCE_OBJECTS as obj}
        <option value={obj.value}>{obj.label}</option>
      {/each}
    </select>
    <p class="text-xs text-text-secondary mt-1">Select the type of Salesforce record to create</p>
  </div>

  <!-- Record Type (optional) -->
  <div>
    <label for="recordTypeId" class="block text-sm font-medium mb-1">
      Record Type ID
      <Badge variant="neutral" size="sm" class="ml-1">Optional</Badge>
    </label>
    <input
      id="recordTypeId"
      type="text"
      bind:value={config.recordTypeId}
      oninput={handleChange}
      placeholder="Leave blank for default record type"
      class="input w-full font-mono"
    />
  </div>

  <!-- Field Mappings -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <label class="text-sm font-medium">Field Mappings</label>
      <Badge variant="accent" size="sm">{config.fields.length} fields</Badge>
    </div>
    
    <div class="space-y-2">
      {#each config.fields as field, index}
        <div class="p-3 bg-bg-secondary rounded-base border border-border">
          <div class="flex gap-2 mb-2">
            <input
              type="text"
              value={field.field}
              oninput={(e) => updateField(index, 'field', e.currentTarget.value)}
              placeholder="Field API Name (e.g., Subject)"
              class="input flex-1"
            />
            <select
              value={field.type}
              onchange={(e) => updateField(index, 'type', e.currentTarget.value)}
              class="input w-28"
            >
              {#each fieldTypes as type}
                <option value={type.value}>{type.label}</option>
              {/each}
            </select>
            <button
              type="button"
              onclick={() => removeField(index)}
              class="p-2 text-red-400 hover:bg-red-500/10 rounded"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          
          {#if field.type === 'token'}
            <select
              value={field.value}
              onchange={(e) => updateField(index, 'value', e.currentTarget.value)}
              class="input w-full"
            >
              <option value="">Select token...</option>
              {#each tokenOptions as token}
                <option value={token.value}>{token.label}</option>
              {/each}
            </select>
          {:else}
            <input
              type="text"
              value={field.value}
              oninput={(e) => updateField(index, 'value', e.currentTarget.value)}
              placeholder={field.type === 'variable' ? 'Variable name' : 'Value'}
              class="input w-full"
            />
          {/if}
        </div>
      {/each}
    </div>
    
    <Button variant="ghost" size="sm" onclick={addField} class="mt-2">
      <Plus class="w-4 h-4 mr-1" />
      Add Field
    </Button>
  </div>

  <!-- Output Variable -->
  <div>
    <label for="outputVariable" class="block text-sm font-medium mb-1">Output Variable</label>
    <input
      id="outputVariable"
      type="text"
      bind:value={config.outputVariable}
      oninput={handleChange}
      placeholder="e.g., newRecordId"
      class="input w-full"
    />
    <p class="text-xs text-text-secondary mt-1">Store the created record ID in this variable</p>
  </div>

  <!-- Owner Settings -->
  <div class="space-y-2">
    <label class="flex items-center justify-between cursor-pointer p-3 bg-bg-secondary rounded-base">
      <div>
        <p class="text-sm font-medium">Set Owner</p>
        <p class="text-xs text-text-secondary">Specify a custom owner for the record</p>
      </div>
      <input
        type="checkbox"
        bind:checked={config.setOwner}
        onchange={handleChange}
        class="w-4 h-4 rounded border-border text-accent focus:ring-accent"
      />
    </label>

    {#if config.setOwner}
      <div class="pl-4">
        <label for="ownerId" class="block text-sm font-medium mb-1">Owner ID</label>
        <input
          id="ownerId"
          type="text"
          bind:value={config.ownerId}
          oninput={handleChange}
          placeholder="User or Queue ID"
          class="input w-full font-mono"
        />
      </div>
    {/if}
  </div>

  <div class="p-3 bg-info/10 border border-info/20 rounded-base flex items-start gap-2">
    <Info class="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
    <p class="text-xs text-info">
      This action creates a new Salesforce record with the configured fields.
      Use tokens to insert call data dynamically.
    </p>
  </div>
</div>

