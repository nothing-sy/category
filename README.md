# 分类词汇工具网

一个用于记录与管理**分类词汇**的工具（主打小说创作词汇，也适用于网站、英语等任意行业）。
左右布局，左侧为可自由增减的大类，右侧把该大类下的**无限层级**分类与词汇**平铺成带完整路径的列表**，数据全部存储在浏览器本地（IndexedDB），无需后端。

## 技术栈

- [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [Naive UI](https://www.naiveui.com/) 组件库
- [Pinia](https://pinia.vuejs.org/) 状态管理
- [Dexie](https://dexie.org/) 封装 IndexedDB 持久化
- [Vite](https://vitejs.dev/) 构建

## 功能

1. **左右布局**：左侧菜单按大类区分（小说、网站、英语等），可自由增减；右侧为内容区。
2. **无限层级 + 平面化展开**：右侧不限制分类层级，把所有层级拍平成一个列表，每行显示完整路径（如 `微动作 / 颔首`），可在任意节点下继续添加子分类或词汇。
3. **删除二次确认**：删除左侧大类需经过两次确认，避免误删；删除含子项的节点会提示影响范围。
4. **本地持久化**：所有数据写入浏览器 IndexedDB，刷新/重开浏览器不丢失。
5. **双侧搜索**：左侧可搜索大类，右侧可按名称或完整路径搜索并高亮命中。
6. **亮/暗主题**切换。

## 本地开发

```bash
npm install
npm run dev      # 启动开发服务器
npm run build    # 类型检查 + 生产构建，产物在 dist/
npm run preview  # 预览构建产物
```

## 数据模型

所有「大类 / 子分类 / 词汇」统一为一个 `node`，通过 `parentId` 构成树：

- 大类（根节点）：`parentId = null`，`rootId = 自身 id`
- 其余节点：`rootId` 指向所属大类，便于一次性按大类查询后在内存中拍平计算路径

## 部署到 GitHub Pages

仓库已内置 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：

1. 推送代码到 `main` 分支即自动触发构建与部署。
2. 首次使用需在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 部署完成后访问 `https://<用户名>.github.io/category/`。

> `vite.config.ts` 中 `base` 设为 `/category/`，与仓库名保持一致。若更改仓库名，请同步修改该值。
