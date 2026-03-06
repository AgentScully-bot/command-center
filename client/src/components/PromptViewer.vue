<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ name: string; projectId: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const content = ref('')
const loading = ref(true)
const error = ref('')

watch(() => props.name, async (name) => {
  if (!name) return
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`/api/projects/${props.projectId}/prompts/${encodeURIComponent(name)}`)
    if (!res.ok) throw new Error('Failed to load prompt')
    const data = await res.json()
    content.value = data.content
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}, { immediate: true })

function onOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('prompt-overlay')) {
    emit('close')
  }
}
</script>

<template>
  <div class="prompt-overlay" @click="onOverlayClick">
    <div class="prompt-modal">
      <div class="prompt-modal-header">
        <div class="prompt-modal-title">{{ name }}.md</div>
        <button class="prompt-close" @click="emit('close')">&times;</button>
      </div>
      <div class="prompt-modal-body">
        <div v-if="loading" class="prompt-loading">Loading...</div>
        <div v-else-if="error" class="prompt-error">{{ error }}</div>
        <pre v-else class="prompt-content">{{ content }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.prompt-modal {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius);
  width: 90%; max-width: 720px; max-height: 80vh; display: flex; flex-direction: column;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.prompt-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.prompt-modal-title { font-size: 13px; font-weight: 600; font-family: 'SF Mono', Consolas, monospace; }
.prompt-close {
  background: none; border: none; color: var(--text-muted); font-size: 20px;
  cursor: pointer; padding: 0 4px; line-height: 1;
}
.prompt-close:hover { color: var(--text-primary); }
.prompt-modal-body { padding: 16px; overflow-y: auto; flex: 1; }
.prompt-content {
  font-size: 12px; line-height: 1.6; color: var(--text-secondary);
  white-space: pre-wrap; word-wrap: break-word; margin: 0;
  font-family: 'SF Mono', Consolas, monospace;
}
.prompt-loading { color: var(--text-muted); font-size: 12px; text-align: center; padding: 24px; }
.prompt-error { color: var(--red); font-size: 12px; text-align: center; padding: 24px; }
</style>
