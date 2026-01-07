<script lang="ts">
  /**
   * Rule App Configuration Component
   * 
   * Data Sources:
   * - Rule types: Static from defaults.ts
   * - Operators: Static from defaults.ts
   * - Timezones: Static from defaults.ts
   * - Country codes: Static from defaults.ts
   * 
   * Validation:
   * - At least one rule must be configured
   * - Time values must be valid HH:MM format
   * - Regex patterns must be valid
   * 
   * Storage Location:
   * - node.config.rules (object with arrays for each rule type)
   * 
   * Rule Types:
   * - timeOfDay: Time-based routing
   * - countryCode: Location-based routing
   * - callerIdWithheld: Check if caller ID is hidden
   * - numberMatch: Match phone numbers
   * - evaluate: Evaluate call properties
   * 
   * Rules are combined with AND logic between different types,
   * and OR logic within arrays of the same type.
   */
  
  import { 
    RULE_TYPES,
    NUMBER_TYPE_OPTIONS,
    COUNTRY_CODE_MATCH_OPTIONS,
    NUMBER_MATCH_OPTIONS,
    EVALUATE_OPERATORS,
    OPERATORS_WITHOUT_VALUE,
    DAYS_OF_WEEK,
    TIMEZONES,
    COUNTRY_CODES,
    isValidTime,
    isValidRegex,
    type TimeOfDayRule,
    type CountryCodeRule,
    type NumberMatchRule,
    type EvaluateRule,
    type RuleConfig
  } from '$lib/policy-editor/defaults';
  
  interface Props {
    config: {
      rules?: RuleConfig;
    };
    onChange: (field: string, value: unknown) => void;
  }
  
  let { config, onChange }: Props = $props();
  
  // Active rule type tab
  let activeRuleType = $state<string>('timeOfDay');
  
  // Initialize rules structure
  const defaultRules: RuleConfig = {
    timeOfDay: [],
    countryCode: [],
    callerIdWithheld: [],
    numberMatch: [],
    evaluate: []
  };
  
  let rules = $state<RuleConfig>(config.rules || defaultRules);
  
  // Validation state
  let errors = $state<Record<string, string>>({});
  
  // Update local state when config changes
  $effect(() => {
    rules = config.rules || defaultRules;
  });
  
  // Count active rules for each type
  const ruleCounts = $derived(() => ({
    timeOfDay: (rules.timeOfDay || []).flat().length,
    countryCode: (rules.countryCode || []).flat().length,
    callerIdWithheld: (rules.callerIdWithheld || []).flat().length,
    numberMatch: (rules.numberMatch || []).flat().length,
    evaluate: (rules.evaluate || []).flat().length,
  }));
  
  function saveRules() {
    onChange('rules', rules);
  }
  
  // ====== TIME OF DAY RULES ======
  function addTimeOfDayRule() {
    const newRule: TimeOfDayRule = {
      startTime: '09:00',
      endTime: '17:00',
      timeBetween: true,
      startDate: '',
      endDate: '',
      dateBetween: false,
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      timeZone: 'UTC'
    };
    rules.timeOfDay = [...(rules.timeOfDay || []), [newRule]];
    saveRules();
  }
  
  function updateTimeOfDayRule(groupIndex: number, ruleIndex: number, field: string, value: unknown) {
    rules.timeOfDay = rules.timeOfDay.map((group, gi) => {
      if (gi === groupIndex) {
        return group.map((rule, ri) => {
          if (ri === ruleIndex) {
            return { ...rule, [field]: value };
          }
          return rule;
        });
      }
      return group;
    });
    saveRules();
  }
  
  function removeTimeOfDayRule(groupIndex: number, ruleIndex: number) {
    rules.timeOfDay = rules.timeOfDay.map((group, gi) => {
      if (gi === groupIndex) {
        return group.filter((_, ri) => ri !== ruleIndex);
      }
      return group;
    }).filter(group => group.length > 0);
    saveRules();
  }
  
  function toggleDay(groupIndex: number, ruleIndex: number, day: string) {
    const currentDays = rules.timeOfDay[groupIndex]?.[ruleIndex]?.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    updateTimeOfDayRule(groupIndex, ruleIndex, 'days', newDays);
  }
  
  // ====== COUNTRY CODE RULES ======
  function addCountryCodeRule() {
    const newRule: CountryCodeRule = {
      numberType: 'CALLING',
      matches: 'EQUALS',
      countryCode: 'US'
    };
    rules.countryCode = [...(rules.countryCode || []), [newRule]];
    saveRules();
  }
  
  function updateCountryCodeRule(groupIndex: number, ruleIndex: number, field: string, value: unknown) {
    rules.countryCode = rules.countryCode.map((group, gi) => {
      if (gi === groupIndex) {
        return group.map((rule, ri) => {
          if (ri === ruleIndex) {
            return { ...rule, [field]: value };
          }
          return rule;
        });
      }
      return group;
    });
    saveRules();
  }
  
  function removeCountryCodeRule(groupIndex: number, ruleIndex: number) {
    rules.countryCode = rules.countryCode.map((group, gi) => {
      if (gi === groupIndex) {
        return group.filter((_, ri) => ri !== ruleIndex);
      }
      return group;
    }).filter(group => group.length > 0);
    saveRules();
  }
  
  // ====== CALLER ID WITHHELD RULES ======
  function addCallerIdWithheldRule() {
    rules.callerIdWithheld = [...(rules.callerIdWithheld || []), [true]];
    saveRules();
  }
  
  function updateCallerIdWithheldRule(groupIndex: number, ruleIndex: number, value: boolean) {
    rules.callerIdWithheld = rules.callerIdWithheld.map((group, gi) => {
      if (gi === groupIndex) {
        return group.map((_, ri) => ri === ruleIndex ? value : group[ri]);
      }
      return group;
    });
    saveRules();
  }
  
  function removeCallerIdWithheldRule(groupIndex: number, ruleIndex: number) {
    rules.callerIdWithheld = rules.callerIdWithheld.map((group, gi) => {
      if (gi === groupIndex) {
        return group.filter((_, ri) => ri !== ruleIndex);
      }
      return group;
    }).filter(group => group.length > 0);
    saveRules();
  }
  
  // ====== NUMBER MATCH RULES ======
  function addNumberMatchRule() {
    const newRule: NumberMatchRule = {
      numberType: 'CALLING',
      matches: 'EQUALS',
      number: ''
    };
    rules.numberMatch = [...(rules.numberMatch || []), [newRule]];
    saveRules();
  }
  
  function updateNumberMatchRule(groupIndex: number, ruleIndex: number, field: string, value: unknown) {
    rules.numberMatch = rules.numberMatch.map((group, gi) => {
      if (gi === groupIndex) {
        return group.map((rule, ri) => {
          if (ri === ruleIndex) {
            return { ...rule, [field]: value };
          }
          return rule;
        });
      }
      return group;
    });
    
    // Validate regex if MATCHES operator
    const rule = rules.numberMatch[groupIndex]?.[ruleIndex];
    if (rule?.matches === 'MATCHES' && rule.number) {
      if (!isValidRegex(rule.number)) {
        errors[`numberMatch-${groupIndex}-${ruleIndex}`] = 'Invalid regex pattern';
      } else {
        delete errors[`numberMatch-${groupIndex}-${ruleIndex}`];
      }
    }
    
    saveRules();
  }
  
  function removeNumberMatchRule(groupIndex: number, ruleIndex: number) {
    rules.numberMatch = rules.numberMatch.map((group, gi) => {
      if (gi === groupIndex) {
        return group.filter((_, ri) => ri !== ruleIndex);
      }
      return group;
    }).filter(group => group.length > 0);
    saveRules();
  }
  
  // ====== EVALUATE RULES ======
  function addEvaluateRule() {
    const newRule: EvaluateRule = {
      lhs: '',
      operator: '==',
      rhs: ''
    };
    rules.evaluate = [...(rules.evaluate || []), [newRule]];
    saveRules();
  }
  
  function updateEvaluateRule(groupIndex: number, ruleIndex: number, field: string, value: unknown) {
    rules.evaluate = rules.evaluate.map((group, gi) => {
      if (gi === groupIndex) {
        return group.map((rule, ri) => {
          if (ri === ruleIndex) {
            return { ...rule, [field]: value };
          }
          return rule;
        });
      }
      return group;
    });
    saveRules();
  }
  
  function removeEvaluateRule(groupIndex: number, ruleIndex: number) {
    rules.evaluate = rules.evaluate.map((group, gi) => {
      if (gi === groupIndex) {
        return group.filter((_, ri) => ri !== ruleIndex);
      }
      return group;
    }).filter(group => group.length > 0);
    saveRules();
  }
  
  function needsRhsValue(operator: string): boolean {
    return !OPERATORS_WITHOUT_VALUE.includes(operator as typeof OPERATORS_WITHOUT_VALUE[number]);
  }
</script>

<div class="config-section">
  <h4 class="section-title">Rule Settings</h4>
  
  <p class="text-xs text-surface-500 mb-3">
    Configure conditions to branch the call flow. Different rule types are combined using AND logic.
    Multiple rules of the same type use OR logic.
  </p>
  
  <!-- Rule Type Tabs -->
  <div class="rule-tabs mb-4">
    {#each RULE_TYPES as ruleType}
      <button 
        class="rule-tab"
        class:active={activeRuleType === ruleType.value}
        onclick={() => activeRuleType = ruleType.value}
      >
        {ruleType.label}
        {#if ruleCounts()[ruleType.value as keyof typeof ruleCounts] > 0}
          <span class="rule-count">{ruleCounts()[ruleType.value as keyof typeof ruleCounts]}</span>
        {/if}
      </button>
    {/each}
  </div>
  
  <!-- TIME OF DAY -->
  {#if activeRuleType === 'timeOfDay'}
    <div class="space-y-3">
      <p class="text-xs text-surface-500">Route calls based on time, date, and day of week.</p>
      
      {#each rules.timeOfDay || [] as group, groupIndex}
        {#each group as rule, ruleIndex}
          <div class="rule-card">
            <div class="rule-header">
              <span class="text-xs font-medium">Time Rule {groupIndex + 1}.{ruleIndex + 1}</span>
              <button class="delete-btn-sm" onclick={() => removeTimeOfDayRule(groupIndex, ruleIndex)}>×</button>
            </div>
            
            <div class="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label class="config-label text-xs">Start Time</label>
                <input 
                  type="time" 
                  class="config-input"
                  value={rule.startTime}
                  onchange={(e) => updateTimeOfDayRule(groupIndex, ruleIndex, 'startTime', (e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label class="config-label text-xs">End Time</label>
                <input 
                  type="time" 
                  class="config-input"
                  value={rule.endTime}
                  onchange={(e) => updateTimeOfDayRule(groupIndex, ruleIndex, 'endTime', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
            
            <div class="mb-2">
              <label class="config-label text-xs">Days of Week</label>
              <div class="day-selector">
                {#each DAYS_OF_WEEK as day}
                  <button 
                    class="day-btn"
                    class:active={rule.days?.includes(day.value)}
                    onclick={() => toggleDay(groupIndex, ruleIndex, day.value)}
                  >
                    {day.short}
                  </button>
                {/each}
              </div>
            </div>
            
            <div>
              <label class="config-label text-xs">Timezone</label>
              <select 
                class="config-select"
                value={rule.timeZone}
                onchange={(e) => updateTimeOfDayRule(groupIndex, ruleIndex, 'timeZone', (e.target as HTMLSelectElement).value)}
              >
                {#each TIMEZONES as tz}
                  <option value={tz.value}>{tz.label}</option>
                {/each}
              </select>
            </div>
          </div>
        {/each}
      {/each}
      
      <button class="add-btn" onclick={addTimeOfDayRule}>
        + Add Time of Day Rule
      </button>
    </div>
  {/if}
  
  <!-- COUNTRY CODE -->
  {#if activeRuleType === 'countryCode'}
    <div class="space-y-3">
      <p class="text-xs text-surface-500">Route calls based on the caller's or called number's country.</p>
      
      {#each rules.countryCode || [] as group, groupIndex}
        {#each group as rule, ruleIndex}
          <div class="rule-card">
            <div class="rule-header">
              <span class="text-xs font-medium">Country Code Rule {groupIndex + 1}.{ruleIndex + 1}</span>
              <button class="delete-btn-sm" onclick={() => removeCountryCodeRule(groupIndex, ruleIndex)}>×</button>
            </div>
            
            <div class="space-y-2">
              <div>
                <label class="config-label text-xs">Number Type</label>
                <select 
                  class="config-select"
                  value={rule.numberType}
                  onchange={(e) => updateCountryCodeRule(groupIndex, ruleIndex, 'numberType', (e.target as HTMLSelectElement).value)}
                >
                  {#each NUMBER_TYPE_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              </div>
              
              <div>
                <label class="config-label text-xs">Condition</label>
                <select 
                  class="config-select"
                  value={rule.matches}
                  onchange={(e) => updateCountryCodeRule(groupIndex, ruleIndex, 'matches', (e.target as HTMLSelectElement).value)}
                >
                  {#each COUNTRY_CODE_MATCH_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              </div>
              
              <div>
                <label class="config-label text-xs">Country</label>
                <select 
                  class="config-select"
                  value={rule.countryCode}
                  onchange={(e) => updateCountryCodeRule(groupIndex, ruleIndex, 'countryCode', (e.target as HTMLSelectElement).value)}
                >
                  {#each COUNTRY_CODES as country}
                    <option value={country.value}>{country.label} ({country.dialCode})</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>
        {/each}
      {/each}
      
      <button class="add-btn" onclick={addCountryCodeRule}>
        + Add Country Code Rule
      </button>
    </div>
  {/if}
  
  <!-- CALLER ID WITHHELD -->
  {#if activeRuleType === 'callerIdWithheld'}
    <div class="space-y-3">
      <p class="text-xs text-surface-500">Route calls based on whether the caller ID is hidden.</p>
      
      {#each rules.callerIdWithheld || [] as group, groupIndex}
        {#each group as withheld, ruleIndex}
          <div class="rule-card">
            <div class="rule-header">
              <span class="text-xs font-medium">Caller ID Rule {groupIndex + 1}.{ruleIndex + 1}</span>
              <button class="delete-btn-sm" onclick={() => removeCallerIdWithheldRule(groupIndex, ruleIndex)}>×</button>
            </div>
            
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2">
                <input 
                  type="radio" 
                  name={`withheld-${groupIndex}-${ruleIndex}`}
                  checked={withheld === true}
                  onchange={() => updateCallerIdWithheldRule(groupIndex, ruleIndex, true)}
                />
                <span class="text-sm">Caller ID IS withheld</span>
              </label>
              <label class="flex items-center gap-2">
                <input 
                  type="radio" 
                  name={`withheld-${groupIndex}-${ruleIndex}`}
                  checked={withheld === false}
                  onchange={() => updateCallerIdWithheldRule(groupIndex, ruleIndex, false)}
                />
                <span class="text-sm">Caller ID is NOT withheld</span>
              </label>
            </div>
          </div>
        {/each}
      {/each}
      
      <button class="add-btn" onclick={addCallerIdWithheldRule}>
        + Add Caller ID Withheld Rule
      </button>
    </div>
  {/if}
  
  <!-- NUMBER MATCH -->
  {#if activeRuleType === 'numberMatch'}
    <div class="space-y-3">
      <p class="text-xs text-surface-500">Route calls based on specific phone number patterns.</p>
      
      {#each rules.numberMatch || [] as group, groupIndex}
        {#each group as rule, ruleIndex}
          <div class="rule-card">
            <div class="rule-header">
              <span class="text-xs font-medium">Number Match Rule {groupIndex + 1}.{ruleIndex + 1}</span>
              <button class="delete-btn-sm" onclick={() => removeNumberMatchRule(groupIndex, ruleIndex)}>×</button>
            </div>
            
            <div class="space-y-2">
              <div>
                <label class="config-label text-xs">Number Type</label>
                <select 
                  class="config-select"
                  value={rule.numberType}
                  onchange={(e) => updateNumberMatchRule(groupIndex, ruleIndex, 'numberType', (e.target as HTMLSelectElement).value)}
                >
                  {#each NUMBER_TYPE_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              </div>
              
              <div>
                <label class="config-label text-xs">Condition</label>
                <select 
                  class="config-select"
                  value={rule.matches}
                  onchange={(e) => updateNumberMatchRule(groupIndex, ruleIndex, 'matches', (e.target as HTMLSelectElement).value)}
                >
                  {#each NUMBER_MATCH_OPTIONS as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              </div>
              
              <div>
                <label class="config-label text-xs">
                  {rule.matches === 'MATCHES' ? 'Pattern (Regex)' : 'Number'}
                </label>
                <input 
                  type="text" 
                  class="config-input"
                  class:border-red-500={errors[`numberMatch-${groupIndex}-${ruleIndex}`]}
                  value={rule.number}
                  onchange={(e) => updateNumberMatchRule(groupIndex, ruleIndex, 'number', (e.target as HTMLInputElement).value)}
                  placeholder={rule.matches === 'MATCHES' ? '^\\+44.*' : '+44 20 1234 5678'}
                />
                {#if errors[`numberMatch-${groupIndex}-${ruleIndex}`]}
                  <p class="text-xs text-red-500 mt-1">{errors[`numberMatch-${groupIndex}-${ruleIndex}`]}</p>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      {/each}
      
      <button class="add-btn" onclick={addNumberMatchRule}>
        + Add Number Match Rule
      </button>
    </div>
  {/if}
  
  <!-- EVALUATE -->
  {#if activeRuleType === 'evaluate'}
    <div class="space-y-3">
      <p class="text-xs text-surface-500">Route calls based on call property values.</p>
      
      {#each rules.evaluate || [] as group, groupIndex}
        {#each group as rule, ruleIndex}
          <div class="rule-card">
            <div class="rule-header">
              <span class="text-xs font-medium">Evaluate Rule {groupIndex + 1}.{ruleIndex + 1}</span>
              <button class="delete-btn-sm" onclick={() => removeEvaluateRule(groupIndex, ruleIndex)}>×</button>
            </div>
            
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="config-label text-xs">Property (LHS)</label>
                <input 
                  type="text" 
                  class="config-input"
                  value={rule.lhs}
                  onchange={(e) => updateEvaluateRule(groupIndex, ruleIndex, 'lhs', (e.target as HTMLInputElement).value)}
                  placeholder="\u007Bcaller_name\u007D"
                />
              </div>
              
              <div>
                <label class="config-label text-xs">Operator</label>
                <select 
                  class="config-select"
                  value={rule.operator}
                  onchange={(e) => updateEvaluateRule(groupIndex, ruleIndex, 'operator', (e.target as HTMLSelectElement).value)}
                >
                  {#each EVALUATE_OPERATORS as op}
                    <option value={op.value}>{op.label}</option>
                  {/each}
                </select>
              </div>
              
              {#if needsRhsValue(rule.operator)}
                <div>
                  <label class="config-label text-xs">Value (RHS)</label>
                  <input 
                    type="text" 
                    class="config-input"
                    value={rule.rhs}
                    onchange={(e) => updateEvaluateRule(groupIndex, ruleIndex, 'rhs', (e.target as HTMLInputElement).value)}
                    placeholder="value"
                  />
                </div>
              {:else}
                <div></div>
              {/if}
            </div>
          </div>
        {/each}
      {/each}
      
      <button class="add-btn" onclick={addEvaluateRule}>
        + Add Evaluate Rule
      </button>
    </div>
  {/if}
</div>

<style>
  .config-section {
    padding-top: 0.5rem;
  }
  
  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  :global(.dark) .section-title {
    color: rgb(var(--color-surface-400));
  }
  
  .rule-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .rule-tab {
    padding: 0.375rem 0.625rem;
    font-size: 0.625rem;
    font-weight: 500;
    color: rgb(var(--color-surface-500));
    background: rgb(var(--color-surface-100));
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  :global(.dark) .rule-tab {
    background: rgb(var(--color-surface-700));
    border-color: rgb(var(--color-surface-600));
  }
  
  .rule-tab:hover {
    border-color: rgb(var(--color-primary-400));
  }
  
  .rule-tab.active {
    color: rgb(var(--color-primary-600));
    background: rgb(var(--color-primary-50));
    border-color: rgb(var(--color-primary-300));
  }
  
  :global(.dark) .rule-tab.active {
    color: rgb(var(--color-primary-400));
    background: rgba(var(--color-primary-500), 0.2);
    border-color: rgba(var(--color-primary-500), 0.4);
  }
  
  .rule-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1rem;
    height: 1rem;
    font-size: 0.625rem;
    font-weight: 600;
    background: rgb(var(--color-primary-500));
    color: white;
    border-radius: 9999px;
  }
  
  .rule-card {
    padding: 0.75rem;
    background: rgb(var(--color-surface-50));
    border: 1px solid rgb(var(--color-surface-200));
    border-radius: 0.375rem;
  }
  
  :global(.dark) .rule-card {
    background: rgb(var(--color-surface-700));
    border-color: rgb(var(--color-surface-600));
  }
  
  .rule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgb(var(--color-surface-200));
  }
  
  :global(.dark) .rule-header {
    border-bottom-color: rgb(var(--color-surface-600));
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
  
  .delete-btn-sm:hover {
    color: rgb(var(--color-red-500));
    background: rgb(var(--color-red-50));
  }
  
  :global(.dark) .delete-btn-sm:hover {
    background: rgba(var(--color-red-500), 0.2);
  }
  
  .day-selector {
    display: flex;
    gap: 0.25rem;
  }
  
  .day-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.625rem;
    font-weight: 500;
    color: rgb(var(--color-surface-500));
    background: rgb(var(--color-surface-100));
    border: 1px solid rgb(var(--color-surface-300));
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  :global(.dark) .day-btn {
    background: rgb(var(--color-surface-800));
    border-color: rgb(var(--color-surface-600));
  }
  
  .day-btn.active {
    color: white;
    background: rgb(var(--color-primary-500));
    border-color: rgb(var(--color-primary-500));
  }
  
  .config-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(var(--color-surface-600));
    margin-bottom: 0.25rem;
  }
  
  :global(.dark) .config-label {
    color: rgb(var(--color-surface-400));
  }
  
  .config-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
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
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
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
  
  .add-btn {
    width: 100%;
    padding: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(var(--color-primary-600));
    background-color: rgb(var(--color-primary-50));
    border: 1px dashed rgb(var(--color-primary-300));
    border-radius: 0.25rem;
    cursor: pointer;
  }
  
  :global(.dark) .add-btn {
    color: rgb(var(--color-primary-400));
    background-color: rgba(var(--color-primary-500), 0.1);
    border-color: rgba(var(--color-primary-500), 0.3);
  }
  
  .add-btn:hover {
    background-color: rgb(var(--color-primary-100));
  }
  
  :global(.dark) .add-btn:hover {
    background-color: rgba(var(--color-primary-500), 0.2);
  }
</style>

