<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import {
    Users,
    PhoneForwarded,
    GitBranch,
    MessageSquare,
    Mic,
    Clock,
    Database,
    Bot,
    Settings,
    AlertTriangle,
    Voicemail,
    Search,
    FileText,
    Send,
    Workflow,
  } from 'lucide-svelte';
  
  interface Props {
    id: string;
    data: {
      label?: string;
      containerType?: string;
      description?: string;
      [key: string]: unknown;
    };
    selected?: boolean;
  }
  
  let { id, data, selected = false }: Props = $props();
  
  // Map container types to icons and colors
  const containerConfig: Record<string, { icon: typeof Users; color: string; bgColor: string }> = {
    callQueue: { icon: Users, color: 'text-amber-400', bgColor: 'bg-amber-500/30' },
    huntGroup: { icon: PhoneForwarded, color: 'text-orange-400', bgColor: 'bg-orange-500/30' },
    connectCall: { icon: PhoneForwarded, color: 'text-cyan-400', bgColor: 'bg-cyan-500/30' },
    rule: { icon: GitBranch, color: 'text-violet-400', bgColor: 'bg-violet-500/30' },
    speak: { icon: MessageSquare, color: 'text-pink-400', bgColor: 'bg-pink-500/30' },
    recordCall: { icon: Mic, color: 'text-rose-400', bgColor: 'bg-rose-500/30' },
    manageProperties: { icon: Settings, color: 'text-slate-400', bgColor: 'bg-slate-500/30' },
    queryObject: { icon: Database, color: 'text-emerald-400', bgColor: 'bg-emerald-500/30' },
    createRecord: { icon: FileText, color: 'text-teal-400', bgColor: 'bg-teal-500/30' },
    aiAgent: { icon: Bot, color: 'text-indigo-400', bgColor: 'bg-indigo-500/30' },
    natterboxAI: { icon: Bot, color: 'text-purple-400', bgColor: 'bg-purple-500/30' },
    voicemail: { icon: Voicemail, color: 'text-blue-400', bgColor: 'bg-blue-500/30' },
    notify: { icon: Send, color: 'text-sky-400', bgColor: 'bg-sky-500/30' },
    retry: { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-500/30' },
    switchBoard: { icon: Search, color: 'text-lime-400', bgColor: 'bg-lime-500/30' },
    debug: { icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/30' },
    omniChannelFlow: { icon: Workflow, color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/30' },
  };
  
  const config = $derived(containerConfig[data.containerType || ''] || {
    icon: Settings,
    color: 'text-surface-400',
    bgColor: 'bg-surface-500/30',
  });
  
  const Icon = $derived(config.icon);
</script>

<div
  class="default-node rounded-lg border-2 transition-all duration-200
    {selected ? 'border-primary-500 shadow-lg shadow-primary-500/20' : 'border-surface-400/50'}
    bg-surface-200-800"
>
  <Handle
    type="target"
    position={Position.Left}
    class="!w-3 !h-3 !bg-surface-400 !border-2 !border-surface-300"
  />
  
  <!-- Header -->
  <div class="px-3 py-2 border-b border-surface-300-700 flex items-center gap-2">
    <div class="w-8 h-8 rounded-md {config.bgColor} flex items-center justify-center">
      <Icon class="w-4 h-4 {config.color}" />
    </div>
    <div class="flex-1 min-w-0">
      <span class="font-medium text-text-primary text-sm truncate block">
        {data.label || data.containerType || 'Action'}
      </span>
      {#if data.description}
        <span class="text-xs text-text-secondary truncate block">{data.description}</span>
      {/if}
    </div>
  </div>
  
  <!-- Body - shows key configuration -->
  {#if data.containerType === 'callQueue' || data.containerType === 'huntGroup'}
    <div class="px-3 py-2 text-xs text-text-secondary">
      {#if data.queueName}
        <div class="flex items-center gap-1">
          <Users class="w-3 h-3" />
          <span>{data.queueName}</span>
        </div>
      {/if}
      {#if data.timeout}
        <div class="flex items-center gap-1 mt-1">
          <Clock class="w-3 h-3" />
          <span>Timeout: {data.timeout}s</span>
        </div>
      {/if}
    </div>
  {:else if data.containerType === 'rule'}
    <div class="px-3 py-2 text-xs text-text-secondary">
      <div class="flex items-center gap-1">
        <GitBranch class="w-3 h-3" />
        <span>Conditions: {data.conditions?.length || 0}</span>
      </div>
    </div>
  {:else if data.containerType === 'speak'}
    <div class="px-3 py-2 text-xs text-text-secondary truncate">
      {data.message || 'No message set'}
    </div>
  {/if}
  
  <!-- Multiple output handles for rule nodes -->
  {#if data.containerType === 'rule'}
    <Handle
      type="source"
      position={Position.Right}
      id="true"
      style="top: 30%"
      class="!w-3 !h-3 !bg-success-500 !border-2 !border-success-300"
    />
    <Handle
      type="source"
      position={Position.Right}
      id="false"
      style="top: 70%"
      class="!w-3 !h-3 !bg-error-500 !border-2 !border-error-300"
    />
  {:else}
    <Handle
      type="source"
      position={Position.Right}
      class="!w-3 !h-3 !bg-surface-400 !border-2 !border-surface-300"
    />
  {/if}
</div>

<style>
  .default-node {
    min-width: 180px;
    max-width: 250px;
  }
</style>

