<script setup lang="ts">
import { onMounted, watch } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLayout,
  NLayoutSider,
  NLayoutHeader,
  NLayoutContent,
  NSwitch,
  NIcon,
  darkTheme,
  zhCN,
  dateZhCN,
  type GlobalThemeOverrides,
} from 'naive-ui'
import { ref } from 'vue'
import { LibraryOutline, MoonOutline, SunnyOutline } from '@vicons/ionicons5'
import Sidebar from './components/Sidebar.vue'
import ContentPanel from './components/ContentPanel.vue'
import Toolbar from './components/Toolbar.vue'
import { useCategoryStore } from './stores/category'

const THEME_KEY = 'theme-preference'

const store = useCategoryStore()
const isDark = ref(localStorage.getItem(THEME_KEY) === 'dark')

const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '8px',
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43',
  },
}

function applyTheme(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
}

watch(isDark, applyTheme, { immediate: true })

onMounted(() => {
  store.loadRoots()
})
</script>

<template>
  <n-config-provider
    :theme="isDark ? darkTheme : null"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <n-layout style="height: 100vh">
          <n-layout-header bordered class="app-header">
            <div class="app-title">
              <n-icon class="logo-icon" :component="LibraryOutline" />
              <span>分类词汇工具</span>
            </div>
            <div class="header-actions">
              <Toolbar />
              <div class="theme-switch">
                <n-icon
                  class="theme-icon"
                  :component="SunnyOutline"
                  :class="{ active: !isDark }"
                />
                <n-switch v-model:value="isDark" size="small" />
                <n-icon
                  class="theme-icon"
                  :component="MoonOutline"
                  :class="{ active: isDark }"
                />
              </div>
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

.logo-icon {
  font-size: 22px;
  color: var(--cat-accent);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-icon {
  font-size: 16px;
  color: var(--theme-icon-muted);
  transition: color 0.2s;
}

.theme-icon.active {
  color: var(--cat-accent);
}
</style>
