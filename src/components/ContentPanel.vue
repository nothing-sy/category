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
  useDialog,
  useMessage,
} from 'naive-ui'
import { useCategoryStore } from '../stores/category'
import type { FlatNode } from '../types'

const store = useCategoryStore()
const dialog = useDialog()
const message = useMessage()

// 新增 / 重命名 共用弹窗
const editVisible = ref(false)
const editMode = ref<'add' | 'rename'>('add')
const editValue = ref('')
const editingId = ref<string | null>(null) // rename 时为目标 id
const parentForAdd = ref<string | null>(null) // add 时父节点 id（null = 直接挂大类）
const parentLabel = ref('')
const inputRef = ref<InstanceType<typeof NInput> | null>(null)

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

/** 在指定父级下添加（分类标题的“添加子项”，或词汇组末尾的“+”） */
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

// ---------- 搜索高亮 ----------
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
            <template #prefix>🔍</template>
          </n-input>
          <n-button type="primary" size="small" @click="openAddTop">
            + 添加二级分类
          </n-button>
        </div>
      </div>

      <n-scrollbar class="content-list">
        <n-empty
          v-if="store.renderRows.length === 0"
          :description="store.contentKeyword ? '没有匹配的结果' : '还没有内容，点击右上角添加'"
          class="empty"
        />
        <div v-else class="rows">
          <template v-for="row in store.renderRows" :key="row.key">
            <!-- 分类标题行 -->
            <div
              v-if="row.kind === 'category'"
              class="cat-header"
              :style="{ paddingLeft: 4 + row.depth * 20 + 'px' }"
            >
              <span class="cat-name" v-html="highlight(row.node.name)" />
              <span class="cat-actions">
                <span
                  class="icon-btn"
                  title="添加子项"
                  @click="openAddUnder(row.node.id, row.node.name)"
                  >➕</span
                >
                <span class="icon-btn" title="重命名" @click="openRename(row.node)"
                  >✏️</span
                >
                <span class="icon-btn" title="删除" @click="requestDelete(row.node)"
                  >🗑️</span
                >
              </span>
            </div>

            <!-- 词汇组：平铺在同一区域 -->
            <div
              v-else
              class="words-group"
              :style="{ paddingLeft: 4 + row.depth * 20 + 'px' }"
            >
              <span v-for="w in row.words" :key="w.id" class="word-chip">
                <span class="word-text" @click="openRename(w)" v-html="highlight(w.name)" />
                <span class="word-del" title="删除" @click="requestDelete(w)">✕</span>
              </span>
              <span
                class="word-chip add-chip"
                title="添加词汇"
                @click="
                  openAddUnder(
                    row.parentId,
                    row.parentName,
                    row.parentId === store.activeRootId,
                  )
                "
                >+ 添加</span
              >
            </div>
          </template>
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
  border-bottom: 1px solid rgba(128, 128, 128, 0.18);
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

.rows {
  padding: 10px 14px 40px;
}

/* 分类标题 */
.cat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 14px;
  padding-bottom: 6px;
  border-bottom: 1px dashed rgba(128, 128, 128, 0.25);
  margin-bottom: 6px;
}

.cat-name {
  font-size: 15px;
  font-weight: 600;
}

.cat-actions {
  display: none;
  gap: 8px;
}

.cat-header:hover .cat-actions {
  display: inline-flex;
}

/* 词汇组 */
.words-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
  padding-bottom: 8px;
}

.word-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 14px;
  background: rgba(128, 128, 128, 0.12);
  font-size: 13px;
  line-height: 1.5;
}

.word-text {
  cursor: pointer;
}

.word-del {
  cursor: pointer;
  opacity: 0;
  font-size: 11px;
  transition: opacity 0.15s;
}

.word-chip:hover .word-del {
  opacity: 0.6;
}

.word-del:hover {
  opacity: 1 !important;
}

.add-chip {
  cursor: pointer;
  background: transparent;
  border: 1px dashed rgba(128, 128, 128, 0.5);
  opacity: 0.75;
}

.add-chip:hover {
  opacity: 1;
  border-color: #18a058;
  color: #18a058;
}

.icon-btn {
  cursor: pointer;
  font-size: 13px;
  opacity: 0.75;
}

.icon-btn:hover {
  opacity: 1;
}

.empty {
  margin-top: 60px;
}

.no-root {
  margin-top: 120px;
}

:deep(mark) {
  background: #ffe58f;
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
</style>
