<script setup lang="ts">
import { ref } from "vue";

defineProps<{ src: string; alt: string }>();
const zoomed = ref(false);
</script>

<template>
  <figure class="wiring-diagram">
    <div
      :class="{ 'wiring-zoomed': zoomed }"
      :tabindex="zoomed ? 0 : undefined"
      :role="zoomed ? 'region' : undefined"
      :aria-label="zoomed ? 'Scrollable wiring diagram' : undefined"
    >
      <img :src="src" :alt="alt">
    </div>
    <figcaption>
      <button type="button" :aria-pressed="zoomed" @click="zoomed = !zoomed">
        Zoom diagram
      </button>
      <a :href="src" target="_blank" rel="noopener">Open full-size diagram (new tab)</a>
    </figcaption>
  </figure>
</template>
