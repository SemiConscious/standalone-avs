<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || '');
  let description = $state(node.data?.description as string || '');
  
  function handleLabelChange() {
    onUpdate({ label });
  }
  
  function handleDescriptionChange() {
    onUpdate({ description });
  }
</script>

<div class="space-y-4">
  <!-- Label -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Label
    </label>
    <input
      type="text"
      bind:value={label}
      onblur={handleLabelChange}
      class="input w-full"
      placeholder="Enter label..."
    />
  </div>
  
  <!-- Description -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Description
    </label>
    <textarea
      bind:value={description}
      onblur={handleDescriptionChange}
      class="textarea w-full"
      rows="3"
      placeholder="Enter description..."
    ></textarea>
  </div>
  
  <!-- Node Info -->
  <div class="pt-4 border-t border-surface-300-700">
    <h4 class="text-sm font-medium text-text-secondary mb-2">Node Info</h4>
    <dl class="text-xs space-y-1">
      <div class="flex justify-between">
        <dt class="text-text-secondary">ID:</dt>
        <dd class="text-text-primary font-mono">{node.id}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-text-secondary">Type:</dt>
        <dd class="text-text-primary">{node.type}</dd>
      </div>
      {#if node.data?.containerType}
        <div class="flex justify-between">
          <dt class="text-text-secondary">Container:</dt>
          <dd class="text-text-primary">{node.data.containerType}</dd>
        </div>
      {/if}
      <div class="flex justify-between">
        <dt class="text-text-secondary">Position:</dt>
        <dd class="text-text-primary">
          {Math.round(node.position.x)}, {Math.round(node.position.y)}
        </dd>
      </div>
    </dl>
  </div>
  
  <!-- Raw Data (debug) -->
  <details class="pt-4 border-t border-surface-300-700">
    <summary class="text-sm font-medium text-text-secondary cursor-pointer">
      Raw Data
    </summary>
    <pre class="mt-2 p-2 bg-surface-100-900 rounded text-xs overflow-auto max-h-48">
{JSON.stringify(node.data, null, 2)}
    </pre>
  </details>
</div>

