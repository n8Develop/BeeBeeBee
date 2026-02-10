<script>
  let { content } = $props();
</script>

<div class="image-message">
  <img src={content} alt="Shared image" loading="lazy" />
</div>

<style>
  .image-message {
    padding: 4px 0;
  }

  img {
    max-width: 100%;
    max-height: 400px;
    border-radius: 4px;
    display: block;
    object-fit: contain;
    background: #111;
  }
</style>
