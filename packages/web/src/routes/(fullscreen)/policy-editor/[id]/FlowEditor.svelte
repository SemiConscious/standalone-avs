<script lang="ts">
  import { browser } from '$app/environment';
  import type { Writable } from 'svelte/store';
  import { get } from 'svelte/store';
  import FlowNode from './components/FlowNode.svelte';
  import FlowEdge from './components/FlowEdge.svelte';
  import NodePalette from './components/NodePalette.svelte';
  import NodeOptionsPanel from './components/NodeOptionsPanel.svelte';
  import { 
    ZoomIn, ZoomOut, Maximize2, MousePointer2, Hand, 
    Undo2, Redo2, Grid3X3, Save, Trash2 
  } from 'lucide-svelte';
  
  // Types
  export interface FlowNodeData {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
    selected?: boolean;
    width?: number;
    height?: number;
  }
  
  export interface FlowEdgeData {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
    selected?: boolean;
  }
  
  interface Props {
    nodes: Writable<FlowNodeData[]>;
    edges: Writable<FlowEdgeData[]>;
    onSave?: () => void;
  }
  
  let { nodes, edges, onSave }: Props = $props();
  
  // Canvas state
  let canvasRef: HTMLDivElement | null = $state(null);
  let viewportX = $state(0);
  let viewportY = $state(0);
  let zoom = $state(1);
  let isPanning = $state(false);
  let panStartX = $state(0);
  let panStartY = $state(0);
  
  // Interaction state
  let interactionMode = $state<'select' | 'pan'>('select');
  let selectedNodeIds = $state<Set<string>>(new Set());
  let selectedEdgeIds = $state<Set<string>>(new Set());
  let activeNodeId = $state<string | null>(null);
  let showGrid = $state(true);
  let showNodePalette = $state(true);
  let showOptionsPanel = $state(false);
  
  // Dragging state
  let isDragging = $state(false);
  let dragStartX = $state(0);
  let dragStartY = $state(0);
  let dragNodeStartPositions = $state<Map<string, { x: number; y: number }>>(new Map());
  
  // Edge creation state
  let isCreatingEdge = $state(false);
  let edgeSourceNodeId = $state<string | null>(null);
  let edgeSourceHandle = $state<string | null>(null);
  let edgePreviewEnd = $state<{ x: number; y: number } | null>(null);
  
  // History for undo/redo
  let history = $state<Array<{ nodes: FlowNodeData[]; edges: FlowEdgeData[] }>>([]);
  let historyIndex = $state(-1);
  
  // Get data from stores
  let nodesData = $state<FlowNodeData[]>(get(nodes));
  let edgesData = $state<FlowEdgeData[]>(get(edges));
  
  // Subscribe to store changes
  $effect(() => {
    const unsubNodes = nodes.subscribe(value => {
      nodesData = value;
    });
    const unsubEdges = edges.subscribe(value => {
      edgesData = value;
    });
    return () => {
      unsubNodes();
      unsubEdges();
    };
  });
  
  // Save history snapshot
  function saveHistory() {
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(nodesData)),
      edges: JSON.parse(JSON.stringify(edgesData))
    };
    // Remove any future history if we're not at the end
    history = history.slice(0, historyIndex + 1);
    history.push(snapshot);
    historyIndex = history.length - 1;
    // Limit history size
    if (history.length > 50) {
      history = history.slice(-50);
      historyIndex = history.length - 1;
    }
  }
  
  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      const snapshot = history[historyIndex];
      nodes.set(JSON.parse(JSON.stringify(snapshot.nodes)));
      edges.set(JSON.parse(JSON.stringify(snapshot.edges)));
    }
  }
  
  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      const snapshot = history[historyIndex];
      nodes.set(JSON.parse(JSON.stringify(snapshot.nodes)));
      edges.set(JSON.parse(JSON.stringify(snapshot.edges)));
    }
  }
  
  // Transform screen coordinates to canvas coordinates
  function screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    if (!canvasRef) return { x: 0, y: 0 };
    const rect = canvasRef.getBoundingClientRect();
    return {
      x: (screenX - rect.left - viewportX) / zoom,
      y: (screenY - rect.top - viewportY) / zoom
    };
  }
  
  // Zoom functions
  function zoomIn() {
    zoom = Math.min(zoom * 1.2, 4);
  }
  
  function zoomOut() {
    zoom = Math.max(zoom / 1.2, 0.1);
  }
  
  function fitView() {
    if (!canvasRef || nodesData.length === 0) return;
    
    const rect = canvasRef.getBoundingClientRect();
    const padding = 50;
    
    // Calculate bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodesData) {
      const width = node.width || 150;
      const height = node.height || 60;
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + width);
      maxY = Math.max(maxY, node.position.y + height);
    }
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;
    
    zoom = Math.min(
      availableWidth / contentWidth,
      availableHeight / contentHeight,
      1.5
    );
    
    viewportX = (rect.width - contentWidth * zoom) / 2 - minX * zoom;
    viewportY = (rect.height - contentHeight * zoom) / 2 - minY * zoom;
  }
  
  // Mouse event handlers
  function handleCanvasMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // Only handle left click
    
    const target = e.target as HTMLElement;
    const isOnNode = target.closest('.flow-node');
    const isOnHandle = target.closest('.node-handle');
    
    if (isOnHandle) {
      // Start edge creation
      const handleEl = target.closest('.node-handle') as HTMLElement;
      const nodeEl = target.closest('.flow-node') as HTMLElement;
      if (handleEl && nodeEl) {
        isCreatingEdge = true;
        edgeSourceNodeId = nodeEl.dataset.nodeId || null;
        edgeSourceHandle = handleEl.dataset.handleType || 'source';
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        edgePreviewEnd = canvasPos;
      }
      return;
    }
    
    if (isOnNode) {
      // Handle node selection/dragging
      const nodeEl = target.closest('.flow-node') as HTMLElement;
      const nodeId = nodeEl?.dataset.nodeId;
      
      if (nodeId) {
        if (!e.shiftKey && !selectedNodeIds.has(nodeId)) {
          // Clear selection and select this node
          selectedNodeIds = new Set([nodeId]);
          selectedEdgeIds = new Set();
        } else if (e.shiftKey) {
          // Toggle selection
          const newSet = new Set(selectedNodeIds);
          if (newSet.has(nodeId)) {
            newSet.delete(nodeId);
          } else {
            newSet.add(nodeId);
          }
          selectedNodeIds = newSet;
        }
        
        // Start dragging
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragNodeStartPositions = new Map();
        for (const id of selectedNodeIds) {
          const node = nodesData.find(n => n.id === id);
          if (node) {
            dragNodeStartPositions.set(id, { ...node.position });
          }
        }
      }
      return;
    }
    
    // Click on canvas - start panning or clear selection
    if (interactionMode === 'pan' || e.shiftKey) {
      isPanning = true;
      panStartX = e.clientX - viewportX;
      panStartY = e.clientY - viewportY;
    } else {
      // Clear selection
      selectedNodeIds = new Set();
      selectedEdgeIds = new Set();
      activeNodeId = null;
      showOptionsPanel = false;
    }
  }
  
  function handleCanvasMouseMove(e: MouseEvent) {
    if (isPanning) {
      viewportX = e.clientX - panStartX;
      viewportY = e.clientY - panStartY;
    } else if (isDragging && selectedNodeIds.size > 0) {
      const dx = (e.clientX - dragStartX) / zoom;
      const dy = (e.clientY - dragStartY) / zoom;
      
      nodes.update(currentNodes => {
        return currentNodes.map(node => {
          if (selectedNodeIds.has(node.id)) {
            const startPos = dragNodeStartPositions.get(node.id);
            if (startPos) {
              return {
                ...node,
                position: {
                  x: startPos.x + dx,
                  y: startPos.y + dy
                }
              };
            }
          }
          return node;
        });
      });
    } else if (isCreatingEdge) {
      edgePreviewEnd = screenToCanvas(e.clientX, e.clientY);
    }
  }
  
  function handleCanvasMouseUp(e: MouseEvent) {
    if (isDragging) {
      saveHistory();
    }
    
    if (isCreatingEdge && edgePreviewEnd) {
      // Check if we're over a target handle
      const target = e.target as HTMLElement;
      const handleEl = target.closest('.node-handle') as HTMLElement;
      const nodeEl = target.closest('.flow-node') as HTMLElement;
      
      if (handleEl && nodeEl && edgeSourceNodeId) {
        const targetNodeId = nodeEl.dataset.nodeId;
        const targetHandle = handleEl.dataset.handleType;
        
        if (targetNodeId && targetNodeId !== edgeSourceNodeId && targetHandle === 'target') {
          // Create new edge
          const newEdge: FlowEdgeData = {
            id: `edge-${Date.now()}`,
            source: edgeSourceNodeId,
            target: targetNodeId,
            sourceHandle: edgeSourceHandle || 'source',
            targetHandle: targetHandle
          };
          
          edges.update(currentEdges => [...currentEdges, newEdge]);
          saveHistory();
        }
      }
    }
    
    isPanning = false;
    isDragging = false;
    isCreatingEdge = false;
    edgeSourceNodeId = null;
    edgeSourceHandle = null;
    edgePreviewEnd = null;
  }
  
  function handleCanvasWheel(e: WheelEvent) {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const rect = canvasRef?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const oldZoom = zoom;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      zoom = Math.max(0.1, Math.min(4, zoom * delta));
      
      // Adjust viewport to zoom towards mouse position
      viewportX = mouseX - (mouseX - viewportX) * (zoom / oldZoom);
      viewportY = mouseY - (mouseY - viewportY) * (zoom / oldZoom);
    } else {
      // Pan
      viewportX -= e.deltaX;
      viewportY -= e.deltaY;
    }
  }
  
  // Node event handlers
  function handleNodeDoubleClick(nodeId: string) {
    activeNodeId = nodeId;
    showOptionsPanel = true;
  }
  
  function handleNodeDelete() {
    if (selectedNodeIds.size === 0) return;
    
    saveHistory();
    
    // Remove selected nodes
    nodes.update(currentNodes => 
      currentNodes.filter(n => !selectedNodeIds.has(n.id))
    );
    
    // Remove edges connected to deleted nodes
    edges.update(currentEdges =>
      currentEdges.filter(e => 
        !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
      )
    );
    
    selectedNodeIds = new Set();
    activeNodeId = null;
    showOptionsPanel = false;
  }
  
  // Edge event handlers
  function handleEdgeClick(edgeId: string, e: MouseEvent) {
    e.stopPropagation();
    if (e.shiftKey) {
      const newSet = new Set(selectedEdgeIds);
      if (newSet.has(edgeId)) {
        newSet.delete(edgeId);
      } else {
        newSet.add(edgeId);
      }
      selectedEdgeIds = newSet;
    } else {
      selectedNodeIds = new Set();
      selectedEdgeIds = new Set([edgeId]);
    }
  }
  
  function handleEdgeDelete() {
    if (selectedEdgeIds.size === 0) return;
    
    saveHistory();
    
    edges.update(currentEdges =>
      currentEdges.filter(e => !selectedEdgeIds.has(e.id))
    );
    
    selectedEdgeIds = new Set();
  }
  
  // Handle dropping new nodes from palette
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const data = e.dataTransfer?.getData('application/json');
    if (!data) return;
    
    try {
      const nodeData = JSON.parse(data);
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      
      const newNode: FlowNodeData = {
        id: `${nodeData.type}-${Date.now()}`,
        type: nodeData.type,
        position: canvasPos,
        data: {
          label: nodeData.label,
          ...nodeData.defaultData
        }
      };
      
      nodes.update(currentNodes => [...currentNodes, newNode]);
      saveHistory();
      
      // Select the new node
      selectedNodeIds = new Set([newNode.id]);
    } catch (err) {
      console.error('Failed to parse dropped node data:', err);
    }
  }
  
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  }
  
  // Keyboard shortcuts
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedNodeIds.size > 0) {
        handleNodeDelete();
      } else if (selectedEdgeIds.size > 0) {
        handleEdgeDelete();
      }
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      selectedNodeIds = new Set(nodesData.map(n => n.id));
    } else if (e.key === 'Escape') {
      selectedNodeIds = new Set();
      selectedEdgeIds = new Set();
      activeNodeId = null;
      showOptionsPanel = false;
    }
  }
  
  // Node update from options panel
  function handleNodeUpdate(nodeId: string, updates: Partial<FlowNodeData['data']>) {
    saveHistory();
    nodes.update(currentNodes =>
      currentNodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
      )
    );
  }
  
  // Get node position for edge rendering
  function getNodeCenter(nodeId: string): { x: number; y: number } | null {
    const node = nodesData.find(n => n.id === nodeId);
    if (!node) return null;
    const width = node.width || 150;
    const height = node.height || 60;
    return {
      x: node.position.x + width / 2,
      y: node.position.y + height / 2
    };
  }
  
  // Calculate node dimensions using the same logic as FlowNode.svelte
  function calculateNodeDimensions(node: FlowNodeData): { width: number; height: number } {
    const baseWidth = 150;
    const baseHeight = 60;
    const subItemHeight = 28;
    const maxDisplayItems = 5;
    
    // Use stored dimensions if available
    const width = node.width || baseWidth;
    
    // Calculate height based on sub-items and outputs (same logic as FlowNode.svelte)
    const subItems = (node.data?.subItems as unknown[]) || [];
    const outputs = (node.data?.outputs as unknown[]) || [];
    const hasSubItems = subItems.length > 0 || outputs.length > 0;
    
    let height: number;
    if (node.height) {
      height = node.height;
    } else if (!hasSubItems) {
      height = baseHeight;
    } else {
      const itemCount = Math.min(subItems.length + outputs.length, maxDisplayItems);
      height = baseHeight + (itemCount * subItemHeight);
    }
    
    return { width, height };
  }
  
  function getNodeHandlePosition(nodeId: string, handleType: string): { x: number; y: number } | null {
    const node = nodesData.find(n => n.id === nodeId);
    if (!node) return null;
    
    const { width, height } = calculateNodeDimensions(node);
    
    // 'source' = right side of node (output), 'target' = left side of node (input)
    if (handleType === 'source' || handleType === 'right') {
      return { x: node.position.x + width, y: node.position.y + height / 2 };
    } else {
      return { x: node.position.x, y: node.position.y + height / 2 };
    }
  }
  
  // Initialize history
  $effect(() => {
    if (browser && history.length === 0) {
      saveHistory();
    }
  });
  
  // Debug logging (can be removed in production)
  // console.log('[FlowEditor] Initialized with', nodesData.length, 'nodes and', edgesData.length, 'edges');
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="flow-editor-container h-full w-full flex">
  <!-- Node Palette (Left Sidebar) -->
  {#if showNodePalette}
    <NodePalette />
  {/if}
  
  <!-- Main Canvas Area -->
  <div class="flex-1 flex flex-col">
    <!-- Toolbar -->
    <div class="flow-editor-toolbar h-12 border-b flex items-center gap-2 px-4">
      <!-- Mode toggles -->
      <div class="toolbar-group flex items-center rounded-md overflow-hidden">
        <button 
          class="toolbar-btn p-2 transition-colors {interactionMode === 'select' ? 'active' : ''}"
          onclick={() => interactionMode = 'select'}
          title="Select mode (V)"
        >
          <MousePointer2 class="w-4 h-4" />
        </button>
        <button 
          class="toolbar-btn p-2 transition-colors {interactionMode === 'pan' ? 'active' : ''}"
          onclick={() => interactionMode = 'pan'}
          title="Pan mode (H)"
        >
          <Hand class="w-4 h-4" />
        </button>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <!-- Zoom controls -->
      <button class="toolbar-btn p-2 rounded" onclick={zoomOut} title="Zoom out">
        <ZoomOut class="w-4 h-4" />
      </button>
      <span class="text-sm opacity-70 min-w-[50px] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button class="toolbar-btn p-2 rounded" onclick={zoomIn} title="Zoom in">
        <ZoomIn class="w-4 h-4" />
      </button>
      <button class="toolbar-btn p-2 rounded" onclick={fitView} title="Fit view">
        <Maximize2 class="w-4 h-4" />
      </button>
      
      <div class="toolbar-divider"></div>
      
      <!-- Grid toggle -->
      <button 
        class="toolbar-btn p-2 rounded transition-colors {showGrid ? 'active' : ''}"
        onclick={() => showGrid = !showGrid}
        title="Toggle grid"
      >
        <Grid3X3 class="w-4 h-4" />
      </button>
      
      <div class="toolbar-divider"></div>
      
      <!-- History controls -->
      <button 
        class="toolbar-btn p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={undo}
        disabled={historyIndex <= 0}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 class="w-4 h-4" />
      </button>
      <button 
        class="toolbar-btn p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={redo}
        disabled={historyIndex >= history.length - 1}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 class="w-4 h-4" />
      </button>
      
      <div class="flex-1"></div>
      
      <!-- Delete button -->
      {#if selectedNodeIds.size > 0 || selectedEdgeIds.size > 0}
        <button 
          class="p-2 hover:bg-red-500/20 text-red-400 rounded"
          onclick={() => selectedNodeIds.size > 0 ? handleNodeDelete() : handleEdgeDelete()}
          title="Delete selected (Delete)"
        >
          <Trash2 class="w-4 h-4" />
        </button>
        <div class="toolbar-divider"></div>
      {/if}
      
      <!-- Save button -->
      <button 
        class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"
        onclick={() => onSave?.()}
        title="Save policy"
      >
        <Save class="w-4 h-4" />
        <span class="text-sm">Save</span>
      </button>
    </div>
    
    <!-- Canvas -->
    <div 
      bind:this={canvasRef}
      class="flow-editor-canvas flex-1 relative overflow-hidden"
      class:cursor-grab={interactionMode === 'pan' && !isPanning}
      class:cursor-grabbing={isPanning}
      class:cursor-default={interactionMode === 'select' && !isPanning}
      onmousedown={handleCanvasMouseDown}
      onmousemove={handleCanvasMouseMove}
      onmouseup={handleCanvasMouseUp}
      onmouseleave={handleCanvasMouseUp}
      onwheel={handleCanvasWheel}
      ondrop={handleDrop}
      ondragover={handleDragOver}
      role="application"
      tabindex="0"
      aria-label="Flow editor canvas"
    >
      <!-- Grid background -->
      {#if showGrid}
        <div 
          class="absolute inset-0 pointer-events-none"
          style="
            background-image: 
              linear-gradient(rgba(100,100,100,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(100,100,100,0.1) 1px, transparent 1px);
            background-size: {20 * zoom}px {20 * zoom}px;
            background-position: {viewportX}px {viewportY}px;
          "
        ></div>
      {/if}
      
      <!-- Viewport transform container -->
      <div 
        class="absolute"
        style="transform: translate({viewportX}px, {viewportY}px) scale({zoom}); transform-origin: 0 0;"
      >
        <!-- SVG layer for edges -->
        <svg class="absolute overflow-visible pointer-events-none" style="top: 0; left: 0; width: 1px; height: 1px;">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="rgb(var(--color-surface-400))" />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="rgb(var(--color-primary-500))" />
            </marker>
          </defs>
          
          <!-- Render edges -->
          {#each edgesData as edge (edge.id)}
            {@const sourcePos = getNodeHandlePosition(edge.source, 'source')}
            {@const targetPos = getNodeHandlePosition(edge.target, 'target')}
            {#if sourcePos && targetPos}
              <FlowEdge 
                {edge}
                {sourcePos}
                {targetPos}
                selected={selectedEdgeIds.has(edge.id)}
                onClick={(e) => handleEdgeClick(edge.id, e)}
              />
            {/if}
          {/each}
          
          <!-- Edge creation preview -->
          {#if isCreatingEdge && edgeSourceNodeId && edgePreviewEnd}
            {@const sourcePos = getNodeHandlePosition(edgeSourceNodeId, edgeSourceHandle || 'source')}
            {#if sourcePos}
              <line
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={edgePreviewEnd.x}
                y2={edgePreviewEnd.y}
                stroke="rgb(var(--color-primary-500))"
                stroke-width="2"
                stroke-dasharray="5,5"
              />
            {/if}
          {/if}
        </svg>
        
        <!-- Render nodes -->
        {#each nodesData as node (node.id)}
          <FlowNode 
            {node}
            selected={selectedNodeIds.has(node.id)}
            onDoubleClick={() => handleNodeDoubleClick(node.id)}
          />
        {/each}
      </div>
      
      <!-- Info panel -->
      <div class="info-panel absolute bottom-4 left-4 backdrop-blur rounded-lg p-3 shadow-lg">
        <div class="text-sm">
          <span class="font-semibold">{nodesData.length}</span> nodes, 
          <span class="font-semibold">{edgesData.length}</span> edges
          {#if selectedNodeIds.size > 0}
            <span class="text-blue-400 ml-2">({selectedNodeIds.size} selected)</span>
          {/if}
        </div>
      </div>
    </div>
  </div>
  
  <!-- Options Panel (Right Sidebar) -->
  {#if showOptionsPanel && activeNodeId}
    {@const activeNode = nodesData.find(n => n.id === activeNodeId)}
    {#if activeNode}
      <NodeOptionsPanel 
        node={activeNode}
        onUpdate={(updates) => handleNodeUpdate(activeNodeId!, updates)}
        onClose={() => { showOptionsPanel = false; activeNodeId = null; }}
      />
    {/if}
  {/if}
</div>

<style>
  .flow-editor-container {
    background-color: rgb(var(--color-surface-900));
    color: rgb(var(--color-surface-100));
  }
  
  .flow-editor-toolbar {
    background-color: rgb(var(--color-surface-800));
    border-color: rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-200));
  }
  
  .flow-editor-canvas {
    background-color: rgb(var(--color-surface-900));
  }
  
  .toolbar-group {
    border: 1px solid rgb(var(--color-surface-600));
  }
  
  .toolbar-btn {
    color: rgb(var(--color-surface-300));
  }
  
  .toolbar-btn:hover {
    background-color: rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-100));
  }
  
  .toolbar-btn.active {
    background-color: rgb(var(--color-primary-600));
    color: white;
  }
  
  .toolbar-divider {
    width: 1px;
    height: 1.5rem;
    background-color: rgb(var(--color-surface-700));
  }
  
  .info-panel {
    background-color: rgba(var(--color-surface-800), 0.9);
    color: rgb(var(--color-surface-200));
  }
</style>
