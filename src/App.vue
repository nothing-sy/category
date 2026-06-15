<script setup lang="ts">
import { onMounted } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLayout,
  NLayoutSider,
  NLayoutHeader,
  NLayoutContent,
  darkTheme,
  zhCN,
  dateZhCN,
} from 'naive-ui'
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ContentPanel from './components/ContentPanel.vue'
import { useCategoryStore } from './stores/category'

const store = useCategoryStore()
const isDark = ref(false)

onMounted(() => {
  store.loadRoots()
})
</script>

<template>
  <n-config-provider
    :theme="isDark ? darkTheme : null"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <n-layout style="height: 100vh">
          <n-layout-header bordered class="app-header">
            <div class="app-title">
              <span class="logo">📚</span>
              <span>分类词汇工具</span>
            </div>
            <div class="header-actions">
              <span class="theme-toggle" @click="isDark = !isDark">
                {{ isDark ? '☀️ 亮色' : '🌙 暗色' }}
              </span>
            </div>
          </n-layout-header>
          <n-layout has-sider style="height: calc(100vh - 56px)">
            <n-layout-sider
              bordered
              :width="280"
              content-style="height: 100%;"
            >
              <Sidebar />
            </n-layout-sider>
            <n-layout-content content-style="height: 100%;">
              <ContentPanel />
            </n-layout-content>
          </n-layout>
        </n-layout>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
.app-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}

.logo {
  font-size: 22px;
}

.theme-toggle {
  cursor: pointer;
  font-size: 14px;
  user-select: none;
  opacity: 0.8;
}

.theme-toggle:hover {
  opacity: 1;
}
</style>
