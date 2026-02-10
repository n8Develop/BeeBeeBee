<script>
  let { username = '', avatarUrl = null, size = 48 } = $props();

  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#e84393'];

  let bgColor = $derived.by(() => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash += username.charCodeAt(i);
    }
    return colors[hash % colors.length];
  });

  let initial = $derived(username ? username[0].toUpperCase() : '?');
</script>

{#if avatarUrl}
  <img
    src={avatarUrl}
    alt={username}
    width={size}
    height={size}
    class="avatar-img"
    style="width:{size}px;height:{size}px;"
  />
{:else}
  <div
    class="avatar-fallback"
    style="width:{size}px;height:{size}px;background:{bgColor};font-size:{Math.round(size * 0.45)}px;"
  >
    {initial}
  </div>
{/if}

<style>
  .avatar-img {
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .avatar-fallback {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 600;
    flex-shrink: 0;
    user-select: none;
  }
</style>
