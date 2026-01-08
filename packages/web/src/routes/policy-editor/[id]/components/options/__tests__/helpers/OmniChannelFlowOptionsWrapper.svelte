<script lang="ts">
  import OmniChannelFlowOptions from '../../OmniChannelFlowOptions.svelte';
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';

  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }

  let { node, context, onUpdate }: Props = $props();
</script>

<OmniChannelFlowOptions {node} {context} {onUpdate} />

