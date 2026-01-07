<script lang="ts">
  import Card from '../../Card.svelte';

  interface Props {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    class?: string;
    text?: string;
  }

  let { padding, class: className, text = 'Card content' }: Props = $props();
</script>

<Card {padding} class={className}>
  {text}
</Card>

