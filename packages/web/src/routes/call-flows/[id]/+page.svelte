<script lang="ts">
  import { page } from '$app/stores';
  import { Card, Button, Badge } from '$lib/components/ui';
  import {
    Save,
    Play,
    Undo,
    Redo,
    ZoomIn,
    ZoomOut,
    Grid,
    Settings,
    Plus,
    Phone,
    Menu,
    Voicemail,
    Users,
    Clock,
    ArrowRight,
    Volume2,
  } from 'lucide-svelte';

  // Get call flow ID from URL
  const callFlowId = $derived($page.params.id);

  // Mock call flow data
  const callFlow = {
    id: callFlowId,
    name: 'Main IVR',
    status: 'draft' as const,
    description: 'Primary incoming call flow with department routing',
  };

  // Available node types for the builder
  const nodeTypes = [
    { type: 'menu', label: 'Menu', icon: Menu, description: 'IVR menu with options' },
    { type: 'transfer', label: 'Transfer', icon: Phone, description: 'Transfer to extension or number' },
    { type: 'voicemail', label: 'Voicemail', icon: Voicemail, description: 'Send to voicemail' },
    { type: 'queue', label: 'Queue', icon: Users, description: 'Add to call queue' },
    { type: 'time', label: 'Time Check', icon: Clock, description: 'Time-based routing' },
    { type: 'announcement', label: 'Announcement', icon: Volume2, description: 'Play audio message' },
  ];

  // Sample nodes on the canvas (would be dynamic in real implementation)
  const nodes = $state([
    { id: 'start', type: 'start', x: 100, y: 200, label: 'Start' },
    { id: 'menu1', type: 'menu', x: 300, y: 200, label: 'Main Menu' },
    { id: 'sales', type: 'queue', x: 550, y: 100, label: 'Sales Queue' },
    { id: 'support', type: 'queue', x: 550, y: 300, label: 'Support Queue' },
  ]);

  let selectedNodeId = $state<string | null>(null);
  let canvasScale = $state(1);

  function selectNode(nodeId: string) {
    selectedNodeId = nodeId;
  }

  function zoomIn() {
    canvasScale = Math.min(canvasScale + 0.1, 2);
  }

  function zoomOut() {
    canvasScale = Math.max(canvasScale - 0.1, 0.5);
  }
</script>

<svelte:head>
  <title>{callFlow.name} | Call Flow Builder</title>
</svelte:head>

<div class="h-[calc(100vh-8rem)] flex flex-col -m-6 lg:-m-8">
  <!-- Toolbar -->
  <div class="bg-bg-primary border-b border-border px-4 py-2 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div>
        <h1 class="font-semibold">{callFlow.name}</h1>
        <div class="flex items-center gap-2 text-sm">
          <Badge variant={callFlow.status === 'draft' ? 'warning' : 'success'}>
            {callFlow.status}
          </Badge>
          <span class="text-text-secondary">Last saved 5 min ago</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <div class="flex items-center border border-border rounded-base">
        <Button variant="ghost" size="sm" onclick={() => {}}>
          <Undo class="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onclick={() => {}}>
          <Redo class="w-4 h-4" />
        </Button>
      </div>

      <div class="flex items-center border border-border rounded-base">
        <Button variant="ghost" size="sm" onclick={zoomOut}>
          <ZoomOut class="w-4 h-4" />
        </Button>
        <span class="px-2 text-sm text-text-secondary">{Math.round(canvasScale * 100)}%</span>
        <Button variant="ghost" size="sm" onclick={zoomIn}>
          <ZoomIn class="w-4 h-4" />
        </Button>
      </div>

      <Button variant="ghost" size="sm">
        <Grid class="w-4 h-4" />
      </Button>

      <div class="w-px h-6 bg-border mx-2"></div>

      <Button variant="secondary" size="sm">
        <Save class="w-4 h-4 mr-2" />
        Save
      </Button>
      <Button variant="primary" size="sm">
        <Play class="w-4 h-4 mr-2" />
        Publish
      </Button>
    </div>
  </div>

  <!-- Main Content -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Sidebar - Node Palette -->
    <div class="w-64 bg-bg-secondary border-r border-border p-4 overflow-y-auto">
      <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
        Add Node
      </h2>
      <div class="space-y-2">
        {#each nodeTypes as nodeType}
          <button
            class="w-full p-3 bg-bg-primary border border-border rounded-base hover:border-accent hover:shadow-sm transition-all text-left group"
            draggable="true"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-accent/10 rounded-base group-hover:bg-accent/20 transition-colors">
                <svelte:component this={nodeType.icon} class="w-4 h-4 text-accent" />
              </div>
              <div>
                <p class="font-medium text-sm">{nodeType.label}</p>
                <p class="text-xs text-text-secondary">{nodeType.description}</p>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Canvas -->
    <div class="flex-1 bg-bg-tertiary overflow-auto relative">
      <div
        class="absolute inset-0"
        style="
          background-image: radial-gradient(circle, rgb(var(--color-border)) 1px, transparent 1px);
          background-size: 20px 20px;
          transform: scale({canvasScale});
          transform-origin: top left;
        "
      >
        <!-- SVG for connections -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none">
          <!-- Connection: Start -> Menu -->
          <path
            d="M 170 220 Q 235 220 270 220"
            stroke="rgb(var(--color-accent))"
            stroke-width="2"
            fill="none"
          />
          <!-- Connection: Menu -> Sales -->
          <path
            d="M 390 200 Q 450 150 520 120"
            stroke="rgb(var(--color-accent))"
            stroke-width="2"
            fill="none"
          />
          <!-- Connection: Menu -> Support -->
          <path
            d="M 390 220 Q 450 270 520 320"
            stroke="rgb(var(--color-accent))"
            stroke-width="2"
            fill="none"
          />
        </svg>

        <!-- Nodes -->
        {#each nodes as node}
          <button
            class="absolute p-3 bg-bg-primary border-2 rounded-base shadow-sm cursor-move transition-all
                   {selectedNodeId === node.id ? 'border-accent shadow-md' : 'border-border hover:border-accent/50'}"
            style="left: {node.x}px; top: {node.y}px; min-width: 120px;"
            onclick={() => selectNode(node.id)}
          >
            <div class="flex items-center gap-2">
              {#if node.type === 'start'}
                <div class="w-3 h-3 rounded-full bg-success"></div>
              {:else if node.type === 'menu'}
                <Menu class="w-4 h-4 text-accent" />
              {:else if node.type === 'queue'}
                <Users class="w-4 h-4 text-accent" />
              {/if}
              <span class="font-medium text-sm">{node.label}</span>
            </div>
            {#if node.type !== 'start'}
              <div class="mt-2 flex items-center justify-between text-xs text-text-secondary">
                <span>Click to configure</span>
                <ArrowRight class="w-3 h-3" />
              </div>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Right Sidebar - Properties -->
    <div class="w-72 bg-bg-secondary border-l border-border p-4 overflow-y-auto">
      <div class="flex items-center gap-2 mb-4">
        <Settings class="w-5 h-5 text-text-secondary" />
        <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Properties
        </h2>
      </div>

      {#if selectedNodeId}
        {@const selectedNode = nodes.find((n) => n.id === selectedNodeId)}
        {#if selectedNode}
          <Card>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1.5">Node Name</label>
                <input
                  type="text"
                  value={selectedNode.label}
                  class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {#if selectedNode.type === 'menu'}
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1.5"
                    >Menu Prompt</label
                  >
                  <textarea
                    rows="3"
                    class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    placeholder="Enter menu prompt text..."
                  ></textarea>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1.5"
                    >Menu Options</label
                  >
                  <div class="space-y-2">
                    <div class="flex items-center gap-2 p-2 bg-bg-tertiary rounded-base">
                      <span class="font-mono text-sm">1</span>
                      <ArrowRight class="w-4 h-4 text-text-secondary" />
                      <span class="text-sm">Sales Queue</span>
                    </div>
                    <div class="flex items-center gap-2 p-2 bg-bg-tertiary rounded-base">
                      <span class="font-mono text-sm">2</span>
                      <ArrowRight class="w-4 h-4 text-text-secondary" />
                      <span class="text-sm">Support Queue</span>
                    </div>
                    <Button variant="ghost" size="sm" class="w-full">
                      <Plus class="w-4 h-4 mr-1" />
                      Add Option
                    </Button>
                  </div>
                </div>
              {/if}

              {#if selectedNode.type === 'queue'}
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1.5">Group</label>
                  <select
                    class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option>Sales Team</option>
                    <option>Support Team</option>
                    <option>Technical Support</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1.5"
                    >Max Wait Time (seconds)</label
                  >
                  <input
                    type="number"
                    value="300"
                    class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              {/if}
            </div>
          </Card>
        {/if}
      {:else}
        <Card class="text-center py-8">
          <Settings class="w-8 h-8 text-text-secondary mx-auto mb-2" />
          <p class="text-text-secondary text-sm">Select a node to edit its properties</p>
        </Card>
      {/if}
    </div>
  </div>
</div>

