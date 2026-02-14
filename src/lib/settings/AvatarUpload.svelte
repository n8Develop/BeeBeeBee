<script>
  import { auth } from '$lib/auth.svelte.js';
  import Avatar from '$lib/social/Avatar.svelte';

  let loading = $state(false);
  let message = $state(null);
  let isError = $state(false);
  let previewUrl = $state(null);
  let fileInput;

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      message = 'File must be under 2MB.';
      isError = true;
      return;
    }

    previewUrl = URL.createObjectURL(file);
    upload(file);
  }

  async function upload(file) {
    loading = true;
    message = null;

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/settings/avatar', {
        method: 'PUT',
        credentials: 'include',
        body: formData
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed');
      }

      if (auth.user) {
        auth.user.avatarUrl = data.avatarUrl;
      }
      message = 'Avatar updated!';
      isError = false;
    } catch (err) {
      message = err.message;
      isError = true;
      previewUrl = null;
    } finally {
      loading = false;
    }
  }
</script>

<div class="avatar-upload">
  <div class="avatar-preview">
    {#if previewUrl}
      <img src={previewUrl} alt="Preview" class="preview-img" width="128" height="128" />
    {:else}
      <Avatar username={auth.user?.username || ''} avatarUrl={auth.user?.avatarUrl} size={128} />
    {/if}
  </div>

  {#if auth.user?.emailVerified === false}
    <p class="verify-notice">Verify your email to upload an avatar.</p>
  {:else}
    <input
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp"
      onchange={handleFileSelect}
      bind:this={fileInput}
      hidden
    />
    <button class="upload-btn" onclick={() => fileInput.click()} disabled={loading}>
      {loading ? 'Uploading...' : 'Change Avatar'}
    </button>
  {/if}

  {#if message}
    <p class="message" class:error={isError}>{message}</p>
  {/if}
</div>

<style>
  .avatar-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .preview-img {
    width: 128px;
    height: 128px;
    border-radius: 50%;
    object-fit: cover;
  }

  .verify-notice {
    font-size: 13px;
    color: #f39c12;
  }

  .upload-btn {
    padding: 8px 20px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--accent-btn);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
  }

  .upload-btn:hover:not(:disabled), .upload-btn:active:not(:disabled) {
    background: #3a7aba;
  }

  .upload-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .message {
    font-size: 13px;
    color: #4ade80;
  }

  .message.error {
    color: #e55;
  }
</style>
