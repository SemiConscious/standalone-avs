<script lang="ts">
  import { Card, Button, Badge } from '$lib/components/ui';
  import {
    ArrowLeft,
    Download,
    FileSpreadsheet,
    Calendar,
    Filter,
    Columns,
    Check,
    FlaskConical,
    AlertCircle,
    CheckCircle,
    Loader2,
  } from 'lucide-svelte';
  import type { ExportPageData, ExportField } from './+page.server';

  interface Props {
    data: ExportPageData;
  }

  let { data }: Props = $props();

  // Form state
  let startDate = $state('');
  let endDate = $state('');
  let direction = $state('all');
  let format = $state('csv');
  let limit = $state(1000);
  let selectedFields = $state<string[]>(data.fields.filter(f => f.default).map(f => f.key));

  // Export state
  let exporting = $state(false);
  let exportError = $state<string | null>(null);
  let exportSuccess = $state(false);

  // Set default date range (last 30 days)
  $effect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    endDate = today.toISOString().split('T')[0];
    startDate = thirtyDaysAgo.toISOString().split('T')[0];
  });

  function toggleField(fieldKey: string) {
    if (selectedFields.includes(fieldKey)) {
      selectedFields = selectedFields.filter(f => f !== fieldKey);
    } else {
      selectedFields = [...selectedFields, fieldKey];
    }
  }

  function selectAllFields() {
    selectedFields = data.fields.map(f => f.key);
  }

  function selectDefaultFields() {
    selectedFields = data.fields.filter(f => f.default).map(f => f.key);
  }

  async function handleExport() {
    exporting = true;
    exportError = null;
    exportSuccess = false;

    try {
      const formData = new FormData();
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('direction', direction);
      formData.append('format', format);
      formData.append('limit', String(limit));
      selectedFields.forEach(f => formData.append('fields', f));

      const response = await fetch('?/export', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.type === 'failure' || !result.data?.success) {
        exportError = result.data?.error || 'Export failed';
        return;
      }

      // Generate and download file
      const exportData = result.data.data;
      
      if (format === 'csv') {
        downloadCSV(exportData);
      } else {
        downloadJSON(exportData);
      }

      exportSuccess = true;
      setTimeout(() => { exportSuccess = false; }, 3000);
    } catch (e) {
      exportError = e instanceof Error ? e.message : 'Export failed';
    } finally {
      exporting = false;
    }
  }

  function downloadCSV(data: Record<string, string | number>[]) {
    if (!data || data.length === 0) {
      exportError = 'No data to export';
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    downloadFile(csvContent, 'text/csv', `call-export-${new Date().toISOString().split('T')[0]}.csv`);
  }

  function downloadJSON(data: Record<string, string | number>[]) {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'application/json', `call-export-${new Date().toISOString().split('T')[0]}.json`);
  }

  function downloadFile(content: string, mimeType: string, filename: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Export Call Data | Call Reporting</title>
</svelte:head>

<div class="space-y-6">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - export will generate sample data</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}

  <!-- Export Error -->
  {#if exportError}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{exportError}</p>
    </div>
  {/if}

  <!-- Export Success -->
  {#if exportSuccess}
    <div class="bg-success/10 border border-success/20 text-success rounded-base p-4 flex items-center gap-3">
      <CheckCircle class="w-5 h-5 flex-shrink-0" />
      <p>Export completed successfully!</p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <nav class="text-sm text-text-secondary mb-2">
        <a href="/call-reporting" class="hover:text-text-primary inline-flex items-center gap-1">
          <ArrowLeft class="w-4 h-4" />
          Back to Call Reporting
        </a>
      </nav>
      <h1 class="text-2xl font-bold text-text-primary">Export Call Data</h1>
      <p class="text-text-secondary mt-1">Configure and download call data exports</p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Configuration Panel -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Date Range -->
      <Card>
        <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Calendar class="w-5 h-5 text-text-primary" />
          Date Range
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="start-date" class="block text-sm font-medium text-text-secondary mb-1">Start Date</label>
            <input
              id="start-date"
              type="date"
              bind:value={startDate}
              class="input w-full"
            />
          </div>
          <div>
            <label for="end-date" class="block text-sm font-medium text-text-secondary mb-1">End Date</label>
            <input
              id="end-date"
              type="date"
              bind:value={endDate}
              class="input w-full"
            />
          </div>
        </div>
      </Card>

      <!-- Filters -->
      <Card>
        <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Filter class="w-5 h-5 text-text-primary" />
          Filters
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="direction" class="block text-sm font-medium text-text-secondary mb-1">Call Direction</label>
            <select id="direction" bind:value={direction} class="input w-full">
              <option value="all">All Directions</option>
              <option value="Inbound">Inbound</option>
              <option value="Outbound">Outbound</option>
              <option value="Internal">Internal</option>
            </select>
          </div>
          <div>
            <label for="limit" class="block text-sm font-medium text-text-secondary mb-1">Max Records</label>
            <select id="limit" bind:value={limit} class="input w-full">
              <option value={100}>100 records</option>
              <option value={500}>500 records</option>
              <option value={1000}>1,000 records</option>
              <option value={5000}>5,000 records</option>
              <option value={10000}>10,000 records</option>
            </select>
          </div>
        </div>
      </Card>

      <!-- Field Selection -->
      <Card>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Columns class="w-5 h-5 text-text-primary" />
            Select Fields
          </h2>
          <div class="flex gap-2">
            <Button variant="ghost" size="sm" onclick={selectAllFields}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onclick={selectDefaultFields}>
              Reset to Default
            </Button>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          {#each data.fields as field}
            <button
              type="button"
              onclick={() => toggleField(field.key)}
              class="p-3 rounded-base border text-left transition-colors flex items-center gap-2 {selectedFields.includes(field.key) ? 'bg-primary-500/20 border-primary-400 text-text-primary' : 'border-border hover:border-primary-400 text-text-secondary'}"
            >
              {#if selectedFields.includes(field.key)}
                <Check class="w-4 h-4 flex-shrink-0" />
              {:else}
                <div class="w-4 h-4 flex-shrink-0"></div>
              {/if}
              <span class="text-sm">{field.label}</span>
            </button>
          {/each}
        </div>
        <p class="text-sm text-text-secondary mt-3">
          {selectedFields.length} of {data.fields.length} fields selected
        </p>
      </Card>
    </div>

    <!-- Export Panel -->
    <div class="space-y-6">
      <Card>
        <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FileSpreadsheet class="w-5 h-5 text-text-primary" />
          Export Options
        </h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Format</label>
            <div class="space-y-2">
              <label class="flex items-center gap-3 p-3 rounded-base border cursor-pointer transition-colors {format === 'csv' ? 'bg-primary-500/20 border-primary-400' : 'border-border hover:border-primary-400'}">
                <input type="radio" bind:group={format} value="csv" class="sr-only" />
                <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center {format === 'csv' ? 'border-primary-400' : 'border-border'}">
                  {#if format === 'csv'}
                    <div class="w-2 h-2 rounded-full bg-primary-400"></div>
                  {/if}
                </div>
                <div>
                  <span class="font-medium text-text-primary">CSV</span>
                  <p class="text-xs text-text-secondary">Comma-separated values (Excel compatible)</p>
                </div>
              </label>
              <label class="flex items-center gap-3 p-3 rounded-base border cursor-pointer transition-colors {format === 'json' ? 'bg-primary-500/20 border-primary-400' : 'border-border hover:border-primary-400'}">
                <input type="radio" bind:group={format} value="json" class="sr-only" />
                <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center {format === 'json' ? 'border-primary-400' : 'border-border'}">
                  {#if format === 'json'}
                    <div class="w-2 h-2 rounded-full bg-primary-400"></div>
                  {/if}
                </div>
                <div>
                  <span class="font-medium text-text-primary">JSON</span>
                  <p class="text-xs text-text-secondary">JavaScript Object Notation</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-6 border-t border-border">
          <div class="text-sm text-text-secondary mb-4 space-y-1">
            <p>• Date range: {startDate || 'Not set'} to {endDate || 'Not set'}</p>
            <p>• Direction: {direction === 'all' ? 'All' : direction}</p>
            <p>• Fields: {selectedFields.length} selected</p>
            <p>• Max records: {limit.toLocaleString()}</p>
          </div>
          
          <Button 
            variant="primary" 
            class="w-full" 
            onclick={handleExport}
            disabled={exporting || selectedFields.length === 0}
          >
            {#if exporting}
              <Loader2 class="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            {:else}
              <Download class="w-4 h-4 mr-2" />
              Export Data
            {/if}
          </Button>
        </div>
      </Card>

      <Card>
        <h3 class="font-medium text-text-primary mb-2">Export Tips</h3>
        <ul class="text-sm text-text-secondary space-y-2">
          <li>• Large exports may take a moment to process</li>
          <li>• CSV files can be opened in Excel or Google Sheets</li>
          <li>• JSON format is ideal for programmatic use</li>
          <li>• Maximum of 10,000 records per export</li>
        </ul>
      </Card>
    </div>
  </div>
</div>
