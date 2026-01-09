<script lang="ts">
  import { browser } from '$app/environment';
  import { Card } from '$lib/components/ui';
  import { AlertCircle, Loader2, ExternalLink } from 'lucide-svelte';
  import type { EditorPageData } from './+page.server';

  interface Props {
    data: EditorPageData;
  }

  let { data }: Props = $props();
  let loading = $state(true);
  let error = $state<string | null>(data.error || null);
  let loadAttempts = $state(0);
  let debugInfo = $state('Initializing...');
  let debugLog = $state<string[]>([]);

  // Immediate log (runs during hydration)
  if (browser) {
    console.log('[RPE] Script executing in browser, data:', data);
    debugInfo = `Browser mode, authenticated: ${data.isAuthenticated}`;
  } else {
    console.log('[RPE] Script executing on server');
  }

  // Use $effect instead of onMount for Svelte 5 runes mode
  let initialized = false;
  $effect(() => {
    if (!browser || initialized) return;
    initialized = true;
    
    log('$effect running');
    log(`Authenticated: ${data.isAuthenticated}`);
    
    if (!data.isAuthenticated) {
      log('Not authenticated, stopping');
      loading = false;
      return;
    }

    // Set up window.config for the React app
    (window as any).config = {
      avsNamespace: data.config.avsNamespace,
      urls: data.config.urls,
      orgId: data.config.orgId,
      nbOrgId: data.config.nbOrgId,
      reactControllerEnabled: data.config.reactControllerEnabled,
      chatJson: '{}',
    };
    log('window.config set');

    // Create mock for Salesforce RemoteAction
    setupRemoteActionMock();

    // Load the React bundle
    loadReactBundle();
  });

  function log(msg: string) {
    debugLog = [...debugLog, msg];
    debugInfo = msg;
  }

  function setupRemoteActionMock() {
    // Track RemoteAction calls for debugging
    const calls: string[] = [];
    
    // Create the Visualforce namespace mock
    (window as any).Visualforce = {
      remoting: {
        Manager: {
          invokeAction: async function(
            action: string, 
            ...args: unknown[]
          ) {
            calls.push(action);
            log(`RemoteAction: ${action}`);
            
            // Find the callback function and options object
            let callback: ((result: unknown, event: { status: boolean; message?: string }) => void) | null = null;
            let options: Record<string, unknown> | null = null;
            const params: unknown[] = [];
            
            for (const arg of args) {
              if (typeof arg === 'function') {
                callback = arg as (result: unknown, event: { status: boolean; message?: string }) => void;
              } else if (typeof arg === 'object' && arg !== null && ('escape' in arg || 'buffer' in arg || 'timeout' in arg)) {
                options = arg as Record<string, unknown>;
              } else {
                params.push(arg);
              }
            }

            // Extract method name from action (e.g., "nbavs.ReactController.query" -> "query")
            const methodName = action.split('.').pop();
            
            log(`RemoteAction params: ${JSON.stringify(params).substring(0, 100)}`);

            try {
              const result = await callApi(methodName!, params);
              log(`RemoteAction OK: ${action}`);
              if (callback) {
                callback(result, { status: true });
              }
            } catch (e) {
              const errorMsg = e instanceof Error ? e.message : String(e);
              log(`RemoteAction ERROR: ${action} - ${errorMsg}`);
              if (callback) {
                callback(null, { status: false, message: errorMsg });
              }
            }
          }
        }
      }
    };

    // Mock the Salesforce AJAX Toolkit (/soap/ajax/35.0/connection.js and apex.js)
    (window as any).sforce = {
      connection: {
        sessionId: 'mock-session',
        serverUrl: '/services/Soap/u/35.0',
      },
      apex: {
        execute: async function(namespace: string, method: string, params: Record<string, unknown>) {
          log(`sforce.apex: ${namespace}.${method}`);
          // Route to our API
          try {
            const result = await callApi(method, Object.values(params));
            log(`sforce.apex OK: ${method}`);
            return result;
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            log(`sforce.apex ERROR: ${method} - ${errorMsg}`);
            throw e;
          }
        }
      }
    };
    
    // Mock Salesforce connection for queries
    (window as any).sforce.connection.query = async function(soql: string) {
      log(`sforce.query: ${soql.substring(0, 50)}...`);
      try {
        const result = await callApi('query', [soql]);
        log(`sforce.query OK`);
        return result;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        log(`sforce.query ERROR: ${errorMsg}`);
        throw e;
      }
    };
    
    log('Mocks installed: Visualforce, sforce');
    log(`Config: namespace=${data.config.avsNamespace}, orgId=${data.config.orgId}`);
  }

  async function callApi(method: string, params: unknown[]): Promise<unknown> {
    const baseUrl = '/api/react';

    switch (method) {
      case 'query': {
        const response = await fetch(`${baseUrl}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: params[0] }),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'getAuthToken': {
        const response = await fetch(`${baseUrl}/getAuthToken`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: params[0] }),
        });
        if (!response.ok) throw new Error(await response.text());
        // Return raw JWT string - this is what Salesforce RemoteAction returns
        return response.text();
      }

      case 'getHostURLs': {
        const response = await fetch(`${baseUrl}/getHostURLs`);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'getAPISettings': {
        const response = await fetch(`${baseUrl}/getAPISettings`);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'getNamespace': {
        const response = await fetch(`${baseUrl}/getNamespace`);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'getNamespacePrefix': {
        return data.config.avsNamespace ? `${data.config.avsNamespace}__` : '';
      }

      case 'getSObjects': {
        const response = await fetch(`${baseUrl}/getSObjects`);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'getSObjectFields': {
        const response = await fetch(`${baseUrl}/getSObjectFields?objectName=${params[0]}`);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'getRecords': {
        const [objectName, fields, where, orderBy, limit] = params;
        const response = await fetch(`${baseUrl}/getRecords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            objectName, 
            fields: JSON.parse(fields as string), 
            where, 
            orderBy, 
            limit 
          }),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'createRecord': {
        const [objectName, fieldValuesString] = params;
        const response = await fetch(`${baseUrl}/createRecord`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            objectName, 
            fieldValues: JSON.parse(fieldValuesString as string) 
          }),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'updateRecord': {
        const [recordId, fieldsJson] = params;
        const response = await fetch(`${baseUrl}/updateRecord`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            recordId, 
            fieldValues: JSON.parse(fieldsJson as string) 
          }),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'deleteRecord': {
        const response = await fetch(`${baseUrl}/deleteRecord`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordId: params[0] }),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      }

      case 'getOrgSettings': {
        // Return empty settings object
        return {};
      }

      case 'getOrgLicense': {
        // Return empty license object
        return {};
      }

      case 'performGrabRecordAccess': {
        // Return full access mock
        return {
          HasReadAccess: true,
          HasEditAccess: true,
          HasDeleteAccess: true,
          HasTransferAccess: true,
          HasAllAccess: true,
        };
      }

      case 'checkRecordAccess': {
        // Return true for access checks
        return true;
      }

      case 'getLoggedInSFUser': {
        // Return current user info
        return [{ Id: 'mock-user-id', Name: 'Current User' }];
      }

      default:
        console.warn(`[RemoteAction Mock] Unknown method: ${method}`, params);
        return null;
    }
  }

  function loadReactBundle() {
    loadAttempts++;
    
    // Use local copies of the bundle to avoid CORS issues
    const bundleUrl = `/routing-policy-editor/js/bundle.min.js`;
    const cssUrl = `/routing-policy-editor/css/main.css`;
    
    log('Loading bundle from local static files...');
    
    // Set up global error handler to catch any errors from the bundle
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, err) {
      log(`GLOBAL ERROR: ${message} at ${source}:${lineno}`);
      error = `Bundle error: ${message}`;
      if (originalOnError) originalOnError(message, source, lineno, colno, err);
      return false;
    };
    
    // Also catch unhandled promise rejections
    window.onunhandledrejection = function(event) {
      log(`UNHANDLED REJECTION: ${event.reason}`);
    };
    
    // Load CSS first
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = cssUrl;
    document.head.appendChild(cssLink);
    log('CSS link added');

    // Load JS bundle
    const script = document.createElement('script');
    script.src = bundleUrl;
    script.onload = () => {
      log('Bundle script loaded');
      loading = false;
      
      // Check if React rendered anything after a delay
      setTimeout(() => {
        const root = document.getElementById('root');
        if (root) {
          log(`#root: ${root.children.length} children, ${root.innerHTML.length} chars`);
          if (root.children.length === 0 && root.innerHTML.length === 0) {
            error = 'React app loaded but did not render. Check debug log above.';
          }
        } else {
          log('ERROR: No #root element found!');
        }
      }, 2000);
    };
    script.onerror = (e) => {
      log('ERROR: Script load failed');
      error = 'Failed to load Routing Policy Editor bundle. The static files may be missing.';
      loading = false;
    };
    document.body.appendChild(script);
    log('Bundle script element added to page');
  }
</script>

<svelte:head>
  <title>Routing Policy Editor | Natterbox AVS</title>
</svelte:head>

{#if !data.isAuthenticated}
  <div class="p-6">
    <Card>
      <div class="flex items-center gap-3 text-warning">
        <AlertCircle class="w-6 h-6" />
        <div>
          <h2 class="font-semibold">Authentication Required</h2>
          <p class="text-sm text-text-secondary">Please log in to access the Routing Policy Editor.</p>
        </div>
      </div>
    </Card>
  </div>
{:else if loading}
  <div class="flex items-center justify-center h-[80vh]">
    <div class="text-center">
      <Loader2 class="w-12 h-12 animate-spin text-text-primary mx-auto mb-4" />
      <p class="text-text-secondary">Loading Routing Policy Editor...</p>
      <p class="text-xs text-text-secondary mt-2">
        Loading from {data.config.routingPolicyEditorHost}
      </p>
      <p class="text-xs text-text-secondary mt-2">
        Debug: {debugInfo}
      </p>
      <p class="text-xs text-text-secondary mt-1">
        Load attempts: {loadAttempts}
      </p>
    </div>
  </div>
{:else if error}
  <div class="p-6">
    <Card>
      <div class="flex items-start gap-3 text-error">
        <AlertCircle class="w-6 h-6 flex-shrink-0 mt-0.5" />
        <div>
          <h2 class="font-semibold">Failed to Load Editor</h2>
          <p class="text-sm text-text-secondary mt-1">{error}</p>
          <div class="mt-4 space-y-2">
            <p class="text-sm text-text-secondary">
              The Routing Policy Editor is a React application hosted externally. 
              It may be blocked by CORS or browser security policies.
            </p>
            <a 
              href="https://routing-policy-editor.natterbox.net" 
              target="_blank" 
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm text-text-primary hover:underline"
            >
              <ExternalLink class="w-4 h-4" />
              Open editor in new tab (requires Salesforce login)
            </a>
          </div>
        </div>
      </div>
    </Card>
  </div>
{/if}

<!-- Debug info bar (hidden in production, toggle with ?debug=1 in URL) -->
{#if debugLog.length > 0 && typeof window !== 'undefined' && window.location.search.includes('debug=1')}
<div class="fixed bottom-0 left-0 right-0 bg-black/90 text-white text-xs z-50 max-h-48 overflow-y-auto">
  <div class="p-2 border-b border-white/20 font-bold sticky top-0 bg-black">
    Debug: {debugInfo} | Load attempts: {loadAttempts}
  </div>
  <div class="p-2 space-y-1 font-mono">
    {#each debugLog as msg, i}
      <div class="text-green-400">{i + 1}. {msg}</div>
    {/each}
  </div>
</div>
{/if}

<!-- React app will mount here -->
<div id="root" class={loading || error ? 'hidden' : ''}></div>

<style>
  :global(#root) {
    min-height: 80vh;
  }
</style>

