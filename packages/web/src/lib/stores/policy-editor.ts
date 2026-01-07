import { writable, derived, get } from 'svelte/store';

// Local type definitions to avoid importing @xyflow/svelte at module level
// These mirror the types from @xyflow/svelte
export interface Node {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  selected?: boolean;
  dragging?: boolean;
  hidden?: boolean;
  width?: number;
  height?: number;
  parentNode?: string;
  zIndex?: number;
  extent?: 'parent' | [[number, number], [number, number]];
  expandParent?: boolean;
  sourcePosition?: 'left' | 'right' | 'top' | 'bottom';
  targetPosition?: 'left' | 'right' | 'top' | 'bottom';
  dragHandle?: string;
  connectable?: boolean;
  deletable?: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  data?: Record<string, unknown>;
  selected?: boolean;
  animated?: boolean;
  hidden?: boolean;
  label?: string;
  labelStyle?: Record<string, string>;
  labelShowBg?: boolean;
  labelBgStyle?: Record<string, string>;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  style?: Record<string, string>;
  className?: string;
  zIndex?: number;
  markerStart?: string | { type: string; color?: string; width?: number; height?: number };
  markerEnd?: string | { type: string; color?: string; width?: number; height?: number };
  deletable?: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Types
export interface PolicyState {
  id: string | null;
  name: string;
  description: string;
  color: string;
  grid: boolean;
  isActive: boolean;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
}

export interface ActiveNodeState {
  node: Node | null;
  overlayTab: string | null;
}

export interface SelectionState {
  nodes: string[];
  edges: string[];
  mode: 'select' | 'drag' | null;
}

export type InteractionMode = 'SELECT' | 'DRAG';

export interface PolicyEditorContext {
  users: Array<{ id: string; name: string; email?: string }>;
  groups: Array<{ id: string; name: string }>;
  sounds: Array<{ id: string; name: string; url?: string }>;
  phoneNumbers: Array<{ id: string; name: string; number: string }>;
}

// Initial states
const initialPolicyState: PolicyState = {
  id: null,
  name: '',
  description: '',
  color: '#3b82f6',
  grid: true,
  isActive: false,
  isDirty: false,
  isSaving: false,
  lastSaved: null,
};

const initialActiveNode: ActiveNodeState = {
  node: null,
  overlayTab: null,
};

const initialSelection: SelectionState = {
  nodes: [],
  edges: [],
  mode: null,
};

const initialContext: PolicyEditorContext = {
  users: [],
  groups: [],
  sounds: [],
  phoneNumbers: [],
};

// Stores
export const policyState = writable<PolicyState>(initialPolicyState);
export const nodes = writable<Node[]>([]);
export const edges = writable<Edge[]>([]);
export const viewport = writable<Viewport>({ x: 0, y: 0, zoom: 1 });
export const activeNode = writable<ActiveNodeState>(initialActiveNode);
export const selection = writable<SelectionState>(initialSelection);
export const interactionMode = writable<InteractionMode>('SELECT');
export const editorContext = writable<PolicyEditorContext>(initialContext);
export const clipboard = writable<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
export const history = writable<{ past: Array<{ nodes: Node[]; edges: Edge[] }>; future: Array<{ nodes: Node[]; edges: Edge[] }> }>({ past: [], future: [] });

// Derived stores
export const hasUnsavedChanges = derived(policyState, ($policy) => $policy.isDirty);

export const selectedNodes = derived(
  [nodes, selection],
  ([$nodes, $selection]) => $nodes.filter((n) => $selection.nodes.includes(n.id))
);

export const selectedEdges = derived(
  [edges, selection],
  ([$edges, $selection]) => $edges.filter((e) => $selection.edges.includes(e.id))
);

export const canUndo = derived(history, ($history) => $history.past.length > 0);
export const canRedo = derived(history, ($history) => $history.future.length > 0);

// Actions
export function initializePolicy(
  policy: {
    id: string;
    name: string;
    description: string;
    body: { nodes: Node[]; edges: Edge[]; viewport?: Viewport };
    color?: string;
    grid?: boolean;
    isActive: boolean;
  },
  context: PolicyEditorContext
) {
  policyState.set({
    id: policy.id,
    name: policy.name,
    description: policy.description,
    color: policy.color || '#3b82f6',
    grid: policy.grid ?? true,
    isActive: policy.isActive,
    isDirty: false,
    isSaving: false,
    lastSaved: null,
  });

  nodes.set(policy.body.nodes || []);
  edges.set(policy.body.edges || []);
  viewport.set(policy.body.viewport || { x: 0, y: 0, zoom: 1 });
  editorContext.set(context);
  history.set({ past: [], future: [] });
  selection.set(initialSelection);
  activeNode.set(initialActiveNode);
}

export function setNodes(newNodes: Node[]) {
  saveToHistory();
  nodes.set(newNodes);
  markDirty();
}

export function setEdges(newEdges: Edge[]) {
  saveToHistory();
  edges.set(newEdges);
  markDirty();
}

export function updateNode(nodeId: string, data: Partial<Node['data']>) {
  saveToHistory();
  nodes.update((n) =>
    n.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    )
  );
  markDirty();
}

export function addNode(node: Node) {
  saveToHistory();
  nodes.update((n) => [...n, node]);
  markDirty();
}

export function removeNodes(nodeIds: string[]) {
  saveToHistory();
  nodes.update((n) => n.filter((node) => !nodeIds.includes(node.id)));
  // Also remove connected edges
  edges.update((e) =>
    e.filter((edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target))
  );
  markDirty();
}

export function addEdge(edge: Edge) {
  saveToHistory();
  edges.update((e) => [...e, edge]);
  markDirty();
}

export function removeEdges(edgeIds: string[]) {
  saveToHistory();
  edges.update((e) => e.filter((edge) => !edgeIds.includes(edge.id)));
  markDirty();
}

export function setActiveNode(node: Node | null, tab?: string) {
  activeNode.set({
    node,
    overlayTab: tab || null,
  });
}

export function clearActiveNode() {
  activeNode.set(initialActiveNode);
}

export function setSelection(nodeIds: string[], edgeIds: string[] = []) {
  selection.set({
    nodes: nodeIds,
    edges: edgeIds,
    mode: get(selection).mode,
  });
}

export function clearSelection() {
  selection.set(initialSelection);
}

export function setInteractionMode(mode: InteractionMode) {
  interactionMode.set(mode);
}

export function markDirty() {
  policyState.update((s) => ({ ...s, isDirty: true }));
}

export function markSaving() {
  policyState.update((s) => ({ ...s, isSaving: true }));
}

export function markSaved() {
  policyState.update((s) => ({
    ...s,
    isDirty: false,
    isSaving: false,
    lastSaved: new Date(),
  }));
}

// History management
function saveToHistory() {
  const currentNodes = get(nodes);
  const currentEdges = get(edges);
  
  history.update((h) => ({
    past: [...h.past.slice(-49), { nodes: currentNodes, edges: currentEdges }],
    future: [],
  }));
}

export function undo() {
  const h = get(history);
  if (h.past.length === 0) return;

  const currentNodes = get(nodes);
  const currentEdges = get(edges);
  const previous = h.past[h.past.length - 1];

  history.set({
    past: h.past.slice(0, -1),
    future: [{ nodes: currentNodes, edges: currentEdges }, ...h.future],
  });

  nodes.set(previous.nodes);
  edges.set(previous.edges);
  markDirty();
}

export function redo() {
  const h = get(history);
  if (h.future.length === 0) return;

  const currentNodes = get(nodes);
  const currentEdges = get(edges);
  const next = h.future[0];

  history.set({
    past: [...h.past, { nodes: currentNodes, edges: currentEdges }],
    future: h.future.slice(1),
  });

  nodes.set(next.nodes);
  edges.set(next.edges);
  markDirty();
}

// Clipboard operations
export function copySelection() {
  const sel = get(selection);
  const allNodes = get(nodes);
  const allEdges = get(edges);

  const copiedNodes = allNodes.filter((n) => sel.nodes.includes(n.id));
  const copiedEdges = allEdges.filter(
    (e) => sel.nodes.includes(e.source) && sel.nodes.includes(e.target)
  );

  clipboard.set({ nodes: copiedNodes, edges: copiedEdges });
}

export function pasteFromClipboard(offsetX = 50, offsetY = 50) {
  const clip = get(clipboard);
  if (clip.nodes.length === 0) return;

  saveToHistory();

  // Generate new IDs and offset positions
  const idMap = new Map<string, string>();
  const newNodes = clip.nodes.map((node) => {
    const newId = `${node.id}-copy-${Date.now()}`;
    idMap.set(node.id, newId);
    return {
      ...node,
      id: newId,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY,
      },
      selected: true,
    };
  });

  const newEdges = clip.edges.map((edge) => ({
    ...edge,
    id: `${edge.id}-copy-${Date.now()}`,
    source: idMap.get(edge.source) || edge.source,
    target: idMap.get(edge.target) || edge.target,
  }));

  nodes.update((n) => [...n.map((node) => ({ ...node, selected: false })), ...newNodes]);
  edges.update((e) => [...e, ...newEdges]);

  setSelection(newNodes.map((n) => n.id));
  markDirty();
}

export function deleteSelection() {
  const sel = get(selection);
  if (sel.nodes.length === 0 && sel.edges.length === 0) return;

  removeNodes(sel.nodes);
  removeEdges(sel.edges);
  clearSelection();
  clearActiveNode();
}

// Export policy as JSON
export function exportPolicy(): string {
  const state = get(policyState);
  const allNodes = get(nodes);
  const allEdges = get(edges);
  const vp = get(viewport);

  return JSON.stringify({
    name: state.name,
    description: state.description,
    color: state.color,
    grid: state.grid,
    body: {
      nodes: allNodes,
      edges: allEdges,
      viewport: vp,
    },
  }, null, 2);
}

// Reset store
export function resetPolicyEditor() {
  policyState.set(initialPolicyState);
  nodes.set([]);
  edges.set([]);
  viewport.set({ x: 0, y: 0, zoom: 1 });
  activeNode.set(initialActiveNode);
  selection.set(initialSelection);
  interactionMode.set('SELECT');
  clipboard.set({ nodes: [], edges: [] });
  history.set({ past: [], future: [] });
}

