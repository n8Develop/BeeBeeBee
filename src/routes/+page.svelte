<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/auth.js';

  onMount(() => {
    const unwatch = $effect.root(() => {
      $effect(() => {
        if (!auth.loading) {
          goto(auth.user ? '/app' : '/login');
        }
      });
      return () => {};
    });
    return unwatch;
  });
</script>
