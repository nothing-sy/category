<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  NInput,
  NButton,
  NScrollbar,
  NEmpty,
  NModal,
  NCard,
  NSpace,
  NText,
  NIcon,
  NTooltip,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import {
  SearchOutline,
  AddOutline,
  CreateOutline,
  TrashOutline,
  FolderOutline,
  CloseOutline,
} from '@vicons/ionicons5'
import { useCategoryStore } from '../stores/category'
import type { FlatNode } from '../types'

/** 词汇 chip 颜色轮盘色相数量，与 style.css 中 .word-chip--N 对应 */
const CHIP_PALETTE_SIZE = 12

const store = useCategoryStore()
const dialog = useDialog()
const message = useMessage()

const editVisible = ref(false)
const editMode = ref<'add' | 'rename'>('add')
const editValue = ref('')
const editingId = ref<string | null>(null)
const parentForAdd = ref<string | null>(null)
const parentLabel = ref('')
const inputRef = ref<InstanceType<typeof NInput> | null>(null)

/** 将 renderRows 合并为分类区块（标题 + 词汇），便于卡片式布局 */
const displayBlocks = computed(() => {
  const blocks: { category: FlatNode; words: FlatNode[] }[] = []
  let current: { category: FlatNode; words: FlatNode[] } | null = null

  for (const row of store.renderRows) {
    if (row.kind === 'category') {
      if (current) blocks.push(current)
      current = { category: row.node, words: [] }
    } else if (row.kind === 'words' && current) {
      current.words = row.words
    }
  }
  if (current) blocks.push(current)
  return blocks
})

const dialogTitle = computed(() => {
  if (editMode.value === 'rename') return '重命名'
  return parentForAdd.value ? `在「${parentLabel.value}」下添加三级词汇` : '添加二级分类'
})

function focusInput() {
  nextTick(() => inputRef.value?.focus())
}

function openAddTop() {
  editMode.value = 'add'
  parentForAdd.value = null
  parentLabel.value = ''
  editValue.value = ''
  editVisible.value = true
  focusInput()
}

function openAddUnder(parentId: string, label: string, isRoot = false) {
  editMode.value = 'add'
  parentForAdd.value = isRoot ? null : parentId
  parentLabel.value = label
  editValue.value = ''
  editVisible.value = true
  focusInput()
}

function openRename(node: FlatNode) {
  editMode.value = 'rename'
  editingId.value = node.id
  editValue.value = node.name
  editVisible.value = true
  focusInput()
}

async function confirmEdit() {
  const val = editValue.value.trim()
  if (!val) {
    message.warning('名称不能为空')
    return
  }
  if (editMode.value === 'add') {
    const result = await store.addNode(val, parentForAdd.value)
    if (!result.ok) {
      message.warning(result.message ?? '添加失败')
      return
    }
    message.success('已添加')
  } else if (editingId.value) {
    await store.renameNode(editingId.value, val)
    message.success('已重命名')
  }
  editVisible.value = false
}

function requestDelete(node: FlatNode) {
  const count = store.countDescendants(node.id)
  dialog.warning({
    title: '删除确认',
    content:
      count > 0
        ? `「${node.name}」下还有 ${count} 个子项，删除将一并移除，确定继续吗？`
        : `确定删除「${node.name}」吗？`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await store.deleteNode(node.id)
      message.success('已删除')
    },
  })
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(text: string): string {
  const kw = store.contentKeyword.trim()
  const safe = escapeHtml(text)
  if (!kw) return safe
  const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safe.replace(new RegExp(`(${escapedKw})`, 'ig'), '<mark>$1</mark>')
}

function chipColorClass(index: number): string {
  return `word-chip--${index % CHIP_PALETTE_SIZE}`
}
</script>

<template>
  <div class="content-panel">
    <template v-if="store.activeRoot">
      <div class="content-header">
        <div class="title-area">
          <span class="current-name">{{ store.activeRoot.name }}</span>
          <n-text depth="3" class="count-text">共 {{ store.flatNodes.length }} 项</n-text>
        </div>
        <div class="header-tools">
          <n-input
            v-model:value="store.contentKeyword"
            placeholder="搜索分类 / 词汇…"
            clearable
            size="small"
            style="width: 220px"
          >
            <template #prefix>
              <n-icon :component="SearchOutline" />
            </template>
          </n-input>
          <n-button type="primary" size="small" @click="openAddTop">
            <template #icon>
              <n-icon :component="AddOutline" />
            </template>
            添加二级分类
          </n-button>
        </div>
      </div>

      <n-scrollbar class="content-list">
        <n-empty
          v-if="displayBlocks.length === 0"
          :description="store.contentKeyword ? '没有匹配的结果' : '还没有内容，点击右上角添加'"
          class="empty"
        />
        <div v-else class="blocks">
          <div v-for="block in displayBlocks" :key="block.category.id" class="cat-block">
            <div class="cat-header">
              <n-icon class="cat-folder" :component="FolderOutline" />
              <span class="cat-name" v-html="highlight(block.category.name)" />
              <n-tag size="small" :bordered="false" class="cat-count">
                {{ block.words.length }}
              </n-tag>
              <span class="cat-actions">
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <span
                      class="icon-btn"
                      @click="openAddUnder(block.category.id, block.category.name)"
                    >
                      <n-icon :component="AddOutline" />
                    </span>
                  </template>
                  添加词汇
                </n-tooltip>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <span class="icon-btn" @click="openRename(block.category)">
                      <n-icon :component="CreateOutline" />
                    </span>
                  </template>
                  重命名
                </n-tooltip>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <span class="icon-btn danger" @click="requestDelete(block.category)">
                      <n-icon :component="TrashOutline" />
                    </span>
                  </template>
                  删除
                </n-tooltip>
              </span>
            </div>

            <div v-if="block.words.length" class="words-group">
              <span
                v-for="(w, i) in block.words"
                :key="w.id"
                class="word-chip"
                :class="chipColorClass(i)"
              >
                <span class="word-text" @click="openRename(w)" v-html="highlight(w.name)" />
                <span class="word-del" @click="requestDelete(w)">
                  <n-icon :component="CloseOutline" />
                </span>
              </span>
              <span
                class="word-chip add-chip"
                @click="openAddUnder(block.category.id, block.category.name)"
              >
                <n-icon :component="AddOutline" />
                添加
              </span>
            </div>
            <div
              v-else
              class="empty-words"
              @click="openAddUnder(block.category.id, block.category.name)"
            >
              暂无词汇，点击添加
            </div>
          </div>
        </div>
      </n-scrollbar>
    </template>

    <n-empty v-else description="请在左侧新增并选择一个大类" class="no-root" />

    <n-modal v-model:show="editVisible">
      <n-card :title="dialogTitle" style="width: 380px" :bordered="false" size="small">
        <n-input
          ref="inputRef"
          v-model:value="editValue"
          placeholder="请输入名称"
          maxlength="60"
          @keyup.enter="confirmEdit"
        />
        <template #footer>
          <n-space justify="end">
            <n-button size="small" @click="editVisible = false">取消</n-button>
            <n-button size="small" type="primary" @click="confirmEdit">确定</n-button>
          </n-space>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<style scoped>
.content-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-header {
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--content-header-border);
  flex-wrap: wrap;
}

.title-area {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.current-name {
  font-size: 18px;
  font-weight: 700;
}

.count-text {
  font-size: 12px;
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.content-list {
  flex: 1;
  min-height: 0;
}

.blocks {
  padding: 12px 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cat-block {
  border: 1px solid var(--cat-block-border);
  border-left: 3px solid var(--cat-accent);
  border-radius: 8px;
  background: var(--words-area-bg);
  overflow: hidden;
}

.cat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--cat-header-bg);
  border-bottom: 1px solid var(--cat-block-border);
}

.cat-folder {
  font-size: 16px;
  color: var(--cat-accent);
  flex-shrink: 0;
}

.cat-name {
  font-size: 15px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}

.cat-count {
  background: var(--cat-count-bg) !important;
  font-size: 12px;
  flex-shrink: 0;
}

.cat-actions {
  display: inline-flex;
  gap: 2px;
  flex-shrink: 0;
  align-items: center;
}

.words-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px 12px;
  background: var(--words-area-bg);
}

.word-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, color 0.15s;
}

.word-text {
  cursor: pointer;
}

.word-del {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: var(--word-del-color);
  transition: color 0.15s;
}

.word-del:hover {
  color: #e88080;
}

.add-chip {
  cursor: pointer;
  background: var(--words-area-bg);
  border: 1px dashed var(--chip-add-border);
  color: var(--cat-accent);
  font-weight: 400;
}

.add-chip:hover {
  background: var(--chip-add-hover-bg);
  border-color: var(--cat-accent);
}

.empty-words {
  padding: 10px 12px 14px;
  font-size: 13px;
  color: var(--empty-placeholder-color);
  cursor: pointer;
  background: var(--words-area-bg);
  transition: color 0.15s;
}

.empty-words:hover {
  color: var(--cat-accent);
}

.icon-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  font-size: 15px;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: var(--icon-btn-hover);
}

.icon-btn.danger:hover {
  color: #e88080;
}

.empty {
  margin-top: 60px;
}

.no-root {
  margin-top: 120px;
}
</style>
