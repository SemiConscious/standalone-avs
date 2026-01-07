<script lang="ts">
  import { getInitials } from '$lib/utils';

  interface Props {
    src?: string;
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    class?: string;
  }

  let { src, name, size = 'md', class: className = '' }: Props = $props();

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const initials = getInitials(name);
</script>

{#if src}
  <img
    {src}
    alt={name}
    class="rounded-full object-cover {sizeClasses[size]} {className}"
  />
{:else}
  <div
    class="rounded-full bg-accent/10 text-accent font-medium flex items-center justify-center {sizeClasses[size]} {className}"
  >
    {initials}
  </div>
{/if}

