<script setup lang="ts">
import { nextTick, ref } from 'vue'
import {
  NInput,
  NButton,
  NScrollbar,
  NEmpty,
  NModal,
  NCard,
  NSpace,
  useDialog,
  useMessage,
} from 'naive-ui'
import { useCategoryStore } from '../stores/category'

const store = useCategoryStore()
const dialog = useDialog()
const message = useMessage()

// 新增 / 重命名 共用一个弹窗
const editVisible = ref(false)
const editMode = ref<'add' | 'rename'>('add')
const editValue = ref('')
const editingId = ref<string | null>(null)
const inputRef = ref<InstanceType<typeof NInput> | null>(null)

function openAdd() {
  editMode.value = 'add'
  editValue.value = ''
  editingId.value = null
  editVisible.value = true
  focusInput()
}

function openRename(id: string, name: string) {
  editMode.value = 'rename'
  editValue.value = name
  editingId.value = id
  editVisible.value = true
  focusInput()
}

function focusInput() {
  nextTick(() => inputRef.value?.focus())
}

async function confirmEdit() {
  const val = editValue.value.trim()
  if (!val) {
    message.warning('名称不能为空')
    return
  }
  if (editMode.value === 'add') {
    await store.addRoot(val)
    message.success('已新增大类')
  } else if (editingId.value) {
    await store.renameRoot(editingId.value, val)
    message.success('已重命名')
  }
  editVisible.value = false
}

// 删除大类：双重确认
function requestDelete(id: string, name: string) {
  const count = store.countDescendants(id)
  dialog.warning({
    title: '删除大类',
    content:
      count > 0
        ? `「${name}」下还有 ${count} 个子项，删除将一并移除，确定继续吗？`
        : `确定删除大类「${name}」吗？`,
    positiveText: '继续',
    negativeText: '取消',
    onPositiveClick: () => secondConfirm(id, name),
  })
}

function secondConfirm(id: string, name: string) {
  dialog.error({
    title: '再次确认',
    content: `此操作不可恢复，确认彻底删除大类「${name}」？`,
    positiveText: '确认删除',
    negativeText: '我再想想',
    onPositiveClick: async () => {
      await store.deleteRoot(id)
      message.success('已删除')
    },
  })
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-top">
      <n-input
        v-model:value="store.sidebarKeyword"
        placeholder="搜索大类…"
        clearable
        size="small"
      >
        <template #prefix>🔍</template>
      </n-input>
      <n-button type="primary" block size="small" class="add-btn" @click="openAdd">
        + 新增大类
      </n-button>
    </div>

    <n-scrollbar class="sidebar-list">
      <n-empty
        v-if="store.filteredRoots.length === 0"
        description="暂无大类"
        class="empty"
      />
      <ul v-else class="root-list">
        <li
          v-for="root in store.filteredRoots"
          :key="root.id"
          class="root-item"
          :class="{ active: root.id === store.activeRootId }"
          @click="store.selectRoot(root.id)"
        >
          <span class="root-name">{{ root.name }}</span>
          <span class="root-actions" @click.stop>
            <span
              class="icon-btn"
              title="重命名"
              @click="openRename(root.id, root.name)"
              >✏️</span
            >
            <span
              class="icon-btn"
              title="删除"
              @click="requestDelete(root.id, root.name)"
              >🗑️</span
            >
          </span>
        </li>
      </ul>
    </n-scrollbar>

    <n-modal v-model:show="editVisible">
      <n-card
        :title="editMode === 'add' ? '新增大类' : '重命名大类'"
        style="width: 360px"
        :bordered="false"
        size="small"
      >
        <n-input
          ref="inputRef"
          v-model:value="editValue"
          placeholder="请输入大类名称"
          maxlength="40"
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
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-top {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-btn {
  margin-top: 2px;
}

.sidebar-list {
  flex: 1;
  min-height: 0;
}

.root-list {
  list-style: none;
  margin: 0;
  padding: 4px 8px;
}

.root-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.15s;
}

.root-item:hover {
  background: rgba(128, 128, 128, 0.12);
}

.root-item.active {
  background: rgba(24, 160, 88, 0.16);
  font-weight: 600;
}

.root-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.root-actions {
  display: none;
  gap: 6px;
  flex-shrink: 0;
}

.root-item:hover .root-actions {
  display: inline-flex;
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
  margin-top: 40px;
}
</style>
