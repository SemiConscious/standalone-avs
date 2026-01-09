<script lang="ts">
  import { Card, Button, NatterboxLogo } from '$lib/components/ui';
  import { Cloud, Building2 } from 'lucide-svelte';

  let { data } = $props();

  // Get platform-specific icon and text
  const platformConfig = $derived({
    salesforce: {
      icon: Cloud,
      buttonText: 'Sign in with Salesforce',
      description: 'Sign in with your Salesforce account to access the platform.',
      redirectText: 'You will be redirected to Salesforce to authenticate.',
    },
    dynamics: {
      icon: Building2,
      buttonText: 'Sign in with Microsoft',
      description: 'Sign in with your Microsoft account to access the platform.',
      redirectText: 'You will be redirected to Microsoft to authenticate.',
    },
    demo: {
      icon: Cloud,
      buttonText: 'Enter Demo Mode',
      description: 'Explore the platform with sample data.',
      redirectText: 'No authentication required for demo mode.',
    },
  }[data.platform] || {
    icon: Cloud,
    buttonText: 'Sign In',
    description: 'Sign in to access the platform.',
    redirectText: 'You will be redirected to authenticate.',
  });
</script>

<svelte:head>
  <title>Sign In | Natterbox AVS</title>
</svelte:head>

<div class="min-h-[calc(100vh-12rem)] flex items-center justify-center">
  <Card class="w-full max-w-md">
    <div class="text-center">
      <div class="w-16 h-16 bg-bg-secondary rounded-xl flex items-center justify-center mx-auto border border-border">
        <NatterboxLogo size={40} class="text-text-primary" />
      </div>
      <h1 class="mt-6 text-2xl font-bold text-text-primary">Welcome to Natterbox AVS</h1>
      <p class="mt-2 text-text-secondary">
        {platformConfig.description}
      </p>
    </div>

    <div class="mt-8">
      <form action="/auth/login" method="POST">
        <Button type="submit" variant="primary" class="w-full">
          <platformConfig.icon class="w-5 h-5 mr-2" />
          {platformConfig.buttonText}
        </Button>
      </form>

      <p class="mt-4 text-center text-sm text-text-secondary">
        {platformConfig.redirectText}
      </p>
    </div>

    <div class="mt-8 pt-6 border-t border-border">
      <p class="text-xs text-center text-text-secondary">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  </Card>
</div>
