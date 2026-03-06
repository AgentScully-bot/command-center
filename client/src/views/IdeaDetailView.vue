<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import { marked } from 'marked'

interface IdeaFile {
  name: string
  size: number
  type: string
  path: string
}

interface Note {
  text: string
  date: string
}

interface NextStep {
  text: string
  done: boolean
}

interface IdeaData {
  id: string
  title: string
  description: string
  stage: string
  added: string
  tags: string[]
  keyFeatures: string[]
  openQuestions: string[]
  notes: Note[]
  nextSteps: NextStep[]
  extraSections: { name: string; content: string }[]
  files: IdeaFile[]
}

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)

const { data: idea, refresh } = useApi<IdeaData>(`/api/ideas/${id.value}`)
const { data: readme } = useApi<{ content: string }>(`/api/ideas/${id.value}/readme`)
const { data: summary, refresh: refreshSummary } = useApi<{
  exists: boolean
  content: string | null
  generatedAt: string | null
}>(`/api/ideas/${id.value}/summary`)

const newNote = ref('')
const promoting = ref(false)
const graduating = ref(false)
const readmeExpanded = ref(false)
const generatingSummary = ref(false)

// File viewer state
const viewingFile = ref<{ name: string; type: string; url: string } | null>(null)
const fileContent = ref('')
const fileLoading = ref(false)

const renderedReadme = computed(() => {
  if (!readme.value?.content) return ''
  return marked.parse(readme.value.content) as string
})

const readmeIsTall = computed(() => {
  if (!readme.value?.content) return false
  return readme.value.content.split('\n').length > 30
})

const renderedFileContent = computed(() => {
  if (!viewingFile.value) return ''
  if (viewingFile.value.type === 'markdown') {
    return marked.parse(fileContent.value) as string
  }
  return ''
})

async function openFile(file: { name: string; type: string }) {
  const url = `/api/ideas/${id.value}/files/${encodeURIComponent(file.name)}`
  viewingFile.value = { name: file.name, type: file.type, url }

  if (['markdown', 'code', 'data'].includes(file.type)) {
    fileLoading.value = true
    try {
      const res = await fetch(url)
      fileContent.value = await res.text()
    } catch {
      fileContent.value = 'Failed to load file'
    }
    fileLoading.value = false
  }
}

function closeFileViewer() {
  viewingFile.value = null
  fileContent.value = ''
}

async function generateSummary() {
  generatingSummary.value = true
  try {
    const res = await fetch(`/api/ideas/${id.value}/summary`, { method: 'POST' })
    if (res.ok) {
      refreshSummary()
    }
  } finally {
    generatingSummary.value = false
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d ago`
  const hours = Math.floor(diff / 3600000)
  if (hours > 0) return `${hours}h ago`
  return 'just now'
}

const stages = ['seed', 'brewing', 'ready'] as const

function stageIndex(stage: string): number {
  return stages.indexOf(stage as typeof stages[number])
}

function stageClass(stage: string): string {
  if (stage === 'brewing') return 'stage-brewing'
  if (stage === 'ready') return 'stage-ready'
  return 'stage-seed'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fileIcon(type: string): string {
  switch (type) {
    case 'markdown': return '📄'
    case 'mockup': return '🌐'
    case 'image': return '🖼️'
    case 'code': return '💻'
    case 'data': return '📊'
    case 'document': return '📑'
    default: return '📎'
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

async function promote(stage: string) {
  promoting.value = true
  try {
    await fetch(`/api/ideas/${id.value}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    refresh()
  } finally {
    promoting.value = false
  }
}

async function graduate() {
  if (!confirm('Graduate this idea to a project? This will create a new project directory from the template.')) return
  graduating.value = true
  try {
    const res = await fetch(`/api/ideas/${id.value}/graduate`, { method: 'POST' })
    const data = await res.json()
    if (data.project) {
      router.push(`/project/${data.project}`)
    }
  } finally {
    graduating.value = false
  }
}

async function addNote() {
  if (!newNote.value.trim()) return
  await fetch(`/api/ideas/${id.value}/note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: newNote.value.trim() }),
  })
  newNote.value = ''
  refresh()
}

function nextStage(): string | null {
  if (!idea.value) return null
  const idx = stageIndex(idea.value.stage)
  if (idx >= 0 && idx < stages.length - 1) return stages[idx + 1] as string
  return null
}
</script>

<template>
  <div v-if="idea">
    <header class="detail-topbar">
      <div class="topbar-left">
        <a class="back-link" @click="router.push('/')">&larr; Ideas</a>
        <h2>{{ idea.title }}</h2>
        <span class="stage-badge" :class="stageClass(idea.stage)">{{ idea.stage }}</span>
      </div>
      <div class="topbar-actions">
        <button
          v-if="nextStage()"
          class="btn promote"
          :disabled="promoting"
          @click="promote(nextStage()!)"
        >
          Promote to {{ nextStage() }}
        </button>
        <button class="btn success" :disabled="graduating" @click="graduate">
          Graduate to Project
        </button>
      </div>
    </header>

    <div class="content">
      <!-- Idea Header Panel -->
      <div class="idea-header">
        <div class="idea-desc">{{ idea.description }}</div>

        <div class="idea-meta-grid">
          <div class="meta-item" v-if="idea.added">
            <div class="meta-label">Added</div>
            <div class="meta-value">{{ formatDate(idea.added) }}</div>
          </div>
          <div class="meta-item" v-if="idea.tags.length">
            <div class="meta-label">Tags</div>
            <div class="tags-row">
              <span v-for="tag in idea.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
          <div class="meta-item" v-for="section in idea.extraSections.filter(s => !s.content.includes('\\n') && s.content.length < 100)" :key="section.name">
            <div class="meta-label">{{ section.name }}</div>
            <div class="meta-value">{{ section.content.replace(/^-\s+/, '') }}</div>
          </div>
        </div>

        <!-- Stage Progress Track -->
        <div class="stage-track">
          <template v-for="(s, i) in stages" :key="s">
            <div class="stage-step">
              <div
                class="stage-dot"
                :class="{
                  done: stageIndex(idea.stage) > i,
                  active: stageIndex(idea.stage) === i,
                  future: stageIndex(idea.stage) < i,
                }"
              >
                <template v-if="stageIndex(idea.stage) > i">&#10003;</template>
                <template v-else>{{ i + 1 }}</template>
              </div>
              <span
                class="stage-name"
                :class="{
                  done: stageIndex(idea.stage) > i,
                  active: stageIndex(idea.stage) === i,
                }"
              >{{ s }}</span>
            </div>
            <div v-if="i < stages.length - 1" class="stage-line" :class="{ done: stageIndex(idea.stage) > i }"></div>
          </template>
        </div>
      </div>

      <!-- Summary Panel -->
      <div class="panel summary-panel">
        <div class="panel-header">
          <div>
            <span class="panel-title">Summary</span>
            <span v-if="summary?.generatedAt" class="panel-count">{{ timeAgo(summary.generatedAt) }}</span>
          </div>
          <button
            class="btn"
            @click="generateSummary"
            :disabled="generatingSummary"
          >
            {{ generatingSummary ? 'Generating...' : (summary?.exists ? 'Regenerate' : 'Generate Summary') }}
          </button>
        </div>
        <div class="panel-body">
          <div v-if="generatingSummary" class="summary-loading">
            <span class="spinner"></span> Generating summary... this may take a minute
          </div>
          <div v-else-if="summary?.exists && summary.content" class="summary-content">
            {{ summary.content }}
          </div>
          <div v-else class="empty-state">
            No summary yet — click Generate to create one
          </div>
        </div>
      </div>

      <!-- README Preview Panel -->
      <div class="panel readme-panel" v-if="readme?.content">
        <div class="panel-header">
          <div><span class="panel-title">README.md</span></div>
          <button v-if="readmeIsTall" class="btn" @click="readmeExpanded = !readmeExpanded">
            {{ readmeExpanded ? 'Collapse' : 'Expand' }}
          </button>
        </div>
        <div class="readme-content" :class="{ collapsed: readmeIsTall && !readmeExpanded }">
          <div class="markdown-body" v-html="renderedReadme"></div>
        </div>
        <div v-if="readmeIsTall && !readmeExpanded" class="readme-fade" @click="readmeExpanded = true">
          Click to expand...
        </div>
      </div>

      <!-- Two-column grid: Open Questions + Key Features -->
      <div class="idea-grid">
        <div class="panel">
          <div class="panel-header">
            <div>
              <span class="panel-title">Open Questions</span>
              <span class="panel-count">{{ idea.openQuestions.length }}</span>
            </div>
          </div>
          <div v-if="idea.openQuestions.length === 0" class="empty-state">No open questions</div>
          <div v-for="(q, i) in idea.openQuestions" :key="i" class="question-item">
            <span class="question-bullet">?</span>
            <span class="question-text">{{ q }}</span>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <span class="panel-title">Key Features</span>
              <span class="panel-count">{{ idea.keyFeatures.length }}</span>
            </div>
          </div>
          <div v-if="idea.keyFeatures.length === 0" class="empty-state">No features listed</div>
          <ul v-else class="feature-list">
            <li v-for="(f, i) in idea.keyFeatures" :key="i">{{ f }}</li>
          </ul>
        </div>
      </div>

      <!-- 3:1 grid: Files + Notes -->
      <div class="idea-grid-3-1">
        <div class="panel">
          <div class="panel-header">
            <div>
              <span class="panel-title">Files</span>
              <span class="panel-count">{{ idea.files.length }}</span>
            </div>
          </div>
          <div v-if="idea.files.length === 0" class="empty-state">No files</div>
          <div v-for="f in idea.files" :key="f.name" class="file-item clickable" @click="openFile(f)">
            <span class="file-icon">{{ fileIcon(f.type) }}</span>
            <div class="file-info">
              <div class="file-name">{{ f.name }}</div>
              <div class="file-meta">{{ f.type }} &middot; {{ formatSize(f.size) }}</div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <span class="panel-title">Notes</span>
              <span class="panel-count">{{ idea.notes.length }}</span>
            </div>
          </div>
          <div v-if="idea.notes.length === 0" class="empty-state">No notes yet</div>
          <div v-for="(n, i) in idea.notes" :key="i" class="note-item">
            <div class="note-text">{{ n.text }}</div>
            <div class="note-date" v-if="n.date">{{ formatDate(n.date) }}</div>
          </div>
          <div class="add-row">
            <input
              v-model="newNote"
              class="add-input"
              placeholder="Add a note..."
              @keyup.enter="addNote"
            />
            <button class="btn" @click="addNote">Add</button>
          </div>
        </div>
      </div>

      <!-- Next Steps -->
      <div v-if="idea.nextSteps.length > 0" class="panel" style="margin-bottom: 16px;">
        <div class="panel-header">
          <div>
            <span class="panel-title">Next Steps</span>
            <span class="panel-count">{{ idea.nextSteps.filter(s => s.done).length }}/{{ idea.nextSteps.length }}</span>
          </div>
        </div>
        <div v-for="(step, i) in idea.nextSteps" :key="i" class="check-item">
          <div class="check-box" :class="{ checked: step.done }"></div>
          <span class="check-text" :class="{ done: step.done }">{{ step.text }}</span>
        </div>
      </div>
    </div>
  </div>
  <!-- File Viewer Modal -->
  <div v-if="viewingFile" class="file-viewer-overlay" @click.self="closeFileViewer">
    <div class="file-viewer">
      <div class="file-viewer-header">
        <span class="file-viewer-name">{{ viewingFile.name }}</span>
        <button class="btn" @click="closeFileViewer">Close</button>
      </div>
      <div class="file-viewer-body">
        <div v-if="fileLoading" class="empty-state">Loading...</div>
        <div v-else-if="viewingFile.type === 'markdown'" class="markdown-body" v-html="renderedFileContent"></div>
        <img v-else-if="viewingFile.type === 'image'" :src="viewingFile.url" class="file-viewer-image" />
        <iframe v-else-if="viewingFile.type === 'mockup'" :src="viewingFile.url" class="file-viewer-iframe"></iframe>
        <embed v-else-if="viewingFile.type === 'document'" :src="viewingFile.url" type="application/pdf" class="file-viewer-pdf" />
        <pre v-else-if="['code', 'data'].includes(viewingFile.type)" class="file-viewer-code">{{ fileContent }}</pre>
        <div v-else class="empty-state">
          <a :href="viewingFile.url" target="_blank">Download {{ viewingFile.name }}</a>
        </div>
      </div>
    </div>
  </div>

  <div v-if="!idea" class="content">
    <div class="empty-state">Loading idea...</div>
  </div>
</template>

<style scoped>
.detail-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; border-bottom: 1px solid var(--border); background: var(--bg-secondary);
  position: sticky; top: 0; z-index: 5;
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.back-link { font-size: 12px; color: var(--text-muted); cursor: pointer; text-decoration: none; }
.back-link:hover { color: var(--accent); }
.topbar-left h2 { font-size: 16px; font-weight: 600; }
.topbar-actions { display: flex; gap: 6px; }

.stage-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 4px; }
.stage-seed { background: rgba(100,100,120,0.15); color: var(--text-muted); }
.stage-brewing { background: var(--purple-dim); color: var(--purple); }
.stage-ready { background: var(--green-dim); color: var(--green); }

.btn { padding: 5px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); font-size: 11px; cursor: pointer; font-family: inherit; transition: all 0.12s; display: inline-flex; align-items: center; gap: 5px; }
.btn:hover { border-color: var(--accent); color: var(--accent); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.success { border-color: var(--green); color: var(--green); }
.btn.success:hover { background: var(--green-dim); }
.btn.promote { border-color: var(--purple); color: var(--purple); }
.btn.promote:hover { background: var(--purple-dim); }

.content { padding: 20px 24px; }

.idea-header {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 20px 24px; margin-bottom: 16px;
}
.idea-desc { font-size: 13px; color: var(--text-secondary); max-width: 700px; line-height: 1.5; word-break: break-word; }
.idea-meta-grid { display: flex; gap: 28px; margin-top: 14px; flex-wrap: wrap; }
.meta-item {}
.meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 2px; }
.meta-value { font-size: 13px; font-weight: 500; }
.tags-row { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: var(--accent-dim); color: var(--accent); }

/* Stage progress track */
.stage-track { display: flex; align-items: center; gap: 0; margin-top: 16px; }
.stage-step { display: flex; align-items: center; gap: 8px; }
.stage-dot {
  width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;
}
.stage-dot.active { border-color: var(--purple); background: var(--purple-dim); color: var(--purple); }
.stage-dot.done { border-color: var(--green); background: var(--green); color: #111; }
.stage-dot.future { border-color: var(--border); color: var(--text-muted); }
.stage-name { font-size: 11px; color: var(--text-muted); margin-right: 4px; text-transform: capitalize; }
.stage-name.active { color: var(--purple); font-weight: 500; }
.stage-name.done { color: var(--green); }
.stage-line { width: 40px; height: 2px; background: var(--border); margin: 0 4px; }
.stage-line.done { background: var(--green); }

/* Grids */
.idea-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.idea-grid-3-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px; }

/* Question items */
.question-item { display: flex; align-items: flex-start; padding: 8px 16px; border-bottom: 1px solid var(--border); gap: 10px; }
.question-item:last-child { border-bottom: none; }
.question-bullet { color: var(--yellow); font-size: 14px; flex-shrink: 0; font-weight: 700; }
.question-text { font-size: 12px; color: var(--text-secondary); }

/* Feature list */
.feature-list { padding: 12px 16px; list-style: disc; padding-left: 32px; margin: 0; }
.feature-list li { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.feature-list li::marker { color: var(--accent); }

/* Files */
.file-item {
  display: flex; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--border);
  gap: 10px; transition: background 0.1s;
}
.file-item:last-child { border-bottom: none; }
.file-item:hover { background: var(--bg-hover); }
.file-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; }
.file-name { font-size: 12px; font-weight: 500; }
.file-meta { font-size: 10px; color: var(--text-muted); }

/* Notes */
.note-item { padding: 10px 16px; border-bottom: 1px solid var(--border); }
.note-item:last-child { border-bottom: none; }
.note-text { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
.note-date { font-size: 10px; color: var(--text-muted); margin-top: 4px; }

/* Add input */
.add-row { display: flex; gap: 8px; padding: 8px 16px; border-top: 1px solid var(--border); background: var(--bg-tertiary); }
.add-input {
  flex: 1; padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--bg-primary); color: var(--text-primary); font-size: 12px; font-family: inherit; outline: none;
}
.add-input:focus { border-color: var(--accent); }
.add-input::placeholder { color: var(--text-muted); }

/* Checklist */
.check-item { display: flex; align-items: flex-start; padding: 8px 16px; border-bottom: 1px solid var(--border); gap: 10px; }
.check-item:last-child { border-bottom: none; }
.check-box {
  width: 15px; height: 15px; border-radius: 3px; border: 2px solid #444;
  flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center;
}
.check-box.checked { background: var(--green); border-color: var(--green); }
.check-box.checked::after { content: '\2713'; color: #111; font-size: 9px; font-weight: 700; }
.check-text { font-size: 12px; flex: 1; }
.check-text.done { text-decoration: line-through; color: var(--text-muted); }

/* File item clickable */
.file-item.clickable { cursor: pointer; }
.file-item.clickable .file-name { color: var(--accent); }

/* README preview */
.readme-content { padding: 16px 20px; }
.readme-content.collapsed { max-height: 300px; overflow: hidden; position: relative; }
.readme-fade {
  padding: 8px 16px; text-align: center; font-size: 11px; color: var(--accent);
  cursor: pointer; background: linear-gradient(transparent, var(--bg-secondary));
  margin-top: -40px; position: relative; z-index: 1;
}
.readme-fade:hover { text-decoration: underline; }

/* Markdown body */
.markdown-body { font-size: 13px; line-height: 1.6; color: var(--text-secondary); }
.markdown-body h1 { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 16px 0 8px; }
.markdown-body h2 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 14px 0 6px; }
.markdown-body h3 { font-size: 13px; font-weight: 600; color: var(--text-primary); margin: 12px 0 4px; }
.markdown-body p { margin: 8px 0; }
.markdown-body ul, .markdown-body ol { padding-left: 24px; margin: 8px 0; }
.markdown-body li { margin: 4px 0; }
.markdown-body code { background: var(--bg-tertiary); padding: 2px 5px; border-radius: 3px; font-size: 12px; }
.markdown-body pre { background: var(--bg-tertiary); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
.markdown-body pre code { background: none; padding: 0; }
.markdown-body strong { color: var(--text-primary); }
.markdown-body a { color: var(--accent); text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }

/* Summary panel */
.summary-content { padding: 16px; font-size: 13px; line-height: 1.6; color: var(--text-secondary); white-space: pre-wrap; }
.summary-loading { padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 12px; }
.spinner {
  display: inline-block; width: 14px; height: 14px; border: 2px solid var(--border);
  border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;
  vertical-align: middle; margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* File viewer modal */
.file-viewer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.file-viewer {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius);
  width: 90vw; max-width: 900px; max-height: 85vh; display: flex; flex-direction: column;
}
.file-viewer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
}
.file-viewer-name { font-size: 13px; font-weight: 600; }
.file-viewer-body { flex: 1; overflow: auto; padding: 16px; }
.file-viewer-image { max-width: 100%; height: auto; }
.file-viewer-iframe { width: 100%; height: 70vh; border: none; }
.file-viewer-pdf { width: 100%; height: 70vh; }
.file-viewer-code { font-size: 12px; font-family: 'SF Mono', monospace; white-space: pre-wrap; word-break: break-word; color: var(--text-secondary); }

.empty-state { padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px; }

/* Mobile */
@media (max-width: 768px) {
  .detail-topbar { padding: 12px 16px; flex-wrap: wrap; gap: 8px; }
  .topbar-left { flex-wrap: wrap; gap: 6px; }
  .topbar-left h2 { font-size: 18px; font-weight: 700; }
  .topbar-actions { width: 100%; overflow-x: auto; gap: 6px; }
  .topbar-actions .btn { flex-shrink: 0; min-height: 36px; }
  .content { padding: 12px 16px; }
  .idea-header { padding: 14px 16px; }
  .idea-grid { grid-template-columns: 1fr; }
  .idea-grid-3-1 { grid-template-columns: 1fr; }
  .idea-meta-grid { gap: 16px; }
  .file-viewer-overlay { padding: 0; }
  .file-viewer { width: 100vw; max-width: 100vw; max-height: 100vh; border-radius: 0; }
}
</style>
