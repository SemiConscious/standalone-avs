<script lang="ts">
  /**
   * Query Object App Configuration Component
   * 
   * Data Sources:
   * - SObjects list: Salesforce getSObjects() (passed as prop)
   * - SObject fields: Salesforce getSObjectFields() (passed as prop)
   * - Trigger conditions: Static from defaults.ts
   * - Sort directions: Static from defaults.ts
   * 
   * Validation:
   * - sObject: Required
   * - selectedFields: At least 1 field required
   * - soql: Valid SOQL syntax if in SOQL mode
   * 
   * Storage Location:
   * - node.config.sObject
   * - node.config.filterFields
   * - node.config.selectedFields
   * - node.config.orderBy
   * - node.config.resultSize
   * - node.config.trigger
   * - node.config.showAPIName
   * - node.config.soql
   * 
   * Tabs: BUILDER, SOQL
   */
  
  import { 
    STANDARD_SOBJECTS,
    SORT_DIRECTIONS,
    TRIGGER_WHEN_LIST_QUERY,
    EVALUATE_OPERATORS,
    isValidSOQL
  } from '$lib/policy-editor/defaults';
  
  interface SObjectData {
    value: string;
    label: string;
    queryable?: boolean;
    createable?: boolean;
  }
  
  interface FieldData {
    name: string;
    label: string;
    type: string;
  }
  
  interface FilterField {
    field: string;
    operator: string;
    value: string;
  }
  
  interface Props {
    config: {
      sObject?: string;
      filterFields?: FilterField[];
      selectedFields?: string[];
      orderBy?: { field: string; direction: string };
      resultSize?: number;
      trigger?: string;
      showAPIName?: boolean;
      soql?: string;
    };
    sObjects?: SObjectData[];
    sObjectFields?: FieldData[];
    onLoadFields?: (sObject: string) => void;
    onChange: (field: string, value: unknown) => void;
  }
  
  let { 
    config, 
    sObjects = STANDARD_SOBJECTS.map(o => ({ ...o, queryable: true })), 
    sObjectFields = [],
    onLoadFields,
    onChange 
  }: Props = $props();
  
  // Active tab
  let activeTab = $state<'builder' | 'soql'>('builder');
  
  // Local state
  let sObject = $state(config.sObject || '');
  let filterFields = $state<FilterField[]>(config.filterFields || []);
  let selectedFields = $state<string[]>(config.selectedFields || []);
  let orderByField = $state(config.orderBy?.field || '');
  let orderByDirection = $state(config.orderBy?.direction || 'ASC');
  let resultSize = $state(config.resultSize || 1);
  let trigger = $state(config.trigger || 'ALWAYS');
  let showAPIName = $state(config.showAPIName || false);
  let soql = $state(config.soql || '');
  
  // Validation
  let errors = $state<Record<string, string>>({});
  
  $effect(() => {
    sObject = config.sObject || '';
    filterFields = config.filterFields || [];
    selectedFields = config.selectedFields || [];
    orderByField = config.orderBy?.field || '';
    orderByDirection = config.orderBy?.direction || 'ASC';
    resultSize = config.resultSize || 1;
    trigger = config.trigger || 'ALWAYS';
    showAPIName = config.showAPIName || false;
    soql = config.soql || '';
  });
  
  function handleSObjectChange() {
    onChange('sObject', sObject);
    // Trigger field loading
    if (sObject && onLoadFields) {
      onLoadFields(sObject);
    }
    // Clear field selections
    filterFields = [];
    selectedFields = [];
    orderByField = '';
    onChange('filterFields', []);
    onChange('selectedFields', []);
    onChange('orderBy', { field: '', direction: 'ASC' });
  }
  
  function handleChange(field: string, value: unknown) {
    onChange(field, value);
  }
  
  function addFilterField() {
    filterFields = [...filterFields, { field: '', operator: '==', value: '' }];
    handleChange('filterFields', filterFields);
  }
  
  function updateFilterField(index: number, field: keyof FilterField, value: string) {
    filterFields = filterFields.map((f, i) => 
      i === index ? { ...f, [field]: value } : f
    );
    handleChange('filterFields', filterFields);
  }
  
  function removeFilterField(index: number) {
    filterFields = filterFields.filter((_, i) => i !== index);
    handleChange('filterFields', filterFields);
  }
  
  function toggleSelectedField(fieldName: string) {
    if (selectedFields.includes(fieldName)) {
      selectedFields = selectedFields.filter(f => f !== fieldName);
    } else {
      selectedFields = [...selectedFields, fieldName];
    }
    handleChange('selectedFields', selectedFields);
  }
  
  function saveOrderBy() {
    handleChange('orderBy', { field: orderByField, direction: orderByDirection });
  }
  
  function validateAndSaveSOQL() {
    if (soql && !isValidSOQL(soql)) {
      errors.soql = 'SOQL must start with SELECT and include FROM';
    } else {
      delete errors.soql;
    }
    handleChange('soql', soql);
  }
  
  // Generate SOQL from builder config
  const generatedSOQL = $derived(() => {
    if (!sObject) return '';
    const fields = selectedFields.length > 0 ? selectedFields.join(', ') : 'Id';
    let query = `SELECT ${fields} FROM ${sObject}`;
    
    if (filterFields.length > 0) {
      const conditions = filterFields
        .filter(f => f.field && f.value)
        .map(f => `${f.field} ${f.operator} '${f.value}'`);
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }
    
    if (orderByField) {
      query += ` ORDER BY ${orderByField} ${orderByDirection}`;
    }
    
    query += ` LIMIT ${resultSize}`;
    return query;
  });
</script>

<div class="config-section">
  <h4 class="section-title">Query Object Settings</h4>
  
  <!-- Tab Navigation -->
  <div class="tab-nav mb-4">
    <button class="tab-btn" class:active={activeTab === 'builder'} onclick={() => activeTab = 'builder'}>
      Builder
    </button>
    <button class="tab-btn" class:active={activeTab === 'soql'} onclick={() => activeTab = 'soql'}>
      SOQL
    </button>
  </div>
  
  <!-- BUILDER Tab -->
  {#if activeTab === 'builder'}
    <div class="space-y-4">
      <!-- Salesforce Object -->
      <div>
        <label class="config-label">Salesforce Object <span class="text-red-500">*</span></label>
        <select 
          class="config-select"
          bind:value={sObject}
          onchange={handleSObjectChange}
        >
          <option value="">Select object...</option>
          {#each sObjects.filter(o => o.queryable !== false) as obj}
            <option value={obj.value}>{showAPIName ? obj.value : obj.label}</option>
          {/each}
        </select>
      </div>
      
      {#if sObject}
        <!-- Filter Fields -->
        <div>
          <label class="config-label">Filter Criteria</label>
          
          {#each filterFields as filter, index}
            <div class="flex gap-2 mb-2 items-center">
              <select 
                class="config-select flex-1"
                value={filter.field}
                onchange={(e) => updateFilterField(index, 'field', (e.target as HTMLSelectElement).value)}
              >
                <option value="">Select field...</option>
                {#each sObjectFields as field}
                  <option value={field.name}>{showAPIName ? field.name : field.label}</option>
                {/each}
              </select>
              <select 
                class="config-select w-20"
                value={filter.operator}
                onchange={(e) => updateFilterField(index, 'operator', (e.target as HTMLSelectElement).value)}
              >
                {#each EVALUATE_OPERATORS.slice(0, 6) as op}
                  <option value={op.value}>{op.value}</option>
                {/each}
              </select>
              <input 
                type="text" 
                class="config-input flex-1"
                value={filter.value}
                onchange={(e) => updateFilterField(index, 'value', (e.target as HTMLInputElement).value)}
                placeholder="Value or \u007Bmacro\u007D"
              />
              <button class="delete-btn-sm" onclick={() => removeFilterField(index)}>×</button>
            </div>
          {/each}
          
          <button class="add-btn-sm" onclick={addFilterField}>
            + Add Filter
          </button>
        </div>
        
        <!-- Select Fields -->
        <div>
          <label class="config-label">Select Fields <span class="text-red-500">*</span></label>
          <div class="field-grid">
            {#each sObjectFields as field}
              <label class="field-checkbox">
                <input 
                  type="checkbox"
                  checked={selectedFields.includes(field.name)}
                  onchange={() => toggleSelectedField(field.name)}
                />
                <span class="text-xs">{showAPIName ? field.name : field.label}</span>
              </label>
            {/each}
          </div>
          {#if selectedFields.length === 0}
            <p class="text-xs text-amber-600 mt-1">⚠️ At least one field must be selected</p>
          {/if}
        </div>
        
        <!-- Order By -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="config-label text-xs">Order By</label>
            <select 
              class="config-select"
              bind:value={orderByField}
              onchange={saveOrderBy}
            >
              <option value="">None</option>
              {#each sObjectFields as field}
                <option value={field.name}>{showAPIName ? field.name : field.label}</option>
              {/each}
            </select>
          </div>
          <div>
            <label class="config-label text-xs">Direction</label>
            <select 
              class="config-select"
              bind:value={orderByDirection}
              onchange={saveOrderBy}
            >
              {#each SORT_DIRECTIONS as dir}
                <option value={dir.value}>{dir.label}</option>
              {/each}
            </select>
          </div>
        </div>
        
        <!-- Result Size -->
        <div>
          <label class="config-label">Max Results</label>
          <input 
            type="number" 
            class="config-input"
            bind:value={resultSize}
            onchange={() => handleChange('resultSize', resultSize)}
            min="1"
            max="200"
          />
        </div>
        
        <!-- Generated SOQL Preview -->
        <div class="p-3 bg-surface-100 dark:bg-surface-700 rounded-md">
          <p class="text-xs font-medium text-surface-600 dark:text-surface-300 mb-1">Generated SOQL</p>
          <code class="text-xs text-surface-700 dark:text-surface-300 block break-all">
            {generatedSOQL()}
          </code>
        </div>
      {/if}
      
      <!-- Trigger -->
      <div>
        <label class="config-label">Trigger Output</label>
        <select 
          class="config-select"
          bind:value={trigger}
          onchange={() => handleChange('trigger', trigger)}
        >
          {#each TRIGGER_WHEN_LIST_QUERY as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      
      <!-- Show API Name Toggle -->
      <label class="flex items-center gap-2">
        <input 
          type="checkbox" 
          class="config-checkbox"
          bind:checked={showAPIName}
          onchange={() => handleChange('showAPIName', showAPIName)}
        />
        <span class="text-sm">Show API Names</span>
      </label>
    </div>
  {/if}
  
  <!-- SOQL Tab -->
  {#if activeTab === 'soql'}
    <div class="space-y-4">
      <p class="text-xs text-surface-500">
        Write SOQL directly for complex queries.
      </p>
      
      <div>
        <label class="config-label">SOQL Query</label>
        <textarea 
          class="config-input font-mono resize-none"
          class:border-red-500={errors.soql}
          rows="6"
          bind:value={soql}
          onchange={validateAndSaveSOQL}
          placeholder="SELECT Id, Name, Phone FROM Contact WHERE Phone != null LIMIT 10"
        ></textarea>
        {#if errors.soql}
          <p class="text-xs text-red-500 mt-1">{errors.soql}</p>
        {:else}
          <p class="text-xs text-surface-500 mt-1">
            Use {'{macro}'} syntax for dynamic values, e.g., {'{caller_number}'}
          </p>
        {/if}
      </div>
      
      <!-- Trigger -->
      <div>
        <label class="config-label">Trigger Output</label>
        <select 
          class="config-select"
          bind:value={trigger}
          onchange={() => handleChange('trigger', trigger)}
        >
          {#each TRIGGER_WHEN_LIST_QUERY as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}
</div>

<style>
  .config-section { padding-top: 0.5rem; }
  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  :global(.dark) .section-title { color: rgb(var(--color-surface-400)); }
  
  .tab-nav {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid rgb(var(--color-surface-300));
    padding-bottom: 0.5rem;
  }
  :global(.dark) .tab-nav { border-bottom-color: rgb(var(--color-surface-600)); }
  
  .tab-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(var(--color-surface-500));
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .tab-btn:hover { color: rgb(var(--color-surface-700)); background-color: rgb(var(--color-surface-100)); }
  :global(.dark) .tab-btn:hover { color: rgb(var(--color-surface-300)); background-color: rgb(var(--color-surface-700)); }
  .tab-btn.active { color: rgb(var(--color-primary-600)); background-color: rgb(var(--color-primary-50)); }
  :global(.dark) .tab-btn.active { color: rgb(var(--color-primary-400)); background-color: rgba(var(--color-primary-500), 0.2); }
  
  .config-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.375rem;
  }
  :global(.dark) .config-label { color: rgb(var(--color-surface-400)); }
  
  .config-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    background-color: white;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    color: rgb(var(--color-surface-800));
  }
  :global(.dark) .config-input {
    background-color: rgb(var(--color-surface-900));
    border-color: rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-100));
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
  
  .config-checkbox {
    width: 1rem;
    height: 1rem;
    accent-color: rgb(var(--color-primary-500));
  }
  
  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem;
    max-height: 150px;
    overflow-y: auto;
    padding: 0.5rem;
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    background: rgb(var(--color-surface-50));
  }
  :global(.dark) .field-grid {
    border-color: rgb(var(--color-surface-600));
    background: rgb(var(--color-surface-800));
  }
  
  .field-checkbox {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    cursor: pointer;
  }
  
  .field-checkbox input {
    width: 0.75rem;
    height: 0.75rem;
  }
  
  .add-btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(var(--color-primary-600));
    background: transparent;
    border: 1px dashed rgb(var(--color-primary-300));
    border-radius: 0.25rem;
    cursor: pointer;
  }
  :global(.dark) .add-btn-sm {
    color: rgb(var(--color-primary-400));
    border-color: rgba(var(--color-primary-500), 0.3);
  }
  
  .delete-btn-sm {
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    color: rgb(var(--color-surface-500));
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .delete-btn-sm:hover { color: rgb(var(--color-red-500)); background: rgb(var(--color-red-50)); }
  :global(.dark) .delete-btn-sm:hover { background: rgba(var(--color-red-500), 0.2); }
</style>

