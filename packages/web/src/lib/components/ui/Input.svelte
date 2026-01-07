<script lang="ts">
  interface Props {
    type?: string;
    placeholder?: string;
    value?: string;
    name?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    class?: string;
  }

  let {
    type = 'text',
    placeholder = '',
    value = $bindable(''),
    name = '',
    id = '',
    required = false,
    disabled = false,
    class: className = '',
  }: Props = $props();
</script>

<input
  {type}
  {placeholder}
  bind:value
  {name}
  {id}
  {required}
  {disabled}
  class="input {className}"
/>

<style>
  .input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    background: rgb(var(--color-surface-800));
    border: 1px solid rgb(var(--color-surface-600));
    border-radius: 8px;
    color: rgb(var(--color-surface-100));
    font-size: 0.875rem;
    transition: all 0.15s ease;
  }

  .input::placeholder {
    color: rgb(var(--color-surface-500));
  }

  .input:focus {
    outline: none;
    border-color: rgb(var(--color-primary-500));
    box-shadow: 0 0 0 2px rgba(var(--color-primary-500), 0.2);
  }

  .input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
