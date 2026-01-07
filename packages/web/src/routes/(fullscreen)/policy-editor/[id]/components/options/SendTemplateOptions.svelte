<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { Loader2, RefreshCw, Search, Eye } from 'lucide-svelte';
  
  interface MessageTemplate {
    id: string;
    name: string;
    content: string;
    channelType: string;
    category?: string;
    language?: string;
    status: string;
  }
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'Send Template');
  let selectedTemplateId = $state(node.data?.templateId as string || '');
  let channelTypeFilter = $state(node.data?.channelType as string || '');
  let searchQuery = $state('');
  let isLoading = $state(false);
  let showPreview = $state(false);
  
  // Available templates
  let availableTemplates = $state<MessageTemplate[]>([]);
  
  // Filter templates
  const filteredTemplates = $derived(
    availableTemplates.filter(t => {
      const matchesSearch = !searchQuery || 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChannel = !channelTypeFilter || t.channelType === channelTypeFilter;
      return matchesSearch && matchesChannel;
    })
  );
  
  // Get selected template
  const selectedTemplate = $derived(
    availableTemplates.find(t => t.id === selectedTemplateId)
  );
  
  // Unique channel types
  const channelTypes = $derived(
    [...new Set(availableTemplates.map(t => t.channelType))].sort()
  );
  
  // Load templates
  async function loadTemplates() {
    isLoading = true;
    try {
      // In a real implementation, this would call the API:
      // const response = await fetch('/api/omnichannel/templates');
      // availableTemplates = await response.json();
      
      // For now, use demo data
      availableTemplates = [
        { 
          id: 't1', 
          name: 'Welcome Message', 
          content: 'Hello {{name}}! Thank you for contacting us. How can we help you today?',
          channelType: 'WHATSAPP',
          category: 'UTILITY',
          language: 'en',
          status: 'APPROVED'
        },
        { 
          id: 't2', 
          name: 'Order Confirmation', 
          content: 'Your order #{{order_id}} has been confirmed. Expected delivery: {{delivery_date}}',
          channelType: 'WHATSAPP',
          category: 'UTILITY',
          language: 'en',
          status: 'APPROVED'
        },
        { 
          id: 't3', 
          name: 'Appointment Reminder', 
          content: 'Reminder: Your appointment is scheduled for {{date}} at {{time}}. Reply CONFIRM to confirm.',
          channelType: 'SMS',
          category: 'UTILITY',
          language: 'en',
          status: 'APPROVED'
        },
        { 
          id: 't4', 
          name: 'Support Ticket Update', 
          content: 'Your support ticket #{{ticket_id}} has been updated. Status: {{status}}',
          channelType: 'EMAIL',
          category: 'UTILITY',
          language: 'en',
          status: 'APPROVED'
        },
        { 
          id: 't5', 
          name: 'Promotional Offer', 
          content: 'Exclusive offer for you! Get {{discount}}% off your next purchase. Use code: {{code}}',
          channelType: 'WHATSAPP',
          category: 'MARKETING',
          language: 'en',
          status: 'APPROVED'
        },
      ];
    } catch (e) {
      console.error('Failed to load message templates:', e);
    } finally {
      isLoading = false;
    }
  }
  
  function handleLabelChange() {
    onUpdate({ label });
  }
  
  function handleTemplateSelect(templateId: string) {
    selectedTemplateId = templateId;
    const template = availableTemplates.find(t => t.id === templateId);
    onUpdate({ 
      templateId,
      templateName: template?.name || '',
      templateContent: template?.content || '',
      channelType: template?.channelType || '',
    });
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-green-500/10 text-green-400';
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-400';
      case 'REJECTED': return 'bg-red-500/10 text-red-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  }
  
  function getChannelTypeColor(type: string): string {
    switch (type) {
      case 'WHATSAPP': return 'bg-green-500/10 text-green-400';
      case 'SMS': return 'bg-blue-500/10 text-blue-400';
      case 'EMAIL': return 'bg-purple-500/10 text-purple-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  }
  
  // Extract variables from template content
  function extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  }
  
  // Load templates on mount
  $effect(() => {
    loadTemplates();
  });
</script>

<div class="space-y-4">
  <!-- Label -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Label
    </label>
    <input
      type="text"
      bind:value={label}
      onblur={handleLabelChange}
      class="input w-full"
      placeholder="Enter label..."
    />
  </div>
  
  <!-- Template Selection -->
  <div>
    <div class="flex items-center justify-between mb-1">
      <label class="block text-sm font-medium text-text-secondary">
        Message Template
      </label>
      <button
        type="button"
        onclick={loadTemplates}
        disabled={isLoading}
        class="p-1 hover:bg-surface-100-900 rounded transition-colors"
        title="Refresh templates"
      >
        {#if isLoading}
          <Loader2 class="w-4 h-4 animate-spin" />
        {:else}
          <RefreshCw class="w-4 h-4" />
        {/if}
      </button>
    </div>
    
    <!-- Filters -->
    <div class="flex gap-2 mb-2">
      <div class="flex-1 relative">
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          bind:value={searchQuery}
          class="input w-full pl-8"
          placeholder="Search templates..."
        />
      </div>
      <select
        bind:value={channelTypeFilter}
        class="input"
      >
        <option value="">All channels</option>
        {#each channelTypes as channelType}
          <option value={channelType}>{channelType}</option>
        {/each}
      </select>
    </div>
    
    <!-- Template List -->
    <div class="max-h-48 overflow-y-auto border border-surface-300-700 rounded">
      {#if isLoading}
        <div class="p-4 text-center text-text-secondary">
          <Loader2 class="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading templates...
        </div>
      {:else if filteredTemplates.length === 0}
        <div class="p-4 text-center text-text-secondary">
          No templates found
        </div>
      {:else}
        {#each filteredTemplates as template (template.id)}
          <button
            type="button"
            onclick={() => handleTemplateSelect(template.id)}
            class="w-full p-2 flex items-start gap-2 hover:bg-surface-100-900 transition-colors text-left border-b border-surface-300-700 last:border-b-0"
            class:bg-accent={selectedTemplateId === template.id}
            class:bg-opacity-10={selectedTemplateId === template.id}
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium">{template.name}</span>
                <span class="text-xs px-1.5 py-0.5 rounded {getChannelTypeColor(template.channelType)}">
                  {template.channelType}
                </span>
                <span class="text-xs px-1.5 py-0.5 rounded {getStatusColor(template.status)}">
                  {template.status}
                </span>
              </div>
              <div class="text-xs text-text-secondary truncate mt-0.5">
                {template.content.substring(0, 60)}...
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
  
  <!-- Selected Template Preview -->
  {#if selectedTemplate}
    <div class="border border-surface-300-700 rounded p-3">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium">Template Preview</h4>
        <button
          type="button"
          onclick={() => showPreview = !showPreview}
          class="p-1 hover:bg-surface-100-900 rounded transition-colors"
          title="Toggle preview"
        >
          <Eye class="w-4 h-4" />
        </button>
      </div>
      
      {#if showPreview}
        <div class="bg-surface-100-900 rounded p-2 text-sm mb-2">
          {selectedTemplate.content}
        </div>
        
        <!-- Variables -->
        {@const variables = extractVariables(selectedTemplate.content)}
        {#if variables.length > 0}
          <div class="mt-2">
            <p class="text-xs text-text-secondary mb-1">Template Variables:</p>
            <div class="flex flex-wrap gap-1">
              {#each variables as variable}
                <span class="text-xs px-1.5 py-0.5 bg-surface-100-900 rounded font-mono">
                  {`{{${variable}}}`}
                </span>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
      
      <div class="text-xs text-text-secondary mt-2">
        <span class="font-medium">Channel:</span> {selectedTemplate.channelType}
        {#if selectedTemplate.category}
          <span class="mx-1">•</span>
          <span class="font-medium">Category:</span> {selectedTemplate.category}
        {/if}
        {#if selectedTemplate.language}
          <span class="mx-1">•</span>
          <span class="font-medium">Language:</span> {selectedTemplate.language}
        {/if}
      </div>
    </div>
  {/if}
  
  <!-- Node Info -->
  <div class="pt-4 border-t border-surface-300-700">
    <h4 class="text-sm font-medium text-text-secondary mb-2">Node Info</h4>
    <dl class="text-xs space-y-1">
      <div class="flex justify-between">
        <dt class="text-text-secondary">ID:</dt>
        <dd class="text-text-primary font-mono">{node.id}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-text-secondary">Type:</dt>
        <dd class="text-text-primary">{node.type}</dd>
      </div>
    </dl>
  </div>
</div>

