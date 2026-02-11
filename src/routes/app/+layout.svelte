<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth.svelte.js';
  import { settings } from '$lib/settings.svelte.js';

  let { children } = $props();

  onMount(() => {
    if (auth.user) {
      settings.load().catch(() => {});
    }
  });

  $effect(() => {
    if (!auth.loading && !auth.user) {
      goto('/login');
    }
  });
</script>

{#if auth.user}
  {@render children()}
{/if}
