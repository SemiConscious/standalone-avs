<script lang="ts">
  interface FlowEdgeData {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
    selected?: boolean;
  }
  
  interface Props {
    edge: FlowEdgeData;
    sourcePos: { x: number; y: number };
    targetPos: { x: number; y: number };
    selected?: boolean;
    onClick?: (e: MouseEvent) => void;
    onDelete?: () => void;
  }
  
  let { edge, sourcePos, targetPos, selected = false, onClick, onDelete }: Props = $props();
  
  let isHovered = $state(false);
  
  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Right-click to delete edge
    onDelete?.();
  }
  
  function handleDoubleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Double-click to delete edge
    onDelete?.();
  }
  
  // Calculate bezier curve control points for smooth edges
  // Control points are positioned to ensure edges leave/enter perpendicular to nodes
  const pathData = $derived(() => {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    // For perpendicular entry/exit, control points need sufficient horizontal distance
    // The larger the vertical distance, the more horizontal run we need for the curve to straighten
    const minHorizontalRun = Math.max(100, absDy * 0.7);
    
    // Calculate control point offset based on distance
    const baseOffset = Math.max(minHorizontalRun, Math.min(absDx / 2, 250));
    
    // For edges going backwards (target is left of source), increase the offset significantly
    const offset = dx < 0 ? Math.max(baseOffset, absDy * 0.8 + 100) : baseOffset;
    
    // Control points extend horizontally from start/end to ensure perpendicular connection
    const cp1x = sourcePos.x + offset;
    const cp1y = sourcePos.y;
    const cp2x = targetPos.x - offset;
    const cp2y = targetPos.y;
    
    return `M ${sourcePos.x} ${sourcePos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetPos.x} ${targetPos.y}`;
  });
  
  // Calculate midpoint for potential label positioning
  const midPoint = $derived({
    x: (sourcePos.x + targetPos.x) / 2,
    y: (sourcePos.y + targetPos.y) / 2
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<g 
  class="flow-edge pointer-events-auto" 
  data-edge-id={edge.id}
  role="button"
  tabindex="-1"
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
>
  <!-- Invisible wider path for easier clicking -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <path
    d={pathData()}
    fill="none"
    stroke="transparent"
    stroke-width="20"
    class="cursor-pointer"
    onclick={onClick}
    oncontextmenu={handleContextMenu}
    ondblclick={handleDoubleClick}
  />
  
  <!-- Hover highlight - shows when hovering to indicate edge is clickable -->
  {#if isHovered && !selected}
    <path
      d={pathData()}
      fill="none"
      stroke="rgb(var(--color-surface-300))"
      stroke-width="6"
      stroke-opacity="0.4"
      class="pointer-events-none"
    />
  {/if}
  
  <!-- Visible edge path -->
  <path
    d={pathData()}
    fill="none"
    stroke={selected ? 'rgb(var(--color-primary-500))' : isHovered ? 'rgb(var(--color-surface-300))' : 'rgb(var(--color-surface-400))'}
    stroke-width={selected ? 3 : isHovered ? 2.5 : 2}
    marker-end={selected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
    class="transition-all duration-150 pointer-events-none"
  />
  
  <!-- Selection highlight -->
  {#if selected}
    <path
      d={pathData()}
      fill="none"
      stroke="rgb(var(--color-primary-500))"
      stroke-width="6"
      stroke-opacity="0.2"
      class="pointer-events-none"
    />
  {/if}
  
  <!-- Delete button on hover -->
  {#if isHovered || selected}
    {@const midX = (sourcePos.x + targetPos.x) / 2}
    {@const midY = (sourcePos.y + targetPos.y) / 2}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <g 
      class="cursor-pointer" 
      role="button"
      tabindex="-1"
      onclick={(e) => { e.stopPropagation(); onDelete?.(); }}
      transform="translate({midX}, {midY})"
    >
      <circle 
        r="10" 
        fill={selected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-surface-600))'}
        stroke="rgb(var(--color-surface-400))"
        stroke-width="1"
      />
      <!-- X icon -->
      <line x1="-4" y1="-4" x2="4" y2="4" stroke="white" stroke-width="2" stroke-linecap="round" />
      <line x1="4" y1="-4" x2="-4" y2="4" stroke="white" stroke-width="2" stroke-linecap="round" />
    </g>
  {/if}
  
  <!-- Edge label (if needed) -->
  {#if edge.type === 'conditional'}
    <foreignObject 
      x={midPoint.x - 20} 
      y={midPoint.y - 10} 
      width="40" 
      height="20"
      class="pointer-events-none"
    >
      <div class="text-xs bg-surface-200-800 rounded px-1.5 py-0.5 text-center border border-surface-300-700">
        {edge.sourceHandle === 'true' ? 'Yes' : 'No'}
      </div>
    </foreignObject>
  {/if}
</g>

