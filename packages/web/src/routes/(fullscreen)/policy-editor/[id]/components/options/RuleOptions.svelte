<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { GitBranch, Plus, Trash2, GripVertical } from 'lucide-svelte';
  
  interface Condition {
    id: string;
    field: string;
    operator: string;
    value: string;
    logicalOperator: 'AND' | 'OR';
  }
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'Rule');
  let conditions = $state<Condition[]>(node.data?.conditions as Condition[] || []);
  
  const fields = [
    { value: 'caller.number', label: 'Caller Number' },
    { value: 'caller.name', label: 'Caller Name' },
    { value: 'called.number', label: 'Called Number' },
    { value: 'time.hour', label: 'Hour of Day' },
    { value: 'time.dayOfWeek', label: 'Day of Week' },
    { value: 'property.custom', label: 'Custom Property' },
  ];
  
  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
    { value: 'regex', label: 'Matches Regex' },
  ];
  
  function handleUpdate() {
    onUpdate({ label, conditions });
  }
  
  function addCondition() {
    conditions = [
      ...conditions,
      {
        id: `cond-${Date.now()}`,
        field: 'caller.number',
        operator: 'equals',
        value: '',
        logicalOperator: 'AND',
      },
    ];
    handleUpdate();
  }
  
  function removeCondition(id: string) {
    conditions = conditions.filter(c => c.id !== id);
    handleUpdate();
  }
  
  function updateCondition(id: string, key: keyof Condition, value: string) {
    conditions = conditions.map(c => 
      c.id === id ? { ...c, [key]: value } : c
    );
    handleUpdate();
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
  
  <!-- Conditions -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-medium text-text-secondary">
        <GitBranch class="w-4 h-4 inline mr-1" />
        Conditions
      </h4>
      <button
        onclick={addCondition}
        class="btn btn-sm preset-tonal-primary"
      >
        <Plus class="w-4 h-4" />
        Add
      </button>
    </div>
    
    {#if conditions.length === 0}
      <div class="text-center py-6 border border-dashed border-surface-400 rounded-lg">
        <GitBranch class="w-8 h-8 text-text-secondary mx-auto mb-2" />
        <p class="text-sm text-text-secondary">No conditions defined</p>
        <p class="text-xs text-text-secondary mt-1">Add a condition to create branching logic</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each conditions as condition, index}
          <div class="p-3 bg-surface-100-900 rounded-lg border border-surface-300-700">
            {#if index > 0}
              <div class="flex justify-center -mt-6 mb-2">
                <select
                  value={condition.logicalOperator}
                  onchange={(e) => updateCondition(condition.id, 'logicalOperator', e.currentTarget.value)}
                  class="select text-xs py-1 px-2 bg-surface-200-800"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>
            {/if}
            
            <div class="flex items-start gap-2">
              <GripVertical class="w-4 h-4 text-text-secondary mt-2 cursor-move" />
              
              <div class="flex-1 space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <select
                    value={condition.field}
                    onchange={(e) => updateCondition(condition.id, 'field', e.currentTarget.value)}
                    class="select text-sm"
                  >
                    {#each fields as field}
                      <option value={field.value}>{field.label}</option>
                    {/each}
                  </select>
                  
                  <select
                    value={condition.operator}
                    onchange={(e) => updateCondition(condition.id, 'operator', e.currentTarget.value)}
                    class="select text-sm"
                  >
                    {#each operators as op}
                      <option value={op.value}>{op.label}</option>
                    {/each}
                  </select>
                </div>
                
                <input
                  type="text"
                  value={condition.value}
                  oninput={(e) => updateCondition(condition.id, 'value', e.currentTarget.value)}
                  class="input w-full text-sm"
                  placeholder="Value..."
                />
              </div>
              
              <button
                onclick={() => removeCondition(condition.id)}
                class="p-1.5 text-text-secondary hover:text-error-500 transition-colors"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Output Info -->
  <div class="pt-4 border-t border-surface-300-700">
    <h4 class="text-sm font-medium text-text-secondary mb-2">Outputs</h4>
    <div class="flex gap-4 text-sm">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-success-500"></div>
        <span class="text-text-primary">True</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-error-500"></div>
        <span class="text-text-primary">False</span>
      </div>
    </div>
    <p class="text-xs text-text-secondary mt-2">
      Connect the True output to the next step when conditions match, 
      and False output for when they don't.
    </p>
  </div>
</div>

