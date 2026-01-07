<script lang="ts">
  interface Props {
    class?: string;
    size?: number;
  }

  let { class: className = '', size = 24 }: Props = $props();
</script>

<!-- Natterbox "N" mark logo - extracted from official brand assets -->
<!-- Original logo has Y-axis flipped, so we apply transform to correct orientation -->
<svg
  viewBox="0 0 227 237"
  width={size}
  height={size}
  class={className}
  xmlns="http://www.w3.org/2000/svg"
>
  <g transform="translate(0, 237) scale(1, -1)">
    <!-- Green chevron (left side) -->
    <path
      d="M39 177 L109 149 L109 0 L0 58 L0 193 L109 237 L109 205 L39 177"
      fill="#adda1f"
    />
    <!-- Gray/dark chevron (right side) -->
    <path
      d="M227 193 L227 58 L118 0 L118 149 L188 177 L118 205 L118 237 L227 193"
      fill="#4e5c68"
    />
  </g>
</svg>

