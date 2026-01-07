<script lang="ts">
  import { toasts } from '$lib/stores/toast';
  import Toast from './Toast.svelte';
</script>

<div
  class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md"
  aria-live="polite"
  aria-label="Notifications"
>
  {#each $toasts as toast (toast.id)}
    <div
      class="animate-in slide-in-from-right fade-in duration-200"
    >
      <Toast
        type={toast.type}
        message={toast.message}
        description={toast.description}
        onClose={() => toasts.remove(toast.id)}
        duration={0}
      />
    </div>
  {/each}
</div>

