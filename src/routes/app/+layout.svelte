<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth.svelte.js';

  let { children } = $props();

  $effect(() => {
    if (!auth.loading && !auth.user) {
      goto('/login');
    }
  });
</script>

{#if auth.user}
  {@render children()}
{/if}
