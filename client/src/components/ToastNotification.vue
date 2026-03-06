<script setup lang="ts">
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const toasts = ref<Toast[]>([])
let nextId = 0

function addToast(message: string, type: Toast['type'] = 'info') {
  const id = nextId++
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 4000)
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

defineExpose({ addToast })
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="'toast-' + toast.type"
          @click="removeToast(toast.id)"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast {
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  color: #fff;
  cursor: pointer;
  pointer-events: auto;
  max-width: 360px;
  word-break: break-word;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.toast-success { background: rgba(46, 204, 113, 0.9); }
.toast-error { background: rgba(231, 76, 60, 0.9); }
.toast-info { background: rgba(52, 152, 219, 0.9); }

.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(40px); }
.toast-leave-to { opacity: 0; transform: translateX(40px); }

@media (max-width: 768px) {
  .toast-container { top: auto; bottom: 80px; right: 12px; left: 12px; }
  .toast { max-width: none; }
}
</style>
