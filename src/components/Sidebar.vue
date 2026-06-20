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
  NIcon,
  NTooltip,
  useDialog,
  useMessage,
} from 'naive-ui'
import {
  SearchOutline,
  AddOutline,
  CreateOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { useCategoryStore } from '../stores/category'

const store = useCategoryStore()
const dialog = useDialog()
const message = useMessage()

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
        <template #prefix>
          <n-icon :component="SearchOutline" />
        </template>
      </n-input>
      <n-button type="primary" block size="small" class="add-btn" @click="openAdd">
        <template #icon>
          <n-icon :component="AddOutline" />
        </template>
        新增大类
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
          <n-tooltip trigger="hover" :disabled="root.name.length <= 12">
            <template #trigger>
              <span class="root-name">{{ root.name }}</span>
            </template>
            {{ root.name }}
          </n-tooltip>
          <span class="root-actions" @click.stop>
            <n-tooltip trigger="hover">
              <template #trigger>
                <span class="icon-btn" @click="openRename(root.id, root.name)">
                  <n-icon :component="CreateOutline" />
                </span>
              </template>
              重命名
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <span class="icon-btn danger" @click="requestDelete(root.id, root.name)">
                  <n-icon :component="TrashOutline" />
                </span>
              </template>
              删除
            </n-tooltip>
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
  padding: 8px 10px 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.15s;
  border-left: 3px solid var(--sidebar-inactive-border);
  position: relative;
}

.root-item:hover {
  background: var(--sidebar-hover-bg);
}

.root-item.active {
  background: var(--sidebar-active-bg);
  border-left-color: var(--cat-accent);
  font-weight: 600;
}

.root-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.root-actions {
  display: none;
  gap: 2px;
  flex-shrink: 0;
  align-items: center;
}

.root-item:hover .root-actions {
  display: inline-flex;
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
  margin-top: 40px;
}
</style>
