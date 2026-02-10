<script>
  let { content } = $props();
</script>

<div class="text-message">
  <p>{content}</p>
</div>

<style>
  .text-message {
    padding: 4px 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  p {
    margin: 0;
    white-space: pre-wrap;
    line-height: 1.4;
    font-size: 14px;
    color: #eee;
  }
</style>
