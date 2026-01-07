<script lang="ts">
  import Button from '../../Button.svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    onclick?: (event: MouseEvent) => void;
    text?: string;
  }

  let { variant, size, disabled, type, class: className, onclick, text = 'Button' }: Props = $props();
</script>

<Button {variant} {size} {disabled} {type} class={className} {onclick}>
  {text}
</Button>

