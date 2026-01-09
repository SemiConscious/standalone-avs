<script lang="ts">
  import { X, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft } from 'lucide-svelte';
  import { 
    Play, Users, GitBranch, MessageSquare, Mic, Bot, 
    Database, FileText, Settings, Voicemail, Send, 
    Clock, AlertTriangle, Search, Workflow, Square,
    PhoneOutgoing
  } from 'lucide-svelte';
  
  // Import configuration components
  import { 
    SpeakConfig, 
    CallQueueConfig, 
    RuleConfig, 
    ConnectCallConfig, 
    RecordCallConfig,
    NotifyConfig,
    SwitchItemConfig,
    QueryObjectConfig
  } from './config';
  
  /**
   * NodeOptionsPanel - Right sidebar panel for editing node properties
   * 
   * Matches the React app's three-tab structure:
   * - CONFIGURATION: Edit node name and type-specific settings
   * - LINK: Configure where the default output connects
   * - APPS: Add child components to container nodes
   * 
   * Also handles child item configuration when a child is selected.
   */
  
  interface FlowNodeData {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
    selected?: boolean;
    width?: number;
    height?: number;
  }
  
  interface ContainerOption {
    type: string;
    label: string;
    icon: typeof Play;
    color: string;
    description: string;
  }
  
  interface AppOption {
    type: string;
    label: string;
    icon: typeof Play;
    color: string;
    description?: string;
    requiresLicense?: string;
    containers?: string[];
  }
  
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
    node: FlowNodeData;
    allNodes?: FlowNodeData[];
    activeChildId?: string | null;
    activeChildData?: Record<string, unknown> | null;
    // Data sources from Salesforce
    users?: UserData[];
    groups?: GroupData[];
    sounds?: SoundData[];
    phoneNumbers?: PhoneNumberData[];
    // Callbacks
    onClose: () => void;
    onUpdate: (data: Record<string, unknown>) => void;
    onChildUpdate?: (childId: string, data: Record<string, unknown>) => void;
    onCreateLink?: (containerType: string) => void;
    onLinkToExisting?: (targetNodeId: string) => void;
    onAddApp?: (appType: string) => void;
    onDeleteNode?: () => void;
    onBackToParent?: () => void;
    onMoveChildUp?: () => void;
    onMoveChildDown?: () => void;
    onDeleteChild?: () => void;
  }
  
  let { 
    node, 
    allNodes = [],
    activeChildId = null,
    activeChildData = null,
    // Data sources
    users = [],
    groups = [],
    sounds = [],
    phoneNumbers = [],
    // Callbacks
    onClose, 
    onUpdate,
    onChildUpdate,
    onCreateLink,
    onLinkToExisting,
    onAddApp,
    onDeleteNode,
    onBackToParent,
    onMoveChildUp,
    onMoveChildDown,
    onDeleteChild
  }: Props = $props();
  
  /**
   * Handle config changes from child config components
   * This function propagates changes up through onChildUpdate or onUpdate
   */
  function handleChildConfigChange(field: string, value: unknown) {
    if (isViewingChild && activeChildId && onChildUpdate) {
      // Get current child data
      const currentData = activeChildData || {};
      const currentVariables = (currentData.variables as Record<string, unknown>) || {};
      const currentConfig = (currentData.config as Record<string, unknown>) || {};
      
      // Update the appropriate storage location based on field
      // Most child apps store in variables or config
      const updatedChild = {
        ...currentData,
        variables: { ...currentVariables, [field]: value },
        config: { ...currentConfig, [field]: value },
      };
      
      onChildUpdate(activeChildId, updatedChild);
    }
  }
  
  // Check if we're viewing a child item
  const isViewingChild = $derived(!!activeChildId && !!activeChildData);
  
  // Active tab state
  let activeTab = $state<'configuration' | 'link' | 'apps'>('configuration');
  
  // Determine which tabs are available based on node type (or child type when viewing a child)
  const availableTabs = $derived(() => {
    // When viewing a child, only show Configuration and Link tabs
    if (isViewingChild) {
      return ['configuration', 'link'] as const;
    }
    
    const type = node?.type || '';
    
    // Container nodes with all 3 tabs
    if (['action', 'default', 'switchBoard', 'natterboxAI', 'omniChannelFlow'].includes(type)) {
      return ['configuration', 'link', 'apps'] as const;
    }
    
    // Finish and ToPolicy: Config + Apps (no Link)
    if (['finish', 'toPolicy'].includes(type)) {
      return ['configuration', 'apps'] as const;
    }
    
    // Entry points and simple nodes: Config + Link (no Apps)
    if (['inboundNumber', 'extensionNumber', 'sipTrunk', 'inboundMessage', 'invokableDestination', 'fromPolicy', 'digital', 'input'].includes(type)) {
      return ['configuration', 'link'] as const;
    }
    
    // Child apps: Config only
    if (['speak', 'callQueue', 'huntGroup', 'voicemail', 'queryObject', 'createRecord', 'recordCall', 'connectCall', 'notify', 'rule', 'manageProperties', 'retry', 'debug', 'switchItem', 'getInfo', 'route'].includes(type)) {
      return ['configuration', 'link'] as const;
    }
    
    // Default: all tabs
    return ['configuration', 'link', 'apps'] as const;
  });
  
  // Ensure active tab is valid for current node
  $effect(() => {
    const tabs = availableTabs();
    if (!tabs.includes(activeTab)) {
      activeTab = tabs[0];
    }
  });
  
  // Local state for editing
  let label = $state(node?.data?.label as string || node?.data?.name as string || '');
  let description = $state(node?.data?.description as string || '');
  let selectedLinkTarget = $state<string>('');
  
  // Child-specific editing state
  let childLabel = $state('');
  let childDescription = $state('');
  
  // Update local state when node changes
  $effect(() => {
    if (node) {
      label = node.data?.label as string || node.data?.name as string || '';
      description = node.data?.description as string || '';
    }
  });
  
  // Update child state when activeChildData changes
  $effect(() => {
    if (activeChildData) {
      childLabel = (activeChildData.name as string) || 
                   (activeChildData.title as string) || 
                   (activeChildData.data as Record<string, unknown>)?.label as string ||
                   (activeChildData.data as Record<string, unknown>)?.name as string || '';
      childDescription = (activeChildData.data as Record<string, unknown>)?.description as string || '';
    }
  });
  
  // Node and child type display info
  const nodeTypeInfo: Record<string, { name: string; description: string; color: string }> = {
    // Container types
    action: { name: 'ACTION', description: 'A container for action', color: '#3498db' },
    default: { name: 'ACTION', description: 'A container for action', color: '#3498db' },
    switchBoard: { name: 'SWITCHBOARD', description: 'Route calls based on input', color: '#e74c3c' },
    natterboxAI: { name: 'NATTERBOX AI', description: 'AI-powered call handling', color: '#2ecc71' },
    finish: { name: 'FINISH', description: 'End the call flow', color: '#7f8c8d' },
    toPolicy: { name: 'TO POLICY', description: 'Transfer to another policy', color: '#9b59b6' },
    fromPolicy: { name: 'FROM POLICY', description: 'Entry point from another policy', color: '#9b59b6' },
    omniChannelFlow: { name: 'OMNI CHANNEL FLOW', description: 'Salesforce Omni-Channel integration', color: '#f39c12' },
    
    // Entry points
    inboundNumber: { name: 'INBOUND NUMBER', description: 'Entry point for inbound calls', color: '#f1c40f' },
    input: { name: 'INBOUND NUMBER', description: 'Entry point for inbound calls', color: '#f1c40f' },
    digital: { name: 'DIGITAL', description: 'Digital channel entry point', color: '#f1c40f' },
    extensionNumber: { name: 'EXTENSION', description: 'Internal extension number', color: '#e67e22' },
    sipTrunk: { name: 'SIP TRUNK', description: 'SIP trunk entry point', color: '#1abc9c' },
    inboundMessage: { name: 'INBOUND MESSAGE', description: 'Entry point for messages', color: '#34495e' },
    invokableDestination: { name: 'INVOKABLE DESTINATION', description: 'Salesforce invocable destination', color: '#95a5a6' },
    
    // Child App types (can be both apps inside containers and standalone nodes)
    speak: { name: 'SPEAK', description: 'Play audio or text-to-speech', color: '#ec4899' },
    callQueue: { name: 'CALL QUEUE', description: 'Queue calls for agents', color: '#f59e0b' },
    huntGroup: { name: 'HUNT GROUP', description: 'Ring group of users', color: '#f97316' },
    voicemail: { name: 'VOICEMAIL', description: 'Record voicemail', color: '#3b82f6' },
    queryObject: { name: 'QUERY OBJECT', description: 'Query Salesforce data', color: '#10b981' },
    createRecord: { name: 'CREATE RECORD', description: 'Create Salesforce record', color: '#14b8a6' },
    updateRecord: { name: 'UPDATE RECORD', description: 'Update Salesforce record', color: '#2dd4bf' },
    recordCall: { name: 'RECORD CALL', description: 'Record the call', color: '#f43f5e' },
    recordAndAnalyse: { name: 'RECORD & ANALYSE', description: 'Record and transcribe call', color: '#f43f5e' },
    connectCall: { name: 'CONNECT CALL', description: 'Connect to external number', color: '#06b6d4' },
    notify: { name: 'NOTIFY', description: 'Send notification', color: '#0ea5e9' },
    rule: { name: 'RULE', description: 'Conditional branching', color: '#8b5cf6' },
    manageProperties: { name: 'MANAGE PROPERTIES', description: 'Set call properties', color: '#22d3ee' },
    scriptEngine: { name: 'SCRIPT ENGINE', description: 'Execute custom script', color: '#a78bfa' },
    requestSkills: { name: 'REQUEST SKILLS', description: 'Request agent skills', color: '#4ade80' },
    sendMessage: { name: 'SEND MESSAGE', description: 'Send SMS or message', color: '#fb923c' },
    sendTemplate: { name: 'SEND TEMPLATE', description: 'Send message template', color: '#fbbf24' },
    debug: { name: 'DEBUG', description: 'Debug information', color: '#f87171' },
    retry: { name: 'RETRY', description: 'Retry previous action', color: '#a3e635' },
    
    // SwitchBoard children
    switchItem: { name: 'SWITCH ITEM', description: 'Menu option (DTMF key)', color: '#e74c3c' },
    getInfo: { name: 'GET INFO', description: 'Collect user input', color: '#d95879' },
    
    // AI children
    aiAgent: { name: 'AI AGENT', description: 'AI-powered agent', color: '#2ecc71' },
    aiGetSkills: { name: 'GET SKILLS', description: 'Get AI skills', color: '#2ecc71' },
    aiInstructions: { name: 'INSTRUCTIONS', description: 'AI instructions', color: '#2ecc71' },
    aiKnowledge: { name: 'KNOWLEDGE', description: 'Knowledge base', color: '#2ecc71' },
    aiResponse: { name: 'RESPONSE', description: 'AI response', color: '#2ecc71' },
    aiRouter: { name: 'ROUTER', description: 'AI routing', color: '#2ecc71' },
    aiVoicemail: { name: 'AI VOICEMAIL', description: 'AI voicemail', color: '#2ecc71' },
    aiPersona: { name: 'PERSONA', description: 'AI persona', color: '#2ecc71' },
    aiSettings: { name: 'AI SETTINGS', description: 'AI settings', color: '#2ecc71' },
    
    // OmniChannel children
    route: { name: 'ROUTE', description: 'Omni-Channel routing', color: '#f39c12' },
  };
  
  // Get type info - either for node or for child
  const typeInfo = $derived(() => {
    if (isViewingChild && activeChildData) {
      const childType = (activeChildData.type as string) || 
                        (activeChildData.templateClass as string)?.replace('Mod', '').toLowerCase() ||
                        'default';
      return nodeTypeInfo[childType] || { name: childType.toUpperCase(), description: 'Child component', color: '#64748b' };
    }
    return nodeTypeInfo[node?.type || 'default'] || nodeTypeInfo.default;
  });
  
  // Get the name to display for a child
  function getChildDisplayName(): string {
    if (!activeChildData) return 'Unknown';
    return (activeChildData.name as string) || 
           (activeChildData.title as string) || 
           (activeChildData.data as Record<string, unknown>)?.label as string || 
           (activeChildData.data as Record<string, unknown>)?.name as string ||
           typeInfo().name;
  }
  
  // Container types available for LINK tab "Create new container" section
  const containerOptions: ContainerOption[] = [
    { type: 'action', label: 'Action', icon: Play, color: '#2ecbbf', description: 'Generic action container' },
    { type: 'switchBoard', label: 'SwitchBoard', icon: Search, color: '#d95879', description: 'Route based on input' },
    { type: 'toPolicy', label: 'To Policy', icon: GitBranch, color: '#963cbd', description: 'Transfer to policy' },
    { type: 'finish', label: 'Finish', icon: Square, color: '#666666', description: 'End the flow' },
    { type: 'omniChannelFlow', label: 'Omni Channel Flow', icon: Workflow, color: '#00a1e0', description: 'Salesforce Omni-Channel' },
  ];
  
  // App types available for APPS tab - organized by container type
  const allAppOptions: AppOption[] = [
    // ACTION container apps
    { type: 'speak', label: 'Speak', icon: MessageSquare, color: '#ec4899', description: 'Play audio or TTS', containers: ['action', 'default'] },
    { type: 'callQueue', label: 'Call Queue', icon: Users, color: '#f59e0b', description: 'Queue for agents', containers: ['action', 'default'] },
    { type: 'huntGroup', label: 'Hunt Group', icon: Users, color: '#f97316', description: 'Ring group', containers: ['action', 'default'] },
    { type: 'queryObject', label: 'Query Object', icon: Database, color: '#10b981', description: 'Query Salesforce', containers: ['action', 'default'] },
    { type: 'createRecord', label: 'Create Record', icon: FileText, color: '#14b8a6', description: 'Create record', containers: ['action', 'default'] },
    { type: 'updateRecord', label: 'Update Record', icon: FileText, color: '#14b8a6', description: 'Update record', containers: ['action', 'default'] },
    { type: 'recordCall', label: 'Record & Analyse', icon: Mic, color: '#f43f5e', description: 'Record call', containers: ['action', 'default'] },
    { type: 'connectCall', label: 'Connect Call', icon: PhoneOutgoing, color: '#06b6d4', description: 'Connect external', containers: ['action', 'default'] },
    { type: 'notify', label: 'Notify', icon: Send, color: '#0ea5e9', description: 'Send notification', containers: ['action', 'default'] },
    { type: 'rule', label: 'Rule', icon: GitBranch, color: '#8b5cf6', description: 'Conditional logic', containers: ['action', 'default'] },
    { type: 'manageProperties', label: 'Manage Properties', icon: Settings, color: '#64748b', description: 'Set variables', containers: ['action', 'default'] },
    { type: 'scriptEngine', label: 'Script Engine', icon: Settings, color: '#64748b', description: 'Run custom script', containers: ['action', 'default'] },
    { type: 'requestSkills', label: 'Request Skills', icon: Settings, color: '#64748b', description: 'Request agent skills', containers: ['action', 'default'] },
    { type: 'sendMessage', label: 'Send Message', icon: Send, color: '#0ea5e9', description: 'Send SMS/message', containers: ['action', 'default'] },
    { type: 'sendTemplate', label: 'Send Template', icon: Send, color: '#0ea5e9', description: 'Send template message', containers: ['action', 'default'] },
    
    // SWITCHBOARD container apps  
    { type: 'switchItem', label: 'Switch Item', icon: GitBranch, color: '#d95879', description: 'Menu option', containers: ['switchBoard'] },
    { type: 'getInfo', label: 'Get Info', icon: Database, color: '#d95879', description: 'Collect input', containers: ['switchBoard', 'natterboxAI'] },
    
    // FINISH container apps
    { type: 'voicemail', label: 'Voicemail', icon: Voicemail, color: '#3b82f6', description: 'Record message', containers: ['finish'] },
    
    // TO_POLICY container apps
    { type: 'callPolicy', label: 'Call Policy', icon: GitBranch, color: '#963cbd', description: 'Link to policy', containers: ['toPolicy'] },
    { type: 'dataAnalytics', label: 'Data Analytics', icon: Database, color: '#963cbd', description: 'Analytics integration', containers: ['toPolicy'] },
    
    // NATTERBOX_AI container apps
    { type: 'aiAgent', label: 'Agent', icon: Bot, color: '#75c3bd', description: 'AI Agent', containers: ['natterboxAI'] },
    { type: 'aiGetSkills', label: 'Get Skills', icon: Settings, color: '#75c3bd', description: 'Get AI skills', containers: ['natterboxAI'] },
    { type: 'aiInstructions', label: 'Instructions', icon: MessageSquare, color: '#75c3bd', description: 'AI instructions', containers: ['natterboxAI'] },
    { type: 'aiKnowledge', label: 'Knowledge', icon: Database, color: '#75c3bd', description: 'Knowledge base', containers: ['natterboxAI'] },
    { type: 'aiResponse', label: 'Response', icon: MessageSquare, color: '#75c3bd', description: 'AI response', containers: ['natterboxAI'] },
    { type: 'aiRouter', label: 'Router', icon: GitBranch, color: '#75c3bd', description: 'AI routing', containers: ['natterboxAI'] },
    { type: 'aiVoicemail', label: 'Voicemail', icon: Voicemail, color: '#75c3bd', description: 'AI voicemail', containers: ['natterboxAI'] },
    { type: 'aiPersona', label: 'Persona', icon: Bot, color: '#75c3bd', description: 'AI persona', containers: ['natterboxAI'] },
    { type: 'aiSettings', label: 'Settings', icon: Settings, color: '#75c3bd', description: 'AI settings', containers: ['natterboxAI'] },
    
    // OMNI_CHANNEL_FLOW container apps
    { type: 'route', label: 'Route', icon: GitBranch, color: '#00a1e0', description: 'Omni-Channel routing', containers: ['omniChannelFlow'] },
    
    // Debug/Dev apps - available in all containers
    { type: 'debug', label: 'Debug', icon: AlertTriangle, color: '#ef4444', description: 'Debug output', containers: ['action', 'default', 'switchBoard', 'natterboxAI', 'finish', 'toPolicy', 'omniChannelFlow'] },
  ];
  
  // Filter apps based on current node type
  const appOptions = $derived(() => {
    const nodeType = node?.type || 'action';
    return allAppOptions.filter(app => app.containers?.includes(nodeType) ?? false);
  });
  
  // Get container nodes that can be linked to (for LINK tab dropdown)
  const linkableContainers = $derived(() => {
    return allNodes
      .filter(n => n.id !== node?.id && isContainerNode(n.type))
      .map(n => ({
        id: n.id,
        label: n.data?.label as string || n.data?.name as string || n.type || 'Unnamed',
        type: n.type
      }));
  });
  
  function isContainerNode(type: string): boolean {
    return ['action', 'default', 'switchBoard', 'natterboxAI', 'finish', 'toPolicy', 'omniChannelFlow'].includes(type);
  }
  
  function handleSave() {
    onUpdate({
      ...node.data,
      label,
      name: label,
      description,
    });
  }
  
  function handleLabelChange() {
    handleSave();
  }
  
  function handleDescriptionChange() {
    handleSave();
  }
  
  // Child editing handlers
  function handleChildSave() {
    if (activeChildId && onChildUpdate) {
      onChildUpdate(activeChildId, {
        name: childLabel,
        title: childLabel,
        label: childLabel,
        description: childDescription,
      });
    }
  }
  
  function handleChildLabelChange() {
    handleChildSave();
  }
  
  function handleChildDescriptionChange() {
    handleChildSave();
  }
  
  function handleCreateContainer(containerType: string) {
    onCreateLink?.(containerType);
  }
  
  function handleLinkToExisting() {
    if (selectedLinkTarget) {
      onLinkToExisting?.(selectedLinkTarget);
    }
  }
  
  function handleAddApp(appType: string) {
    onAddApp?.(appType);
  }
  
  function handleDragStart(e: DragEvent, appType: string, label: string) {
    e.dataTransfer?.setData('application/json', JSON.stringify({
      type: appType,
      label,
      isChildApp: true,
      parentNodeId: node.id
    }));
  }
</script>

<div class="options-panel fixed right-0 top-16 bottom-0 w-[400px] flex flex-col z-40">
  <!-- Header -->
  <div class="panel-header p-4 flex items-start justify-between gap-3">
    <div class="flex items-start gap-3">
      <!-- Back button for child view -->
      {#if isViewingChild && onBackToParent}
        <button 
          class="p-1.5 rounded transition-colors hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 flex-shrink-0"
          onclick={onBackToParent}
          title="Back to parent"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
      {/if}
      
      <!-- Icon -->
      <div 
        class="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
        style="background-color: {typeInfo().color}20;"
      >
        <div style="color: {typeInfo().color};">
          {#if isViewingChild}
            {@const childType = (activeChildData?.type as string) || (activeChildData?.templateClass as string)?.replace('Mod', '').toLowerCase() || ''}
            {#if childType === 'speak'}
              <MessageSquare class="w-6 h-6" />
            {:else if childType === 'callQueue' || childType === 'huntGroup'}
              <Users class="w-6 h-6" />
            {:else if childType === 'rule' || childType === 'switchItem'}
              <GitBranch class="w-6 h-6" />
            {:else if childType === 'voicemail'}
              <Voicemail class="w-6 h-6" />
            {:else if childType === 'queryObject' || childType === 'getInfo'}
              <Database class="w-6 h-6" />
            {:else if childType === 'createRecord' || childType === 'updateRecord'}
              <FileText class="w-6 h-6" />
            {:else if childType === 'connectCall'}
              <PhoneOutgoing class="w-6 h-6" />
            {:else if childType === 'recordCall' || childType === 'recordAndAnalyse'}
              <Mic class="w-6 h-6" />
            {:else if childType === 'notify' || childType === 'sendMessage' || childType === 'sendTemplate'}
              <Send class="w-6 h-6" />
            {:else if childType.startsWith('ai')}
              <Bot class="w-6 h-6" />
            {:else}
              <Settings class="w-6 h-6" />
            {/if}
          {:else if node?.type === 'action' || node?.type === 'default'}
            <Play class="w-6 h-6" />
          {:else if node?.type === 'switchBoard'}
            <Search class="w-6 h-6" />
          {:else if node?.type === 'natterboxAI'}
            <Bot class="w-6 h-6" />
          {:else if node?.type === 'rule'}
            <GitBranch class="w-6 h-6" />
          {:else}
            <Settings class="w-6 h-6" />
          {/if}
        </div>
      </div>
      
      <!-- Title & Description -->
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-bold tracking-wide uppercase" style="color: {typeInfo().color};">
          {isViewingChild ? getChildDisplayName() : typeInfo().name}
        </h3>
        <p class="text-xs text-surface-400 mt-0.5">
          {isViewingChild ? typeInfo().name : typeInfo().description}
        </p>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="flex items-center gap-1">
      <!-- Up/Down arrows for child view -->
      {#if isViewingChild}
        <button 
          class="p-1.5 rounded transition-colors hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600"
          onclick={onMoveChildUp}
          title="Move up"
        >
          <ArrowUp class="w-4 h-4" />
        </button>
        <button 
          class="p-1.5 rounded transition-colors hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600"
          onclick={onMoveChildDown}
          title="Move down"
        >
          <ArrowDown class="w-4 h-4" />
        </button>
        <button 
          class="p-1.5 rounded transition-colors hover:bg-red-500/20 text-surface-400 hover:text-red-400"
          onclick={onDeleteChild}
          title="Delete component"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      {:else if onDeleteNode}
        <button 
          class="p-1.5 rounded transition-colors hover:bg-red-500/20 text-surface-400 hover:text-red-400"
          onclick={onDeleteNode}
          title="Delete node"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      {/if}
      <button 
        class="close-btn p-1.5 rounded transition-colors"
        onclick={onClose}
        title="Close panel"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
  
  <!-- Tabs -->
  <div class="tabs-container">
    <div class="tabs-wrapper mx-3">
      <div class="tabs">
        {#if availableTabs().includes('configuration')}
          <button 
            class="tab"
            class:tab-active={activeTab === 'configuration'}
            onclick={() => activeTab = 'configuration'}
          >
            Configuration
          </button>
        {/if}
        {#if availableTabs().includes('link')}
          <button 
            class="tab"
            class:tab-active={activeTab === 'link'}
            onclick={() => activeTab = 'link'}
          >
            Link
          </button>
        {/if}
        {#if availableTabs().includes('apps')}
          <button 
            class="tab"
            class:tab-active={activeTab === 'apps'}
            onclick={() => activeTab = 'apps'}
          >
            Apps
          </button>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Tab Content -->
  <div class="flex-1 overflow-y-auto">
    <div class="tab-content mx-3 mb-3">
      <!-- CONFIGURATION Tab -->
      {#if activeTab === 'configuration'}
        <div class="space-y-4 p-4">
          {#if isViewingChild}
            <!-- CHILD CONFIGURATION -->
            
            <!-- Name this item (child) -->
            <div>
              <label class="config-label">Name this component</label>
              <input 
                type="text"
                bind:value={childLabel}
                onchange={handleChildLabelChange}
                placeholder="Enter name"
                class="config-input"
              />
            </div>
            
            <!-- Child type-specific configuration using dedicated config components -->
            {@const childType = (activeChildData?.type as string) || (activeChildData?.templateClass as string)?.replace('Mod', '').toLowerCase() || ''}
            {@const childConfig = (activeChildData?.variables as Record<string, unknown>) || (activeChildData?.config as Record<string, unknown>) || {}}
            
            {#if childType === 'speak'}
              <SpeakConfig 
                config={{
                  voice: childConfig.voice as string,
                  sayPhrase: childConfig.sayPhrase as string
                }}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'callQueue'}
              <CallQueueConfig 
                config={{
                  queueAlgorithm: childConfig.queueAlgorithm as string,
                  holdMusicType: childConfig.holdMusicType as string,
                  holdMusic: childConfig.holdMusic as string,
                  exitKey: childConfig.exitKey as string,
                  wrapUpType: childConfig.wrapUpType as string,
                  ringTargets: childConfig.ringTargets as unknown[],
                  announcements: childConfig.announcements as unknown[],
                  screen: childConfig.screen as Record<string, unknown>,
                  callback: childConfig.callback as Record<string, unknown>
                }}
                {groups}
                sounds={sounds}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'huntGroup'}
              <CallQueueConfig 
                config={{
                  queueAlgorithm: childConfig.strategy as string || 'SEQUENTIAL',
                  ringTargets: childConfig.connectTargets as unknown[],
                }}
                {groups}
                sounds={sounds}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'rule'}
              <RuleConfig 
                config={{
                  rules: childConfig.rules as unknown
                }}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'recordCall'}
              <RecordCallConfig 
                config={{
                  retain: childConfig.retain as boolean,
                  archivePolicyId: childConfig.archivePolicyId as string,
                  channel: childConfig.channel as string,
                  startOnBridge: childConfig.startOnBridge as boolean,
                  allowPause: childConfig.allowPause as boolean,
                  beep: childConfig.beep as string,
                  emailSend: childConfig.emailSend as boolean,
                  emailToAddresses: childConfig.emailToAddresses as string
                }}
                isRecordAndAnalyse={false}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'recordAndAnalyse'}
              <RecordCallConfig 
                config={{
                  retain: childConfig.retain as boolean,
                  archivingPolicyId: childConfig.archivingPolicyId as string,
                  channel: childConfig.channel as string,
                  startRecording: childConfig.startRecording as string,
                  pauseAllowed: childConfig.pauseAllowed as boolean,
                  stopAllowed: childConfig.stopAllowed as boolean,
                  beepAlert: childConfig.beepAlert as string,
                  insightConfig: childConfig.insightConfig as string,
                  transcriptionEngine: childConfig.transcriptionEngine as string,
                  analysisLanguage: childConfig.analysisLanguage as string,
                  disableSummarization: childConfig.disableSummarization as boolean
                }}
                isRecordAndAnalyse={true}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'connectCall'}
              <ConnectCallConfig 
                config={{
                  trigger: childConfig.trigger as string,
                  connectType: childConfig.connectType as string,
                  connectValue: childConfig.connectValue as string,
                  callerIdPresentation: childConfig.callerIdPresentation as string,
                  transferAfterConnect: childConfig.transferAfterConnect as boolean,
                  hangupAfterBridge: childConfig.hangupAfterBridge as boolean,
                  ringDuration: childConfig.ringDuration as number,
                  screen: childConfig.screen as Record<string, unknown>,
                  camp: childConfig.camp as Record<string, unknown>
                }}
                {users}
                {phoneNumbers}
                {groups}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'queryObject'}
              <QueryObjectConfig 
                config={{
                  sObject: childConfig.sObject as string,
                  filterFields: childConfig.filterFields as unknown[],
                  selectedFields: childConfig.selectedFields as string[],
                  orderBy: childConfig.orderBy as Record<string, unknown>,
                  resultSize: childConfig.resultSize as number,
                  trigger: childConfig.trigger as string,
                  showAPIName: childConfig.showAPIName as boolean,
                  soql: childConfig.soql as string
                }}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'createRecord' || childType === 'updateRecord'}
              <QueryObjectConfig 
                config={{
                  sObject: childConfig.sObject as string,
                  trigger: childConfig.trigger as string,
                  showAPIName: childConfig.showAPIName as boolean
                }}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'notify'}
              <NotifyConfig 
                config={{
                  type: childConfig.type as string,
                  email: childConfig.email as unknown[],
                  sms: childConfig.sms as unknown[],
                  chatter: childConfig.chatter as unknown[]
                }}
                {users}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'switchItem'}
              <SwitchItemConfig 
                config={{
                  itemPhrase: childConfig.itemPhrase as string,
                  tone: childConfig.tone as string,
                  pattern: childConfig.pattern as string,
                  patternAssignTo: childConfig.patternAssignTo as string,
                  selectedPhrase: childConfig.selectedPhrase as string,
                  callerIdName: childConfig.callerIdName as string
                }}
                isGetInfo={false}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'getInfo'}
              <SwitchItemConfig 
                config={{
                  itemPhrase: childConfig.itemPhrase as string,
                  tone: childConfig.tone as string,
                  pattern: childConfig.pattern as string,
                  patternAssignTo: childConfig.patternAssignTo as string,
                  patternAssignType: childConfig.patternAssignType as string,
                  patternAssignMacro: childConfig.patternAssignMacro as string,
                  selectedPhrase: childConfig.selectedPhrase as string,
                  callerIdName: childConfig.callerIdName as string
                }}
                isGetInfo={true}
                onChange={handleChildConfigChange}
              />
              
            {:else if childType === 'voicemail'}
              <div class="type-specific-section">
                <h4 class="section-title">Voicemail Settings</h4>
                <div class="space-y-3">
                  <div>
                    <label class="config-label">Voicemail Box</label>
                    <select class="config-select">
                      <option value="">Select user or group...</option>
                      {#each users as user}
                        <option value={user.id}>{user.name}</option>
                      {/each}
                      {#each groups as group}
                        <option value={group.id}>{group.name} (Group)</option>
                      {/each}
                    </select>
                  </div>
                  <div>
                    <label class="config-label">Greeting</label>
                    <select class="config-select">
                      <option value="default">Default Greeting</option>
                      <option value="custom">Custom Greeting</option>
                    </select>
                  </div>
                  <div>
                    <label class="config-label">Max Recording Duration (seconds)</label>
                    <input type="number" placeholder="120" class="config-input" />
                  </div>
                </div>
              </div>
              
            {:else if childType === 'manageProperties'}
              <div class="type-specific-section">
                <h4 class="section-title">Manage Properties</h4>
                <div class="space-y-3">
                  <p class="text-xs text-surface-400">
                    Set or modify call properties that can be used by other components.
                  </p>
                  <button class="config-btn">Configure Properties</button>
                </div>
              </div>
              
            {:else if childType === 'debug'}
              <div class="type-specific-section">
                <h4 class="section-title">Debug Settings</h4>
                <div class="space-y-3">
                  <p class="text-xs text-surface-400">
                    Output debug information to the log.
                  </p>
                  <div>
                    <label class="config-label">Debug Message</label>
                    <textarea 
                      placeholder="Debug output..."
                      rows="3"
                      class="config-input resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>
              
            {:else if childType === 'retry'}
              <div class="type-specific-section">
                <h4 class="section-title">Retry</h4>
                <p class="text-xs text-surface-400 p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                  <AlertTriangle class="w-4 h-4 inline-block mr-1 text-amber-500" />
                  Note: Retry will only work for Event initiated flows. Other start apps will not be retried.
                </p>
              </div>
              
            {:else if childType.startsWith('ai')}
              <div class="type-specific-section">
                <h4 class="section-title">AI Configuration</h4>
                <div class="space-y-3">
                  <p class="text-xs text-surface-400">
                    AI component configuration. These settings control how the AI assistant behaves.
                  </p>
                  {#if childType === 'aiAgent'}
                    <div>
                      <label class="config-label">Agent</label>
                      <select class="config-select">
                        <option value="">Select AI agent...</option>
                      </select>
                    </div>
                    <div>
                      <label class="config-label">Instance Name</label>
                      <input type="text" placeholder="agent_instance" class="config-input" />
                    </div>
                  {:else if childType === 'aiInstructions'}
                    <div>
                      <label class="config-label">Instructions</label>
                      <textarea 
                        placeholder="Enter AI instructions..."
                        rows="4"
                        class="config-input resize-none"
                      ></textarea>
                    </div>
                  {:else if childType === 'aiKnowledge'}
                    <div>
                      <label class="config-label">Knowledge Base</label>
                      <select class="config-select">
                        <option value="">Select knowledge base...</option>
                      </select>
                    </div>
                  {:else}
                    <p class="text-xs text-surface-500 italic">
                      Additional AI component settings coming soon.
                    </p>
                  {/if}
                </div>
              </div>
              
            {:else if childType === 'route'}
              <div class="type-specific-section">
                <h4 class="section-title">Omni-Channel Route Settings</h4>
                <div class="space-y-3">
                  <div>
                    <label class="config-label">Flow API Name</label>
                    <input type="text" placeholder="My_Routing_Flow" class="config-input" />
                  </div>
                  <div>
                    <label class="config-label">Queue</label>
                    <select class="config-select">
                      <option value="">Select queue...</option>
                    </select>
                  </div>
                </div>
              </div>
              
            {:else}
              <div class="type-specific-section">
                <p class="text-xs text-surface-400 italic">
                  No additional configuration options available for this component type.
                </p>
              </div>
            {/if}
            
            <!-- Child Info -->
            <div class="node-info">
              <h4 class="section-title">Component Info</h4>
              <dl class="info-list">
                <div class="info-row">
                  <dt>ID:</dt>
                  <dd class="font-mono">{activeChildId || 'N/A'}</dd>
                </div>
                <div class="info-row">
                  <dt>Type:</dt>
                  <dd>{childType || 'N/A'}</dd>
                </div>
                <div class="info-row">
                  <dt>Parent:</dt>
                  <dd>{node?.data?.label || node?.data?.name || node?.id || 'N/A'}</dd>
                </div>
              </dl>
            </div>
          {:else}
            <!-- NODE CONFIGURATION (not a child) -->
            
            <!-- Name this item -->
            <div>
              <label class="config-label">Name this item</label>
              <input 
                type="text"
                bind:value={label}
                onchange={handleLabelChange}
                placeholder="Enter name"
                class="config-input"
              />
            </div>
            
            <!-- Description (optional) -->
            <div>
              <label class="config-label">Description</label>
              <textarea 
                bind:value={description}
                onchange={handleDescriptionChange}
                placeholder="Enter description (optional)"
                rows="3"
                class="config-input resize-none"
              ></textarea>
            </div>
            
            <!-- Type-specific configuration -->
            {#if node?.type === 'action' || node?.type === 'default'}
            <!-- Action container - minimal config, children are managed via APPS tab -->
            <div class="type-specific-section">
              <p class="text-xs text-surface-400">
                Use the APPS tab to add components to this Action container. 
                Use the LINK tab to set the default output destination.
              </p>
            </div>
          
          {:else if node?.type === 'inboundNumber' || node?.type === 'input'}
            <div class="type-specific-section">
              <h4 class="section-title">Inbound Numbers</h4>
              <div class="space-y-3">
                <p class="text-xs text-surface-400">
                  Configure which phone numbers are handled by this entry point.
                </p>
                <button class="config-btn">
                  Edit Numbers
                </button>
                <div class="numbers-list text-xs text-surface-400 mt-2">
                  {#if node?.data?.subItems?.length}
                    {#each node.data.subItems.slice(0, 5) as item}
                      <div class="py-1 border-b border-surface-700">
                        {item.name || item.variables?.publicNumber || 'Unknown'}
                      </div>
                    {/each}
                    {#if node.data.subItems.length > 5}
                      <div class="py-1 text-surface-500">
                        +{node.data.subItems.length - 5} more...
                      </div>
                    {/if}
                  {:else}
                    <div class="py-1 text-surface-500 italic">No numbers assigned</div>
                  {/if}
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'extensionNumber'}
            <div class="type-specific-section">
              <h4 class="section-title">Extension Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Extension Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 1001" 
                    class="config-input"
                    value={node?.data?.extension || ''}
                  />
                </div>
                <button class="config-btn">
                  Edit Extension Users
                </button>
              </div>
            </div>
            
          {:else if node?.type === 'fromPolicy'}
            <div class="type-specific-section">
              <h4 class="section-title">From Policy</h4>
              <p class="text-xs text-surface-400">
                This is an entry point from another policy. When another policy 
                transfers control here, execution continues from this node.
              </p>
            </div>
            
          {:else if node?.type === 'switchBoard'}
            <div class="type-specific-section">
              <h4 class="section-title">SwitchBoard</h4>
              <p class="text-xs text-surface-400">
                Use the APPS tab to add Switch Items (menu options) or Get Info 
                components. Each switch item creates a branch in the call flow.
              </p>
            </div>
            
          {:else if node?.type === 'natterboxAI'}
            <div class="type-specific-section">
              <h4 class="section-title">Natterbox AI</h4>
              <div class="space-y-3">
                <p class="text-xs text-surface-400">
                  Configure AI-powered call handling. Use the APPS tab to add 
                  AI components like Agent, Knowledge, Instructions, etc.
                </p>
                <div>
                  <label class="config-label">AI Model</label>
                  <select class="config-select">
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5">GPT-3.5 Turbo</option>
                  </select>
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'finish'}
            <div class="type-specific-section">
              <h4 class="section-title">Finish</h4>
              <p class="text-xs text-surface-400">
                This node ends the call flow. Use the APPS tab to add a Voicemail 
                component to record a message before ending.
              </p>
            </div>
            
          {:else if node?.type === 'toPolicy'}
            <div class="type-specific-section">
              <h4 class="section-title">To Policy</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Target Policy</label>
                  <select class="config-select">
                    <option value="">Select a policy...</option>
                  </select>
                </div>
                <p class="text-xs text-surface-400">
                  Transfer control to another routing policy. Use the APPS tab 
                  to add Call Policy or Data Analytics components.
                </p>
              </div>
            </div>
            
          {:else if node?.type === 'omniChannelFlow'}
            <div class="type-specific-section">
              <h4 class="section-title">Omni-Channel Flow</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Flow API Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., My_Routing_Flow" 
                    class="config-input"
                    value={node?.data?.flowApiName || ''}
                  />
                </div>
                <p class="text-xs text-surface-400">
                  Integrate with Salesforce Omni-Channel for skills-based routing.
                </p>
              </div>
            </div>
            
          {:else if node?.type === 'callQueue'}
            <div class="type-specific-section">
              <h4 class="section-title">Call Queue Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Queue Type</label>
                  <select class="config-select">
                    <option value="round_robin">Round Robin</option>
                    <option value="longest_idle">Longest Idle</option>
                    <option value="skills_based">Skills Based</option>
                    <option value="simultaneous">Simultaneous Ring</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Ring Targets (Groups)</label>
                  <button class="config-btn">
                    Configure Groups
                  </button>
                </div>
                <div>
                  <label class="config-label">Max Wait Time (seconds)</label>
                  <input type="number" placeholder="300" class="config-input" />
                </div>
                <div>
                  <label class="config-label">Hold Music</label>
                  <select class="config-select">
                    <option value="default">Default Hold Music</option>
                    <option value="custom">Custom Sound</option>
                  </select>
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'huntGroup'}
            <div class="type-specific-section">
              <h4 class="section-title">Hunt Group Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Hunt Type</label>
                  <select class="config-select">
                    <option value="sequential">Sequential</option>
                    <option value="parallel">Parallel (Simultaneous)</option>
                    <option value="round_robin">Round Robin</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Ring Targets</label>
                  <button class="config-btn">
                    Configure Users/Groups
                  </button>
                </div>
                <div>
                  <label class="config-label">Ring Duration (seconds)</label>
                  <input type="number" placeholder="20" class="config-input" />
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'rule'}
            <div class="type-specific-section">
              <h4 class="section-title">Rule Settings</h4>
              <div class="space-y-3">
                <p class="text-xs text-surface-400 mb-2">
                  Configure conditions to branch the call flow. Different rule types 
                  combine using AND logic.
                </p>
                <div>
                  <label class="config-label">Rule Type</label>
                  <select class="config-select">
                    <option value="timeOfDay">Time of Day</option>
                    <option value="countryCode">Country Code</option>
                    <option value="callerIdWithheld">Caller ID Withheld</option>
                    <option value="numberMatch">Number Match</option>
                    <option value="evaluate">Evaluate Property</option>
                  </select>
                </div>
                <button class="config-btn">
                  Configure Rules
                </button>
              </div>
            </div>
            
          {:else if node?.type === 'speak'}
            <div class="type-specific-section">
              <h4 class="section-title">Speak Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Voice</label>
                  <select class="config-select">
                    <option value="en-US-Neural2-C">English (US) - Female</option>
                    <option value="en-US-Neural2-D">English (US) - Male</option>
                    <option value="en-GB-Neural2-A">English (UK) - Female</option>
                    <option value="en-GB-Neural2-B">English (UK) - Male</option>
                    <option value="es-ES-Neural2-A">Spanish - Female</option>
                    <option value="fr-FR-Neural2-A">French - Female</option>
                    <option value="de-DE-Neural2-A">German - Female</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Text to Speak</label>
                  <textarea 
                    placeholder="Enter the phrase you want to say..."
                    rows="4"
                    class="config-input resize-none"
                  ></textarea>
                  <p class="text-xs text-surface-500 mt-1">
                    Use {'{'}property{'}'} syntax to include dynamic values.
                  </p>
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'voicemail'}
            <div class="type-specific-section">
              <h4 class="section-title">Voicemail Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Voicemail Box</label>
                  <select class="config-select">
                    <option value="">Select user or group...</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Greeting</label>
                  <select class="config-select">
                    <option value="default">Default Greeting</option>
                    <option value="custom">Custom Greeting</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Max Recording Duration (seconds)</label>
                  <input type="number" placeholder="120" class="config-input" />
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'connectCall'}
            <div class="type-specific-section">
              <h4 class="section-title">Connect Call Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Connect To</label>
                  <select class="config-select">
                    <option value="number">Phone Number</option>
                    <option value="sip">SIP Endpoint</option>
                    <option value="user">User Extension</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Destination</label>
                  <input type="text" placeholder="+44 20 1234 5678" class="config-input" />
                </div>
                <div>
                  <label class="config-label">Caller ID</label>
                  <select class="config-select">
                    <option value="original">Original Caller ID</option>
                    <option value="company">Company Number</option>
                    <option value="custom">Custom Number</option>
                  </select>
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'queryObject'}
            <div class="type-specific-section">
              <h4 class="section-title">Query Object Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Salesforce Object</label>
                  <select class="config-select">
                    <option value="Account">Account</option>
                    <option value="Contact">Contact</option>
                    <option value="Lead">Lead</option>
                    <option value="Case">Case</option>
                    <option value="Opportunity">Opportunity</option>
                    <option value="custom">Custom Object...</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Filter Criteria</label>
                  <input type="text" placeholder="Phone = {'{'}caller_number{'}'}" class="config-input" />
                </div>
                <div>
                  <label class="config-label">Store Result In</label>
                  <input type="text" placeholder="query_result" class="config-input" />
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'createRecord'}
            <div class="type-specific-section">
              <h4 class="section-title">Create Record Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Salesforce Object</label>
                  <select class="config-select">
                    <option value="Task">Task</option>
                    <option value="Case">Case</option>
                    <option value="Lead">Lead</option>
                    <option value="custom">Custom Object...</option>
                  </select>
                </div>
                <button class="config-btn">
                  Configure Field Mappings
                </button>
              </div>
            </div>
            
          {:else if node?.type === 'notify'}
            <div class="type-specific-section">
              <h4 class="section-title">Notify Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Notification Type</label>
                  <select class="config-select">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="chatter">Chatter Post</option>
                    <option value="slack">Slack</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Recipients</label>
                  <input type="text" placeholder="Enter recipients..." class="config-input" />
                </div>
                <div>
                  <label class="config-label">Message</label>
                  <textarea 
                    placeholder="Notification message..."
                    rows="3"
                    class="config-input resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'recordCall' || node?.type === 'recordAndAnalyse'}
            <div class="type-specific-section">
              <h4 class="section-title">Record & Analyse Settings</h4>
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="enable-recording" class="config-checkbox" />
                  <label for="enable-recording" class="config-label !mb-0">Enable Recording</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="enable-transcription" class="config-checkbox" />
                  <label for="enable-transcription" class="config-label !mb-0">Enable Transcription</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="enable-sentiment" class="config-checkbox" />
                  <label for="enable-sentiment" class="config-label !mb-0">Analyse Sentiment</label>
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'manageProperties'}
            <div class="type-specific-section">
              <h4 class="section-title">Manage Properties</h4>
              <div class="space-y-3">
                <p class="text-xs text-surface-400">
                  Set or modify call properties that can be used by other components.
                </p>
                <button class="config-btn">
                  Configure Properties
                </button>
              </div>
            </div>
            
          {:else if node?.type === 'switchItem'}
            <div class="type-specific-section">
              <h4 class="section-title">Switch Item Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">DTMF Key</label>
                  <select class="config-select">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="0">0</option>
                    <option value="*">*</option>
                    <option value="#">#</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Menu Text</label>
                  <input type="text" placeholder="Press 1 for Sales" class="config-input" />
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'getInfo'}
            <div class="type-specific-section">
              <h4 class="section-title">Get Info Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Prompt Text</label>
                  <textarea 
                    placeholder="Please enter your account number..."
                    rows="2"
                    class="config-input resize-none"
                  ></textarea>
                </div>
                <div>
                  <label class="config-label">Input Type</label>
                  <select class="config-select">
                    <option value="dtmf">DTMF (Keypad)</option>
                    <option value="speech">Speech Recognition</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Store Result In</label>
                  <input type="text" placeholder="user_input" class="config-input" />
                </div>
              </div>
            </div>
            
          {:else if node?.type === 'route'}
            <div class="type-specific-section">
              <h4 class="section-title">Omni-Channel Route Settings</h4>
              <div class="space-y-3">
                <div>
                  <label class="config-label">Routing Configuration</label>
                  <select class="config-select">
                    <option value="">Select configuration...</option>
                  </select>
                </div>
                <div>
                  <label class="config-label">Queue</label>
                  <select class="config-select">
                    <option value="">Select queue...</option>
                  </select>
                </div>
              </div>
            </div>
            
          {:else}
            <!-- Default/generic configuration for unknown types -->
            <div class="type-specific-section">
              <p class="text-xs text-surface-400 italic">
                No additional configuration options available for this component type.
              </p>
            </div>
          {/if}
          
          <!-- Node Info -->
          <div class="node-info">
            <h4 class="section-title">Node Info</h4>
            <dl class="info-list">
              <div class="info-row">
                <dt>ID:</dt>
                <dd class="font-mono">{node?.id || 'N/A'}</dd>
              </div>
              <div class="info-row">
                <dt>Type:</dt>
                <dd>{node?.type || 'N/A'}</dd>
              </div>
              <div class="info-row">
                <dt>Position:</dt>
                <dd class="font-mono">
                  ({Math.round(node?.position?.x || 0)}, {Math.round(node?.position?.y || 0)})
                </dd>
              </div>
            </dl>
          </div>
          {/if}
        </div>
      {/if}
      
      <!-- LINK Tab -->
      {#if activeTab === 'link'}
        <div class="space-y-4 p-4">
          <!-- Transfer to existing container -->
          <div>
            <label class="config-label">Transfer control to existing Container</label>
            <div class="flex gap-2">
              <select 
                bind:value={selectedLinkTarget}
                class="config-select flex-1"
              >
                <option value="">Select a container...</option>
                {#each linkableContainers() as container}
                  <option value={container.id}>
                    {container.label} ({container.type})
                  </option>
                {/each}
              </select>
              <button 
                class="link-btn"
                onclick={handleLinkToExisting}
                disabled={!selectedLinkTarget}
              >
                <ArrowUpDown class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <!-- Create new container -->
          <div>
            <label class="config-label">Or create new Container</label>
            <div class="container-grid">
              {#each containerOptions as option}
                <button 
                  class="container-option"
                  onclick={() => handleCreateContainer(option.type)}
                >
                  <div 
                    class="option-icon"
                    style="background-color: {option.color}20; color: {option.color};"
                  >
                    <svelte:component this={option.icon} class="w-6 h-6" />
                  </div>
                  <span class="option-label">{option.label}</span>
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
      
      <!-- APPS Tab -->
      {#if activeTab === 'apps'}
        <div class="space-y-4 p-4">
          <p class="text-xs text-surface-400">
            Drag apps into the container or click to add them.
          </p>
          
          <div class="apps-grid">
            {#each appOptions() as app}
              <button 
                class="app-option"
                class:requires-license={app.requiresLicense}
                onclick={() => handleAddApp(app.type)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, app.type, app.label)}
              >
                <div 
                  class="app-icon"
                  style="background-color: {app.color}20; color: {app.color};"
                >
                  <svelte:component this={app.icon} class="w-5 h-5" />
                </div>
                <div class="app-info">
                  <span class="app-label">{app.label}</span>
                  {#if app.requiresLicense}
                    <span class="license-badge">{app.requiresLicense}</span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Footer -->
  <div class="panel-footer p-3">
    <p class="text-xs text-surface-500 text-center">
      Press Delete key to remove selected nodes
    </p>
  </div>
</div>

<style>
  .options-panel {
    background-color: rgb(var(--color-surface-100));
    color: rgb(var(--color-surface-800));
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  }
  
  /* Dark mode support */
  :global(.dark) .options-panel {
    background-color: rgb(var(--color-surface-800));
    color: rgb(var(--color-surface-200));
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.4);
  }
  
  .panel-header {
    border-bottom: 1px solid rgb(var(--color-surface-300));
  }
  
  :global(.dark) .panel-header {
    border-bottom-color: rgb(var(--color-surface-700));
  }
  
  .close-btn {
    color: rgb(var(--color-surface-500));
  }
  
  .close-btn:hover {
    background-color: rgb(var(--color-surface-200));
    color: rgb(var(--color-surface-700));
  }
  
  :global(.dark) .close-btn:hover {
    background-color: rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-200));
  }
  
  /* Tabs */
  .tabs-container {
    background-color: rgb(var(--color-surface-100));
  }
  
  :global(.dark) .tabs-container {
    background-color: rgb(var(--color-surface-800));
  }
  
  .tabs-wrapper {
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem 0.25rem 0 0;
  }
  
  :global(.dark) .tabs-wrapper {
    border-color: rgb(var(--color-surface-600));
  }
  
  .tabs {
    display: flex;
    background-color: rgb(var(--color-surface-100));
    border-radius: 0.25rem 0.25rem 0 0;
  }
  
  :global(.dark) .tabs {
    background-color: rgb(var(--color-surface-700));
  }
  
  .tab {
    flex: 1;
    padding: 0.625rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgb(var(--color-surface-500));
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    border-bottom: 2px solid transparent;
  }
  
  .tab:hover {
    color: rgb(var(--color-surface-700));
  }
  
  :global(.dark) .tab:hover {
    color: rgb(var(--color-surface-300));
  }
  
  .tab-active {
    color: rgb(var(--color-primary-600));
    background-color: white;
    border-bottom: 2px solid rgb(var(--color-primary-600));
  }
  
  :global(.dark) .tab-active {
    color: rgb(var(--color-primary-400));
    background-color: rgb(var(--color-surface-800));
    border-bottom-color: rgb(var(--color-primary-400));
  }
  
  /* Tab Content */
  .tab-content {
    background-color: white;
    border: 1px solid rgb(var(--color-surface-300));
    border-top: none;
    border-radius: 0 0 0.25rem 0.25rem;
  }
  
  :global(.dark) .tab-content {
    background-color: rgb(var(--color-surface-800));
    border-color: rgb(var(--color-surface-600));
  }
  
  /* Form elements */
  .config-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.375rem;
  }
  
  :global(.dark) .config-label {
    color: rgb(var(--color-surface-400));
  }
  
  .config-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    background-color: white;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    color: rgb(var(--color-surface-800));
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  
  :global(.dark) .config-input {
    background-color: rgb(var(--color-surface-900));
    border-color: rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-100));
  }
  
  .config-input:focus {
    outline: none;
    border-color: rgb(var(--color-primary-500));
    box-shadow: 0 0 0 2px rgba(var(--color-primary-500), 0.2);
  }
  
  .config-input::placeholder {
    color: rgb(var(--color-surface-400));
  }
  
  :global(.dark) .config-input::placeholder {
    color: rgb(var(--color-surface-500));
  }
  
  .config-select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    background-color: white;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    color: rgb(var(--color-surface-800));
    cursor: pointer;
  }
  
  :global(.dark) .config-select {
    background-color: rgb(var(--color-surface-900));
    border-color: rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-100));
  }
  
  .config-select:focus {
    outline: none;
    border-color: rgb(var(--color-primary-500));
    box-shadow: 0 0 0 2px rgba(var(--color-primary-500), 0.2);
  }
  
  .config-btn {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    background-color: rgb(var(--color-primary-500));
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  
  .config-btn:hover {
    background-color: rgb(var(--color-primary-600));
  }
  
  .config-checkbox {
    width: 1rem;
    height: 1rem;
    accent-color: rgb(var(--color-primary-500));
  }
  
  /* Sections */
  .type-specific-section,
  .node-info {
    padding-top: 1rem;
    border-top: 1px solid rgb(var(--color-surface-200));
    margin-top: 1rem;
  }
  
  :global(.dark) .type-specific-section,
  :global(.dark) .node-info {
    border-top-color: rgb(var(--color-surface-700));
  }
  
  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.75rem;
  }
  
  :global(.dark) .section-title {
    color: rgb(var(--color-surface-400));
  }
  
  /* Node Info */
  .info-list {
    font-size: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  
  .info-row {
    display: flex;
    justify-content: space-between;
  }
  
  .info-row dt {
    color: rgb(var(--color-surface-500));
  }
  
  .info-row dd {
    color: rgb(var(--color-surface-700));
  }
  
  :global(.dark) .info-row dd {
    color: rgb(var(--color-surface-300));
  }
  
  /* Link Tab */
  .link-btn {
    padding: 0.5rem;
    background-color: rgb(var(--color-primary-600));
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  
  .link-btn:hover:not(:disabled) {
    background-color: rgb(var(--color-primary-700));
  }
  
  .link-btn:disabled {
    background-color: rgb(var(--color-surface-300));
    color: rgb(var(--color-surface-500));
    cursor: not-allowed;
  }
  
  :global(.dark) .link-btn:disabled {
    background-color: rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-400));
  }
  
  /* Container Grid (Link Tab) */
  .container-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .container-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: transparent;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  :global(.dark) .container-option {
    border-color: rgb(var(--color-surface-600));
  }
  
  .container-option:hover {
    background-color: rgb(var(--color-surface-100));
    border-color: rgb(var(--color-primary-400));
  }
  
  :global(.dark) .container-option:hover {
    background-color: rgb(var(--color-surface-700));
  }
  
  .option-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .option-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(var(--color-primary-600));
  }
  
  :global(.dark) .option-label {
    color: rgb(var(--color-primary-400));
  }
  
  /* Apps Grid */
  .apps-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .app-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.375rem;
    cursor: grab;
    transition: all 0.15s ease;
  }
  
  :global(.dark) .app-option {
    border-color: rgb(var(--color-surface-600));
  }
  
  .app-option:hover {
    background-color: rgb(var(--color-surface-100));
    border-color: rgb(var(--color-primary-400));
  }
  
  :global(.dark) .app-option:hover {
    background-color: rgb(var(--color-surface-700));
  }
  
  .app-option:active {
    cursor: grabbing;
  }
  
  .app-option.requires-license {
    opacity: 0.7;
  }
  
  .app-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .app-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }
  
  .app-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(var(--color-primary-600));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  :global(.dark) .app-label {
    color: rgb(var(--color-primary-400));
  }
  
  .license-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
    background-color: rgb(var(--color-warning-100));
    color: rgb(var(--color-warning-700));
    border-radius: 0.25rem;
    width: fit-content;
  }
  
  :global(.dark) .license-badge {
    background-color: rgba(var(--color-warning-500), 0.2);
    color: rgb(var(--color-warning-400));
  }
  
  /* Footer */
  .panel-footer {
    border-top: 1px solid rgb(var(--color-surface-300));
  }
  
  :global(.dark) .panel-footer {
    border-top-color: rgb(var(--color-surface-700));
  }
</style>
