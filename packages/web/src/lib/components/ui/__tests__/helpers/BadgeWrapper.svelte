<script lang="ts">
  import Badge from '../../Badge.svelte';

  interface Props {
    variant?: 'success' | 'warning' | 'error' | 'neutral' | 'accent';
    size?: 'sm' | 'md';
    class?: string;
    text?: string;
  }

  let { variant, size, class: className, text = 'Badge' }: Props = $props();
</script>

<Badge {variant} {size} class={className}>
  {text}
</Badge>

