<script lang="ts">
  import HuntGroupOptions from '../../HuntGroupOptions.svelte';
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';

  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }

  let { node, context, onUpdate }: Props = $props();
</script>

<HuntGroupOptions {node} {context} {onUpdate} />

