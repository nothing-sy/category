<script setup lang="ts">
import { ref } from 'vue'
import {
  NButton,
  NModal,
  NCard,
  NSpace,
  NInput,
  NText,
  NAlert,
  NDivider,
  useDialog,
  useMessage,
} from 'naive-ui'
import { useCategoryStore } from '../stores/category'
import type { BackupData } from '../types'
import {
  loadGistConfig,
  saveGistConfig,
  pushToGist,
  pullFromGist,
  type GistConfig,
} from '../utils/gist'

const store = useCategoryStore()
const dialog = useDialog()
const message = useMessage()

const fileInput = ref<HTMLInputElement | null>(null)

// ---------- 导出 ----------
async function onExport() {
  const data = await store.exportAll()
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  a.href = url
  a.download = `category-vocab-${ts}.json`
  a.click()
  URL.revokeObjectURL(url)
  message.success('已导出备份文件')
}

// ---------- 导入 ----------
function triggerImport() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result)) as BackupData
      if (!data || !Array.isArray(data.nodes)) {
        message.error('文件格式不正确')
        return
      }
      askImportMode(data)
    } catch {
      message.error('无法解析该文件')
    } finally {
      input.value = ''
    }
  }
  reader.readAsText(file)
}

function askImportMode(data: BackupData) {
  dialog.info({
    title: `导入备份（${data.nodes.length} 个节点）`,
    content: '选择导入方式：合并会把备份作为新的大类追加；覆盖会清空当前全部数据后导入。',
    positiveText: '合并追加',
    negativeText: '覆盖全部',
    onPositiveClick: async () => {
      await store.importData(data, 'merge')
      message.success('已合并导入')
    },
    onNegativeClick: () => confirmOverwrite(data),
  })
}

function confirmOverwrite(data: BackupData) {
  dialog.error({
    title: '确认覆盖',
    content: '这会删除当前浏览器内的全部现有数据，且不可恢复，确定吗？',
    positiveText: '确认覆盖',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.importData(data, 'overwrite')
      message.success('已覆盖导入')
    },
  })
}

// ---------- Gist 同步 ----------
const gistVisible = ref(false)
const gistConfig = ref<GistConfig>(loadGistConfig())
const busy = ref(false)

function openGist() {
  gistConfig.value = loadGistConfig()
  gistVisible.value = true
}

function persistConfig() {
  saveGistConfig(gistConfig.value)
}

async function onPush() {
  if (!gistConfig.value.token.trim()) {
    message.warning('请先填写 Token')
    return
  }
  busy.value = true
  try {
    const data = await store.exportAll()
    const newId = await pushToGist(gistConfig.value, data)
    gistConfig.value.gistId = newId
    persistConfig()
    message.success('已上传到 Gist')
  } catch (err) {
    message.error((err as Error).message)
  } finally {
    busy.value = false
  }
}

function onPull() {
  if (!gistConfig.value.token.trim() || !gistConfig.value.gistId.trim()) {
    message.warning('请先填写 Token 和 Gist ID')
    return
  }
  dialog.warning({
    title: '从 Gist 恢复',
    content: '这会清空当前浏览器数据并用 Gist 中的备份覆盖，确定吗？',
    positiveText: '确认恢复',
    negativeText: '取消',
    onPositiveClick: async () => {
      busy.value = true
      try {
        const data = await pullFromGist(gistConfig.value)
        await store.importData(data, 'overwrite')
        persistConfig()
        message.success('已从 Gist 恢复')
        gistVisible.value = false
      } catch (err) {
        message.error((err as Error).message)
      } finally {
        busy.value = false
      }
    },
  })
}
</script>

<template>
  <n-space :size="8">
    <n-button size="small" tertiary @click="onExport">导出</n-button>
    <n-button size="small" tertiary @click="triggerImport">导入</n-button>
    <n-button size="small" tertiary @click="openGist">☁️ 同步</n-button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      style="display: none"
      @change="onFileChange"
    />
  </n-space>

  <n-modal v-model:show="gistVisible">
    <n-card title="GitHub Gist 同步" style="width: 480px" :bordered="false" size="small">
      <n-alert type="info" :bordered="false" style="margin-bottom: 12px">
        使用你自己的 GitHub Token（需勾选 <b>gist</b> 权限）。Token 仅保存在本机浏览器，
        不会上传到任何服务器。建议使用私密 Gist。
      </n-alert>

      <n-space vertical :size="10">
        <div>
          <n-text depth="3">Personal Access Token</n-text>
          <n-input
            v-model:value="gistConfig.token"
            type="password"
            show-password-on="click"
            placeholder="ghp_... 或 github_pat_..."
            @blur="persistConfig"
          />
        </div>
        <div>
          <n-text depth="3">Gist ID（留空则首次上传时自动创建）</n-text>
          <n-input
            v-model:value="gistConfig.gistId"
            placeholder="例如 a1b2c3d4..."
            @blur="persistConfig"
          />
        </div>
      </n-space>

      <n-divider style="margin: 14px 0" />

      <n-space justify="end">
        <n-button size="small" :loading="busy" @click="onPull">从 Gist 恢复</n-button>
        <n-button size="small" type="primary" :loading="busy" @click="onPush">
          上传到 Gist
        </n-button>
      </n-space>

      <template #footer>
        <n-text depth="3" style="font-size: 12px">
          获取 Token：GitHub → Settings → Developer settings → Personal access tokens →
          勾选 gist 权限。
        </n-text>
      </template>
    </n-card>
  </n-modal>
</template>
