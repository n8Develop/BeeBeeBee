<script>
  import { onMount } from 'svelte';
  import { auth } from '$lib/auth.svelte.js';
  import '../app.css';

  let { children } = $props();

  onMount(() => {
    auth.checkAuth();
  });
</script>

{#if auth.loading}
  <div class="loading">Loading...</div>
{:else}
  {@render children()}
{/if}

<style>
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-size: 1.2rem;
    color: var(--text-muted);
  }
</style>
