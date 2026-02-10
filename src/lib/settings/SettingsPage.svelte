<script>
  import { goto } from '$app/navigation';
  import AvatarUpload from './AvatarUpload.svelte';
  import PasswordChange from './PasswordChange.svelte';
  import EmailSettings from './EmailSettings.svelte';
  import SoundSettings from './SoundSettings.svelte';

  function handleBack() {
    goto('/app');
  }
</script>

<div class="settings-page">
  <header class="settings-header">
    <button class="back-btn" onclick={handleBack}>&larr; Back</button>
    <h1>Settings</h1>
  </header>

  <div class="sections">
    <section class="section">
      <h2>Avatar</h2>
      <AvatarUpload />
    </section>

    <section class="section">
      <h2>Account</h2>
      <PasswordChange />
      <EmailSettings />
    </section>

    <section class="section">
      <h2>Sound</h2>
      <SoundSettings />
    </section>
  </div>
</div>

<style>
  .settings-page {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .settings-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .back-btn {
    padding: 6px 12px;
    border: 1px solid #334;
    border-radius: 4px;
    background: transparent;
    color: #7eb8da;
    font-size: 14px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .back-btn:hover {
    background: #2a2a4e;
  }

  h1 {
    font-size: 20px;
    font-weight: 700;
    color: #eee;
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .section {
    background: #16213e;
    border: 1px solid #2a2a4e;
    border-radius: 12px;
    padding: 20px;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
    color: #eee;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #2a2a4e;
  }
</style>
