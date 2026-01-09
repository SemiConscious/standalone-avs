<script lang="ts">
  import FlowNode from '../../FlowNode.svelte';

  interface SubItem {
    id: string;
    name?: string;
    data?: { name?: string; label?: string };
  }

  interface Output {
    id: string;
    title?: string;
    name?: string;
    data?: { title?: string; name?: string; label?: string };
  }

  interface FlowNodeData {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
      label?: string;
      title?: string;
      name?: string;
      description?: string;
      subItems?: SubItem[];
      outputs?: Output[];
      [key: string]: unknown;
    };
    selected?: boolean;
    width?: number;
    height?: number;
  }

  interface Props {
    node: FlowNodeData;
    selected?: boolean;
    onDoubleClick?: () => void;
  }

  let { node, selected, onDoubleClick }: Props = $props();
</script>

<FlowNode {node} {selected} {onDoubleClick} />

