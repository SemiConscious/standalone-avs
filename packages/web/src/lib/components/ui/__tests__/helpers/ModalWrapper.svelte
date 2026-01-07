<script lang="ts">
  import Modal from '../../Modal.svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    onClose: () => void;
    content: string;
    footerContent?: string;
  }

  let { open, title, size, onClose, content, footerContent }: Props = $props();
</script>

{#if footerContent}
  <Modal {open} {title} {size} {onClose}>
    {content}
    {#snippet footer()}
      {footerContent}
    {/snippet}
  </Modal>
{:else}
  <Modal {open} {title} {size} {onClose}>
    {content}
  </Modal>
{/if}

