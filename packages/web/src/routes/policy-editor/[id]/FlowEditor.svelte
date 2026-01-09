<script lang="ts">
  import { browser } from '$app/environment';
  import type { Writable } from 'svelte/store';
  import { get } from 'svelte/store';
  import FlowNode from './components/FlowNode.svelte';
  import FlowEdge from './components/FlowEdge.svelte';
  import NodeOptionsPanel from './components/NodeOptionsPanel.svelte';
  import { 
    ZoomIn, ZoomOut, Maximize2, MousePointer2, Hand, 
    Undo2, Redo2, Grid3X3, Save, Trash2, ChevronDown,
    Phone, PhoneIncoming, Globe, Server, Workflow
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
  
  // Data source types for child configuration
  interface UserData {
    id: string;
    name: string;
    email?: string;
  }
  
  interface GroupData {
    id: string;
    name: string;
  }
  
  interface SoundData {
    id: string;
    name: string;
  }
  
  interface PhoneNumberData {
    id: string;
    name: string;
    number: string;
  }
  
  interface Props {
    nodes: Writable<FlowNodeData[]>;
    edges: Writable<FlowEdgeData[]>;
    // Data sources for child configuration
    users?: UserData[];
    groups?: GroupData[];
    sounds?: SoundData[];
    phoneNumbers?: PhoneNumberData[];
    onSave?: () => void;
    onDelete?: () => void;
    isDeleting?: boolean;
    canDelete?: boolean;
  }
  
  let { nodes, edges, users = [], groups = [], sounds = [], phoneNumbers = [], onSave, onDelete, isDeleting = false, canDelete = false }: Props = $props();
  
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
  let activeChildId = $state<string | null>(null); // ID of currently selected child item
  let activeChildData = $state<Record<string, unknown> | null>(null); // Data for the child
  let showGrid = $state(true);
  let showOptionsPanel = $state(false);
  
  // Dragging state
  let isDragging = $state(false);
  let dragStartX = $state(0);
  let dragStartY = $state(0);
  let dragNodeStartPositions = $state<Map<string, { x: number; y: number }>>(new Map());
  let dragOffsetX = $state(0);
  let dragOffsetY = $state(0);
  
  // Edge creation state
  let isCreatingEdge = $state(false);
  let edgeSourceNodeId = $state<string | null>(null);
  let edgeSourceHandle = $state<string | null>(null);
  let edgePreviewEnd = $state<{ x: number; y: number } | null>(null);
  
  // History for undo/redo
  let history = $state<Array<{ nodes: FlowNodeData[]; edges: FlowEdgeData[] }>>([]);
  let historyIndex = $state(-1);
  
  // Start button dropdown state
  let showStartDropdown = $state(false);
  
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
  
  // Create a hash for nodes that affects edge rendering
  // This will be different whenever node positions or children change
  const nodesHash = $derived(() => {
    return nodesData.map(n => {
      const outputs = (n.data?.outputs as unknown[]) || [];
      const subItems = (n.data?.subItems as unknown[]) || [];
      return `${n.id}-${n.position.x}-${n.position.y}-${outputs.length}-${subItems.length}`;
    }).join('|');
  });
  
  // Compute which source handles/node IDs have edges going out from them
  // Used to style connectors (connected vs unconnected)
  const connectedChildIds = $derived(() => {
    const connected = new Set<string>();
    
    for (const edge of edgesData) {
      if (edge.sourceHandle) {
        // Edge from a specific handle (child connector)
        connected.add(edge.sourceHandle);
      } else {
        // Edge from default/footer connector - add the source node ID
        // so we can check if the footer is connected
        connected.add(edge.source);
        connected.add('default');
      }
    }
    
    return connected;
  });
  
  // Compute which nodes have edges from their footer (not from children)
  // A footer edge exists if there's an edge from this node whose target 
  // is NOT claimed by any child's connectedTo
  const footerConnectedNodeIds = $derived(() => {
    const footerConnected = new Set<string>();
    
    for (const node of nodesData) {
      // Get all children's connectedTo values for this node
      const outputs = (node.data?.outputs as Array<{ connectedTo?: string }>) || [];
      const childTargets = new Set(
        outputs
          .map(o => o.connectedTo)
          .filter((ct): ct is string => Boolean(ct && ct !== 'finish' && ct !== 'null'))
      );
      
      // Find edges from this node
      const nodeEdges = edgesData.filter(e => e.source === node.id);
      
      // Check if any edge target is NOT claimed by a child
      for (const edge of nodeEdges) {
        if (!childTargets.has(edge.target)) {
          // This edge comes from the footer, not a child
          footerConnected.add(node.id);
          break;
        }
      }
    }
    
    return footerConnected;
  });
  
  // Compute which nodes have incoming edges (for input connector styling)
  const inputConnectedNodeIds = $derived(() => {
    const inputConnected = new Set<string>();
    for (const edge of edgesData) {
      inputConnected.add(edge.target);
    }
    return inputConnected;
  });
  
  // Track which entry point types already exist in the policy
  const existingEntryPointTypes = $derived(() => {
    const entryPointTypes = ['inboundNumber', 'extensionNumber', 'invokableDestination', 'sipTrunk', 'fromPolicy'];
    const existing = new Set<string>();
    for (const node of nodesData) {
      if (entryPointTypes.includes(node.type)) {
        existing.add(node.type);
      }
    }
    return existing;
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
    const isOnNode = target.closest('.flow-node') || target.closest('.container-node');
    const isOnHandle = target.closest('.node-handle') || target.closest('.child-output-handle');
    
    if (isOnHandle) {
      // Start edge creation
      const handleEl = (target.closest('.node-handle') || target.closest('.child-output-handle')) as HTMLElement;
      const nodeEl = (target.closest('.flow-node') || target.closest('.container-node')) as HTMLElement;
      if (handleEl && nodeEl) {
        isCreatingEdge = true;
        edgeSourceNodeId = nodeEl.dataset.nodeId || null;
        // Use handleId (child ID) if present, otherwise fall back to handleType or 'source'
        edgeSourceHandle = handleEl.dataset.handleId || handleEl.dataset.handleType || 'source';
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        edgePreviewEnd = canvasPos;
      }
      return;
    }
    
    if (isOnNode) {
      // Handle node selection/dragging
      const nodeEl = (target.closest('.flow-node') || target.closest('.container-node')) as HTMLElement;
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
  
  // Throttle for drag updates
  let dragRafId: number | null = null;
  
  function handleCanvasMouseMove(e: MouseEvent) {
    if (isPanning) {
      viewportX = e.clientX - panStartX;
      viewportY = e.clientY - panStartY;
    } else if (isDragging && selectedNodeIds.size > 0) {
      // Calculate delta
      dragOffsetX = (e.clientX - dragStartX) / zoom;
      dragOffsetY = (e.clientY - dragStartY) / zoom;
      
      // Use requestAnimationFrame to batch updates for smoother dragging
      if (dragRafId === null) {
        dragRafId = requestAnimationFrame(() => {
          const dx = dragOffsetX;
          const dy = dragOffsetY;
          
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
          
          dragRafId = null;
        });
      }
    } else if (isCreatingEdge) {
      edgePreviewEnd = screenToCanvas(e.clientX, e.clientY);
    }
  }
  
  function handleCanvasMouseUp(e: MouseEvent) {
    // Cancel any pending drag RAF
    if (dragRafId !== null) {
      cancelAnimationFrame(dragRafId);
      dragRafId = null;
    }
    
    if (isDragging) {
      // Apply final position
      const dx = dragOffsetX;
      const dy = dragOffsetY;
      
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
      
      saveHistory();
      dragOffsetX = 0;
      dragOffsetY = 0;
    }
    
    if (isCreatingEdge && edgePreviewEnd) {
      // Check if we're over a target handle
      const target = e.target as HTMLElement;
      const handleEl = (target.closest('.node-handle') || target.closest('.child-output-handle') || target.closest('.simple-handle')) as HTMLElement;
      const nodeEl = (target.closest('.flow-node') || target.closest('.container-node')) as HTMLElement;
      
      if (handleEl && nodeEl && edgeSourceNodeId) {
        const targetNodeId = nodeEl.dataset.nodeId;
        const targetHandle = handleEl.dataset.handleType;
        
        if (targetNodeId && targetNodeId !== edgeSourceNodeId && targetHandle === 'target') {
          // Create new edge
          const newEdge: FlowEdgeData = {
            id: `edge-${Date.now()}`,
            source: edgeSourceNodeId,
            target: targetNodeId,
            sourceHandle: edgeSourceHandle || 'default',
            targetHandle: targetHandle
          };
          
          edges.update(currentEdges => [...currentEdges, newEdge]);
          
          // If the edge was created from a child output handle (not 'default' or 'source'),
          // update the child's connectedTo property
          if (edgeSourceHandle && edgeSourceHandle !== 'default' && edgeSourceHandle !== 'source') {
            const childId = edgeSourceHandle;
            nodes.update(currentNodes =>
              currentNodes.map(n => {
                if (n.id !== edgeSourceNodeId) return n;
                
                // Update the child's connectedTo in outputs
                const outputs = (n.data?.outputs as Array<{ id: string; connectedTo?: string }>) || [];
                const updatedOutputs = outputs.map(o => 
                  o.id === childId ? { ...o, connectedTo: targetNodeId } : o
                );
                
                return { ...n, data: { ...n.data, outputs: updatedOutputs } };
              })
            );
          }
          
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
    activeChildId = null; // Clear child selection when selecting a node
    activeChildData = null;
    showOptionsPanel = true;
  }
  
  // Handle double-click on a child item within a container
  function handleChildDoubleClick(nodeId: string, childId: string, childData: Record<string, unknown>) {
    activeNodeId = nodeId; // Keep track of parent node
    activeChildId = childId;
    activeChildData = childData;
    showOptionsPanel = true;
  }
  
  // Handle going back to parent from child view
  function handleBackToParent() {
    activeChildId = null;
    activeChildData = null;
  }
  
  // Handle moving a child up in the list
  function handleMoveChildUp() {
    if (!activeNodeId || !activeChildId) return;
    
    saveHistory();
    
    nodes.update(currentNodes => 
      currentNodes.map(n => {
        if (n.id !== activeNodeId) return n;
        
        const outputs = [...(n.data.outputs as unknown[] || [])];
        const childIndex = outputs.findIndex((o: { id: string }) => o.id === activeChildId);
        
        if (childIndex > 0) {
          // Swap with previous item
          [outputs[childIndex - 1], outputs[childIndex]] = [outputs[childIndex], outputs[childIndex - 1]];
        }
        
        return { ...n, data: { ...n.data, outputs } };
      })
    );
  }
  
  // Handle moving a child down in the list
  function handleMoveChildDown() {
    if (!activeNodeId || !activeChildId) return;
    
    saveHistory();
    
    nodes.update(currentNodes => 
      currentNodes.map(n => {
        if (n.id !== activeNodeId) return n;
        
        const outputs = [...(n.data.outputs as unknown[] || [])];
        const childIndex = outputs.findIndex((o: { id: string }) => o.id === activeChildId);
        
        if (childIndex >= 0 && childIndex < outputs.length - 1) {
          // Swap with next item
          [outputs[childIndex], outputs[childIndex + 1]] = [outputs[childIndex + 1], outputs[childIndex]];
        }
        
        return { ...n, data: { ...n.data, outputs } };
      })
    );
  }
  
  // Handle deleting a child
  function handleDeleteChild() {
    if (!activeNodeId || !activeChildId) return;
    
    saveHistory();
    
    nodes.update(currentNodes => 
      currentNodes.map(n => {
        if (n.id !== activeNodeId) return n;
        
        const outputs = (n.data.outputs as unknown[] || []).filter(
          (o: { id: string }) => o.id !== activeChildId
        );
        
        return { ...n, data: { ...n.data, outputs } };
      })
    );
    
    // Go back to parent after deleting
    activeChildId = null;
    activeChildData = null;
  }
  
  // Handle updating a child's data
  function handleChildUpdate(childId: string, updates: Record<string, unknown>) {
    if (!activeNodeId) return;
    
    saveHistory();
    
    nodes.update(currentNodes => 
      currentNodes.map(n => {
        if (n.id !== activeNodeId) return n;
        
        const outputs = (n.data.outputs as unknown[] || []).map((o: { id: string; data?: Record<string, unknown> }) => {
          if (o.id !== childId) return o;
          return { ...o, ...updates, data: { ...(o.data || {}), ...updates } };
        });
        
        return { ...n, data: { ...n.data, outputs } };
      })
    );
    
    // Update the local child data state
    activeChildData = { ...activeChildData, ...updates };
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
    
    // Find all edges to delete to clear connectedTo properties
    const edgesToDelete = edgesData.filter(e => selectedEdgeIds.has(e.id));
    
    saveHistory();
    
    edges.update(currentEdges =>
      currentEdges.filter(e => !selectedEdgeIds.has(e.id))
    );
    
    // Clear connectedTo for any children that were sources of deleted edges
    const childUpdates = new Map<string, Set<string>>(); // nodeId -> Set of childIds to clear
    for (const edge of edgesToDelete) {
      if (edge.sourceHandle && edge.sourceHandle !== 'default' && edge.sourceHandle !== 'source') {
        if (!childUpdates.has(edge.source)) {
          childUpdates.set(edge.source, new Set());
        }
        childUpdates.get(edge.source)!.add(edge.sourceHandle);
      }
    }
    
    if (childUpdates.size > 0) {
      nodes.update(currentNodes =>
        currentNodes.map(n => {
          const childIds = childUpdates.get(n.id);
          if (!childIds) return n;
          
          const outputs = (n.data?.outputs as Array<{ id: string; connectedTo?: string }>) || [];
          const updatedOutputs = outputs.map(o => 
            childIds.has(o.id) ? { ...o, connectedTo: undefined } : o
          );
          
          return { ...n, data: { ...n.data, outputs: updatedOutputs } };
        })
      );
    }
    
    selectedEdgeIds = new Set();
  }
  
  // Delete a single edge directly (from edge X button or right-click)
  function handleDeleteSingleEdge(edgeId: string) {
    // Find the edge to get source info before deleting
    const edgeToDelete = edgesData.find(e => e.id === edgeId);
    
    saveHistory();
    
    edges.update(currentEdges =>
      currentEdges.filter(e => e.id !== edgeId)
    );
    
    // If the edge had a sourceHandle (came from a child), clear that child's connectedTo
    if (edgeToDelete && edgeToDelete.sourceHandle && 
        edgeToDelete.sourceHandle !== 'default' && edgeToDelete.sourceHandle !== 'source') {
      const childId = edgeToDelete.sourceHandle;
      const sourceNodeId = edgeToDelete.source;
      
      nodes.update(currentNodes =>
        currentNodes.map(n => {
          if (n.id !== sourceNodeId) return n;
          
          const outputs = (n.data?.outputs as Array<{ id: string; connectedTo?: string }>) || [];
          const updatedOutputs = outputs.map(o => 
            o.id === childId ? { ...o, connectedTo: undefined } : o
          );
          
          return { ...n, data: { ...n.data, outputs: updatedOutputs } };
        })
      );
    }
    
    // Clear selection if this edge was selected
    if (selectedEdgeIds.has(edgeId)) {
      const newSet = new Set(selectedEdgeIds);
      newSet.delete(edgeId);
      selectedEdgeIds = newSet;
    }
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
      showStartDropdown = false;
    }
  }
  
  // Close dropdown when clicking outside
  function handleDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.start-dropdown-btn') && !target.closest('.start-dropdown-menu')) {
      showStartDropdown = false;
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
  
  // Container types that use the burger-style rendering
  const containerTypes = [
    'action', 'default', 'switchBoard', 'natterboxAI', 'finish', 
    'toPolicy', 'fromPolicy', 'omniChannelFlow', 'inboundNumber',
    'extensionNumber', 'digital', 'invokableDestination', 'sipTrunk',
    'aiSupportChat', 'inboundMessage', 'ddi'
  ];
  
  function isContainerNode(nodeType: string): boolean {
    return containerTypes.includes(nodeType);
  }
  
  // Get node position for edge rendering
  function getNodeCenter(nodeId: string): { x: number; y: number } | null {
    const node = nodesData.find(n => n.id === nodeId);
    if (!node) return null;
    const { width, height } = calculateNodeDimensions(node);
    return {
      x: node.position.x + width / 2,
      y: node.position.y + height / 2
    };
  }
  
  // Calculate node dimensions - different for container vs simple nodes
  function calculateNodeDimensions(node: FlowNodeData): { width: number; height: number } {
    const subItems = (node.data?.subItems as unknown[]) || [];
    const outputs = (node.data?.outputs as unknown[]) || [];
    const children = [...subItems, ...outputs];
    
    if (isContainerNode(node.type)) {
      // Container node dimensions (burger style)
      const containerWidth = 200;
      const headerHeight = 30;
      const footerHeight = 30;
      const childItemHeight = 32;
      const dividerHeight = 1;
      
      const width = node.width || containerWidth;
      
      let height: number;
      if (node.height) {
        height = node.height;
      } else if (children.length === 0) {
        // Header + single divider + footer
        height = headerHeight + dividerHeight + footerHeight;
      } else {
        // Header + divider + body + divider + footer
        const bodyHeight = children.length * childItemHeight;
        height = headerHeight + dividerHeight + bodyHeight + dividerHeight + footerHeight;
      }
      
      return { width, height };
    } else {
      // Simple node dimensions
      const baseWidth = 150;
      const baseHeight = 60;
      const subItemHeight = 28;
      const maxDisplayItems = 5;
      
      const width = node.width || baseWidth;
      const hasSubItems = children.length > 0;
      
      let height: number;
      if (node.height) {
        height = node.height;
      } else if (!hasSubItems) {
        height = baseHeight;
      } else {
        const itemCount = Math.min(children.length, maxDisplayItems);
        height = baseHeight + (itemCount * subItemHeight);
      }
      
      return { width, height };
    }
  }
  
  // Get handle position for edge connections
  // Container nodes have input on upper bun and output on lower bun
  function getNodeHandlePosition(nodeId: string, handleType: string, handleId?: string, targetNodeId?: string): { x: number; y: number } | null {
    const node = nodesData.find(n => n.id === nodeId);
    if (!node) return null;
    
    const { width, height } = calculateNodeDimensions(node);
    
    if (isContainerNode(node.type)) {
      // Container node: input handle at top-left, output handle at bottom-right
      const headerHeight = 30;
      const footerHeight = 30;
      const childItemHeight = 32;
      const dividerHeight = 1;
      
      if (handleType === 'source' || handleType === 'right') {
        const outputs = (node.data?.outputs as Array<{ id: string; connectedTo?: string }>) || [];
        
        // Try to find the child by handleId first
        let childIndex = handleId && handleId !== 'default' && handleId !== 'source' 
          ? outputs.findIndex(o => o.id === handleId)
          : -1;
        
        // If not found by handleId, try to find by connectedTo matching the target
        if (childIndex < 0 && targetNodeId) {
          childIndex = outputs.findIndex(o => o.connectedTo === targetNodeId);
        }
        
        if (childIndex >= 0) {
          // Calculate Y position for this child's connector
          // Y = node top + header + divider + (childIndex * childHeight) + (childHeight / 2)
          const childY = node.position.y + headerHeight + dividerHeight + (childIndex * childItemHeight) + (childItemHeight / 2);
          return { x: node.position.x + width, y: childY };
        }
        
        // Default: output handle is on the footer (lower bun)
        return { x: node.position.x + width, y: node.position.y + height - (footerHeight / 2) };
      } else {
        // Input handle is on the header (upper bun)
        return { x: node.position.x, y: node.position.y + (headerHeight / 2) };
      }
    } else {
      // Simple node: handles at vertical center
      if (handleType === 'source' || handleType === 'right') {
        return { x: node.position.x + width, y: node.position.y + height / 2 };
      } else {
        return { x: node.position.x, y: node.position.y + height / 2 };
      }
    }
  }
  
  // ===== Start Button - Add Entry Point Node =====
  
  // Create a new entry point node from the Start button dropdown
  function handleAddEntryPointNode(nodeType: string, label: string) {
    saveHistory();
    
    // Find a good position - below existing entry point nodes
    const entryPointTypes = ['inboundNumber', 'extensionNumber', 'invokableDestination', 'sipTrunk', 'fromPolicy'];
    const existingEntryPoints = nodesData.filter(n => entryPointTypes.includes(n.type));
    
    let newY = 150; // Default starting position
    if (existingEntryPoints.length > 0) {
      // Find the bottom-most entry point
      const maxY = Math.max(...existingEntryPoints.map(n => {
        const { height } = calculateNodeDimensions(n);
        return n.position.y + height;
      }));
      newY = maxY + 30; // Add some spacing
    }
    
    const newNode: FlowNodeData = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position: { x: 50, y: newY },
      data: {
        label: label,
        name: label,
        outputs: [], // Entry point nodes start with no children
      }
    };
    
    nodes.update(currentNodes => [...currentNodes, newNode]);
  }
  
  // ===== Options Panel Callbacks =====
  
  // Create a new container node linked to the current node's output
  function handleCreateLink(containerType: string) {
    if (!activeNodeId) return;
    
    const sourceNode = nodesData.find(n => n.id === activeNodeId);
    if (!sourceNode) return;
    
    saveHistory();
    
    const { width: sourceWidth } = calculateNodeDimensions(sourceNode);
    
    // Create new container node positioned to the right
    const newNode: FlowNodeData = {
      id: `${containerType}-${Date.now()}`,
      type: containerType,
      position: {
        x: sourceNode.position.x + sourceWidth + 100,
        y: sourceNode.position.y
      },
      data: {
        label: containerType.charAt(0).toUpperCase() + containerType.slice(1),
      }
    };
    
    // Create edge from source to new node
    const newEdge: FlowEdgeData = {
      id: `edge-${Date.now()}`,
      source: activeNodeId,
      target: newNode.id,
      sourceHandle: 'default',
      targetHandle: 'target'
    };
    
    nodes.update(currentNodes => [...currentNodes, newNode]);
    edges.update(currentEdges => [...currentEdges, newEdge]);
    
    // Select the new node
    selectedNodeIds = new Set([newNode.id]);
    activeNodeId = newNode.id;
  }
  
  // Link current node to an existing container
  function handleLinkToExisting(targetNodeId: string) {
    if (!activeNodeId || activeNodeId === targetNodeId) return;
    
    saveHistory();
    
    const newEdge: FlowEdgeData = {
      id: `edge-${Date.now()}`,
      source: activeNodeId,
      target: targetNodeId,
      sourceHandle: 'default',
      targetHandle: 'target'
    };
    
    edges.update(currentEdges => [...currentEdges, newEdge]);
  }
  
  // Add a child app to the current container node
  function handleAddApp(appType: string) {
    if (!activeNodeId) return;
    
    const parentNode = nodesData.find(n => n.id === activeNodeId);
    if (!parentNode) return;
    
    saveHistory();
    
    // Create a new child item (output) in the parent node
    const newChildId = `child-${Date.now()}`;
    const newChild = {
      id: newChildId,
      name: appType.charAt(0).toUpperCase() + appType.slice(1),
      title: appType.charAt(0).toUpperCase() + appType.slice(1),
      templateClass: `Mod${appType.charAt(0).toUpperCase() + appType.slice(1)}`,
      data: {
        label: appType.charAt(0).toUpperCase() + appType.slice(1),
        type: appType
      }
    };
    
    const currentOutputs = (parentNode.data?.outputs as unknown[]) || [];
    
    nodes.update(currentNodes =>
      currentNodes.map(n =>
        n.id === activeNodeId 
          ? { ...n, data: { ...n.data, outputs: [...currentOutputs, newChild] } }
          : n
      )
    );
  }
  
  // Delete the currently selected/active node
  function handleDeleteActiveNode() {
    if (activeNodeId) {
      selectedNodeIds = new Set([activeNodeId]);
      handleNodeDelete();
    }
  }
  
  // Handle dropping an app onto a container node
  function handleAppDrop(nodeId: string, appType: string, appLabel: string) {
    saveHistory();
    
    // Create a new child item (output) in the container node
    const newChildId = `child-${Date.now()}`;
    const newChild = {
      id: newChildId,
      name: appLabel,
      title: appLabel,
      templateClass: `Mod${appType.charAt(0).toUpperCase() + appType.slice(1)}`,
      data: {
        label: appLabel,
        type: appType
      }
    };
    
    nodes.update(currentNodes =>
      currentNodes.map(n => {
        if (n.id !== nodeId) return n;
        
        const currentOutputs = (n.data?.outputs as unknown[]) || [];
        return {
          ...n,
          data: {
            ...n.data,
            outputs: [...currentOutputs, newChild]
          }
        };
      })
    );
    
    console.log(`[FlowEditor] Added app "${appLabel}" (${appType}) to node "${nodeId}"`);
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

<svelte:window onkeydown={handleKeyDown} onclick={handleDocumentClick} />

<div class="flow-editor-container h-full w-full flex">
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
      
      <div class="toolbar-divider"></div>
      
      <!-- Start button dropdown -->
      <div class="relative">
        <button
          class="start-dropdown-btn flex items-center gap-2 px-3 py-1.5 rounded"
          onclick={() => showStartDropdown = !showStartDropdown}
        >
          <span class="text-sm font-medium">Click here to start</span>
          <span class="chevron" class:open={showStartDropdown}>
            <ChevronDown class="w-4 h-4" />
          </span>
        </button>
        
        {#if showStartDropdown}
          <div class="start-dropdown-menu absolute top-full left-0 mt-1 py-1 rounded-lg shadow-xl z-50 min-w-[200px]">
            {#if !existingEntryPointTypes().has('inboundNumber')}
              <button
                class="dropdown-item flex items-center gap-2 w-full px-3 py-2 text-left text-sm"
                onclick={() => { handleAddEntryPointNode('inboundNumber', 'Inbound Numbers'); showStartDropdown = false; }}
              >
                <Phone class="w-4 h-4" />
                <span>Add Inbound Numbers</span>
              </button>
            {/if}
            {#if !existingEntryPointTypes().has('extensionNumber')}
              <button
                class="dropdown-item flex items-center gap-2 w-full px-3 py-2 text-left text-sm"
                onclick={() => { handleAddEntryPointNode('extensionNumber', 'Extension'); showStartDropdown = false; }}
              >
                <PhoneIncoming class="w-4 h-4" />
                <span>Add Extension</span>
              </button>
            {/if}
            {#if !existingEntryPointTypes().has('invokableDestination')}
              <button
                class="dropdown-item flex items-center gap-2 w-full px-3 py-2 text-left text-sm"
                onclick={() => { handleAddEntryPointNode('invokableDestination', 'Invokable Destination'); showStartDropdown = false; }}
              >
                <Globe class="w-4 h-4" />
                <span>Add Invokable Destination</span>
              </button>
            {/if}
            {#if !existingEntryPointTypes().has('sipTrunk')}
              <button
                class="dropdown-item flex items-center gap-2 w-full px-3 py-2 text-left text-sm"
                onclick={() => { handleAddEntryPointNode('sipTrunk', 'SIP Trunk'); showStartDropdown = false; }}
              >
                <Server class="w-4 h-4" />
                <span>From SIP Trunk</span>
              </button>
            {/if}
            {#if !existingEntryPointTypes().has('fromPolicy')}
              <button
                class="dropdown-item flex items-center gap-2 w-full px-3 py-2 text-left text-sm"
                onclick={() => { handleAddEntryPointNode('fromPolicy', 'From Policy'); showStartDropdown = false; }}
              >
                <Workflow class="w-4 h-4" />
                <span>From Policy</span>
              </button>
            {/if}
            {#if existingEntryPointTypes().size >= 5}
              <div class="px-3 py-2 text-sm text-gray-500 italic">
                All entry point types added
              </div>
            {/if}
          </div>
        {/if}
      </div>
      
      <div class="flex-1"></div>
      
      <!-- Delete policy button -->
      {#if canDelete}
        <button 
          class="flex items-center gap-2 px-3 py-1.5 text-red-400 border border-red-400/50 hover:bg-red-500/20 rounded disabled:opacity-50"
          onclick={() => onDelete?.()}
          disabled={isDeleting}
          title="Delete policy"
        >
          <Trash2 class="w-4 h-4" />
          <span class="text-sm">{isDeleting ? 'Deleting...' : 'Delete'}</span>
        </button>
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
          
          <!-- Render edges - use nodesHash to force re-render when nodes change -->
          {#each edgesData as edge (`${edge.id}-${nodesHash()}`)}
            {@const sourcePos = getNodeHandlePosition(edge.source, 'source', edge.sourceHandle, edge.target)}
            {@const targetPos = getNodeHandlePosition(edge.target, 'target', edge.targetHandle, edge.source)}
            {#if sourcePos && targetPos}
              <FlowEdge 
                {edge}
                {sourcePos}
                {targetPos}
                selected={selectedEdgeIds.has(edge.id)}
                onClick={(e) => handleEdgeClick(edge.id, e)}
                onDelete={() => handleDeleteSingleEdge(edge.id)}
              />
            {/if}
          {/each}
          
          <!-- Edge creation preview -->
          {#if isCreatingEdge && edgeSourceNodeId && edgePreviewEnd}
            {@const sourcePos = getNodeHandlePosition(edgeSourceNodeId, 'source', edgeSourceHandle || undefined)}
            {#if sourcePos}
              {@const dx = edgePreviewEnd.x - sourcePos.x}
              {@const dy = edgePreviewEnd.y - sourcePos.y}
              {@const absDx = Math.abs(dx)}
              {@const absDy = Math.abs(dy)}
              {@const minHorizontalRun = Math.max(80, absDy * 0.5)}
              {@const baseOffset = Math.max(minHorizontalRun, Math.min(absDx / 2, 200))}
              {@const offset = dx < 0 ? Math.max(baseOffset, absDy * 0.6 + 80) : baseOffset}
              {@const pathData = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + offset} ${sourcePos.y}, ${edgePreviewEnd.x - offset} ${edgePreviewEnd.y}, ${edgePreviewEnd.x} ${edgePreviewEnd.y}`}
              <path
                d={pathData}
                fill="none"
                stroke="rgb(var(--color-primary-500))"
                stroke-width="2"
                stroke-dasharray="8,4"
                stroke-linecap="round"
              />
              <!-- Preview endpoint indicator -->
              <circle
                cx={edgePreviewEnd.x}
                cy={edgePreviewEnd.y}
                r="6"
                fill="rgb(var(--color-primary-500))"
                fill-opacity="0.3"
                stroke="rgb(var(--color-primary-500))"
                stroke-width="2"
              />
            {/if}
          {/if}
        </svg>
        
        <!-- Render nodes -->
        {#each nodesData as node (node.id)}
          <FlowNode 
            {node}
            selected={selectedNodeIds.has(node.id)}
            connectedChildIds={connectedChildIds()}
            footerConnected={footerConnectedNodeIds().has(node.id)}
            inputConnected={inputConnectedNodeIds().has(node.id)}
            isCreatingEdge={isCreatingEdge && edgeSourceNodeId !== node.id}
            onDoubleClick={() => handleNodeDoubleClick(node.id)}
            onChildDoubleClick={(childId, childData) => handleChildDoubleClick(node.id, childId, childData)}
            onAppDrop={handleAppDrop}
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
        allNodes={nodesData}
        activeChildId={activeChildId}
        activeChildData={activeChildData}
        {users}
        {groups}
        {sounds}
        {phoneNumbers}
        onUpdate={(updates) => handleNodeUpdate(activeNodeId!, updates)}
        onChildUpdate={(childId, updates) => handleChildUpdate(childId, updates)}
        onClose={() => { showOptionsPanel = false; activeNodeId = null; activeChildId = null; activeChildData = null; }}
        onCreateLink={handleCreateLink}
        onLinkToExisting={handleLinkToExisting}
        onAddApp={handleAddApp}
        onDeleteNode={handleDeleteActiveNode}
        onBackToParent={handleBackToParent}
        onMoveChildUp={handleMoveChildUp}
        onMoveChildDown={handleMoveChildDown}
        onDeleteChild={handleDeleteChild}
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
    background-color: rgb(var(--color-surface-700));
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
  
  /* Start dropdown button - styled like Save button */
  .start-dropdown-btn {
    background-color: rgb(37 99 235); /* bg-blue-600 */
    color: white;
  }
  
  .start-dropdown-btn:hover {
    background-color: rgb(29 78 216); /* bg-blue-700 */
  }
  
  .start-dropdown-btn .chevron {
    transition: transform 0.2s ease;
  }
  
  .start-dropdown-btn .chevron.open {
    transform: rotate(180deg);
  }
  
  .start-dropdown-menu {
    background-color: rgb(var(--color-surface-800));
    border: 1px solid rgb(var(--color-surface-600));
  }
  
  .dropdown-item {
    color: rgb(var(--color-surface-200));
  }
  
  .dropdown-item:hover {
    background-color: rgb(var(--color-surface-700));
    color: white;
  }
</style>
