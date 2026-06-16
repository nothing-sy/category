import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db, genId } from '../db'
import type { BackupData, FlatNode, Node, RenderRow } from '../types'
import { flattenTree } from '../composables/useFlatten'

export const useCategoryStore = defineStore('category', () => {
  /** 全部大类（根节点） */
  const roots = ref<Node[]>([])
  /** 当前选中的大类 id */
  const activeRootId = ref<string | null>(null)
  /** 当前大类下的全部节点（含根） */
  const currentNodes = ref<Node[]>([])
  /** 左侧搜索关键词 */
  const sidebarKeyword = ref('')
  /** 右侧搜索关键词 */
  const contentKeyword = ref('')
  /** 加载状态 */
  const loading = ref(false)

  // ---------- 计算属性 ----------

  /** 过滤后的大类列表（左侧搜索） */
  const filteredRoots = computed(() => {
    const kw = sidebarKeyword.value.trim().toLowerCase()
    if (!kw) return roots.value
    return roots.value.filter((r) => r.name.toLowerCase().includes(kw))
  })

  const activeRoot = computed(
    () => roots.value.find((r) => r.id === activeRootId.value) ?? null,
  )

  /** 当前大类拍平后的全部节点（不含根） */
  const flatNodes = computed<FlatNode[]>(() => {
    if (!activeRootId.value) return []
    return flattenTree(currentNodes.value, activeRootId.value, false)
  })

  /**
   * 命中搜索时的可见节点集合（含被命中节点的所有祖先，以保留层级结构）。
   * 返回 null 表示无搜索、全部可见。
   */
  const visibleIdSet = computed<Set<string> | null>(() => {
    const kw = contentKeyword.value.trim().toLowerCase()
    if (!kw) return null
    const byId = new Map(currentNodes.value.map((n) => [n.id, n]))
    const set = new Set<string>()
    for (const fn of flatNodes.value) {
      const hit =
        fn.name.toLowerCase().includes(kw) ||
        fn.pathNames.join(' / ').toLowerCase().includes(kw)
      if (hit) {
        set.add(fn.id)
        let cur: Node | undefined = byId.get(fn.id)
        while (cur && cur.parentId) {
          set.add(cur.parentId)
          cur = byId.get(cur.parentId)
        }
      }
    }
    return set
  })

  /** 右侧渲染行：二级分类作为标题，三级词汇在所属二级下合并平铺。 */
  const renderRows = computed<RenderRow[]>(() => {
    if (!activeRootId.value) return []

    const flatById = new Map(flatNodes.value.map((n) => [n.id, n]))
    const childrenMap = new Map<string | null, Node[]>()
    for (const n of currentNodes.value) {
      const list = childrenMap.get(n.parentId) ?? []
      list.push(n)
      childrenMap.set(n.parentId, list)
    }
    for (const list of childrenMap.values()) {
      list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
    }

    const visible = visibleIdSet.value
    const isVisible = (id: string) => visible === null || visible.has(id)
    const rows: RenderRow[] = []

    /** 把分类拆成「可见的叶子词汇」与「可见的子分类」两组 */
    const splitChildren = (parentId: string) => {
      const children = (childrenMap.get(parentId) ?? []).filter((c) => isVisible(c.id))
      const leaves: FlatNode[] = []
      const cats: Node[] = []
      for (const child of children) {
        const isLeaf = (childrenMap.get(child.id) ?? []).length === 0
        if (isLeaf) {
          const flat = flatById.get(child.id)
          if (flat) leaves.push(flat)
        } else {
          cats.push(child)
        }
      }
      return { leaves, cats }
    }

    /** 收集某节点下所有可见的后代叶子词汇（旧数据若超过三级，也统一平铺） */
    const collectLeaves = (parentId: string): FlatNode[] => {
      const result: FlatNode[] = []
      const walk = (pid: string) => {
        const { leaves, cats } = splitChildren(pid)
        for (const leaf of leaves) result.push(leaf)
        for (const cat of cats) walk(cat.id)
      }
      walk(parentId)
      return result
    }

    // 一级大类的直接子节点固定作为二级分类，即使暂时没有三级词汇也显示为分区。
    const secondLevelCats = (childrenMap.get(activeRootId.value) ?? []).filter((c) =>
      isVisible(c.id),
    )
    for (const cat of secondLevelCats) {
      const catFlat = flatById.get(cat.id)
      if (!catFlat) continue
      rows.push({ kind: 'category', key: 'c-' + cat.id, node: catFlat, depth: 0 })

      // 二级分类下的三级词汇统一平铺。旧数据若有更深层级，也收集为词汇兜底展示。
      const second = splitChildren(cat.id)
      const words = [...second.leaves]
      for (const sub of second.cats) {
        words.push(...collectLeaves(sub.id))
      }
      if (words.length) {
        rows.push({
          kind: 'words',
          key: 'w-' + cat.id,
          parentId: cat.id,
          parentName: cat.name,
          depth: 1,
          words,
        })
      }
    }

    return rows
  })

  // ---------- 大类操作 ----------

  async function loadRoots() {
    loading.value = true
    try {
      // IndexedDB 无法按 null 建索引，故全表读取后过滤出根节点（parentId === null）
      const all = await db.nodes.toArray()
      const list = all.filter((n) => n.parentId === null)
      roots.value = list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      if (!activeRootId.value && roots.value.length) {
        await selectRoot(roots.value[0].id)
      } else if (activeRootId.value) {
        await loadCurrentNodes()
      }
    } finally {
      loading.value = false
    }
  }

  async function selectRoot(id: string) {
    activeRootId.value = id
    contentKeyword.value = ''
    await loadCurrentNodes()
  }

  async function addRoot(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const now = Date.now()
    const node: Node = {
      id: genId(),
      name: trimmed,
      parentId: null,
      rootId: '',
      order: roots.value.length,
      createdAt: now,
      updatedAt: now,
    }
    node.rootId = node.id
    await db.nodes.add(node)
    roots.value.push(node)
    await selectRoot(node.id)
  }

  async function renameRoot(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    await db.nodes.update(id, { name: trimmed, updatedAt: Date.now() })
    const root = roots.value.find((r) => r.id === id)
    if (root) root.name = trimmed
    const inCurrent = currentNodes.value.find((n) => n.id === id)
    if (inCurrent) inCurrent.name = trimmed
  }

  /** 删除大类及其全部后代 */
  async function deleteRoot(id: string) {
    await db.nodes.where('rootId').equals(id).delete()
    roots.value = roots.value.filter((r) => r.id !== id)
    if (activeRootId.value === id) {
      activeRootId.value = roots.value[0]?.id ?? null
      if (activeRootId.value) {
        await loadCurrentNodes()
      } else {
        currentNodes.value = []
      }
    }
  }

  // ---------- 节点操作 ----------

  async function loadCurrentNodes() {
    if (!activeRootId.value) {
      currentNodes.value = []
      return
    }
    currentNodes.value = await db.nodes
      .where('rootId')
      .equals(activeRootId.value)
      .toArray()
  }

  function getNodeDepth(id: string): number | null {
    if (id === activeRootId.value) return 0

    const byId = new Map(currentNodes.value.map((n) => [n.id, n]))
    let cur = byId.get(id)
    if (!cur) return null

    let depth = 0
    while (cur?.parentId) {
      depth += 1
      cur = byId.get(cur.parentId)
    }
    return depth
  }

  /** 在 parentId 下新增子节点；parentId 为 null 时表示直接挂在大类下 */
  async function addNode(name: string, parentId: string | null) {
    const trimmed = name.trim()
    if (!trimmed || !activeRootId.value) {
      return { ok: false, message: '名称不能为空' }
    }
    const realParentId = parentId ?? activeRootId.value
    const parentDepth = getNodeDepth(realParentId)
    if (parentDepth === null) {
      return { ok: false, message: '父级不存在，请刷新后重试' }
    }
    if (parentDepth >= 2) {
      return { ok: false, message: '最多支持三级：一级大类、二级分类、三级词汇' }
    }
    const siblings = currentNodes.value.filter((n) => n.parentId === realParentId)
    const now = Date.now()
    const node: Node = {
      id: genId(),
      name: trimmed,
      parentId: realParentId,
      rootId: activeRootId.value,
      order: siblings.length,
      createdAt: now,
      updatedAt: now,
    }
    await db.nodes.add(node)
    currentNodes.value.push(node)
    return { ok: true }
  }

  async function renameNode(id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    await db.nodes.update(id, { name: trimmed, updatedAt: Date.now() })
    const node = currentNodes.value.find((n) => n.id === id)
    if (node) node.name = trimmed
  }

  /** 删除节点及其全部后代 */
  async function deleteNode(id: string) {
    const toDelete = collectDescendants(id)
    await db.nodes.bulkDelete(toDelete)
    const set = new Set(toDelete)
    currentNodes.value = currentNodes.value.filter((n) => !set.has(n.id))
  }

  /** 收集某节点自身 + 所有后代 id */
  function collectDescendants(id: string): string[] {
    const result = [id]
    const childrenMap = new Map<string, string[]>()
    for (const n of currentNodes.value) {
      if (n.parentId) {
        const list = childrenMap.get(n.parentId) ?? []
        list.push(n.id)
        childrenMap.set(n.parentId, list)
      }
    }
    const stack = [id]
    while (stack.length) {
      const cur = stack.pop()!
      const children = childrenMap.get(cur) ?? []
      for (const c of children) {
        result.push(c)
        stack.push(c)
      }
    }
    return result
  }

  /** 统计某节点的后代数量（用于删除确认提示） */
  function countDescendants(id: string): number {
    return collectDescendants(id).length - 1
  }

  // ---------- 备份 / 恢复 ----------

  /** 导出全部数据（所有大类及其后代） */
  async function exportAll(): Promise<BackupData> {
    const nodes = await db.nodes.toArray()
    return {
      app: 'category-vocab',
      version: 1,
      exportedAt: Date.now(),
      nodes,
    }
  }

  /**
   * 导入数据。
   * - overwrite：清空现有数据后写入（保留原 id）
   * - merge：重新生成 id 后整体追加为新的大类，不影响现有数据
   */
  async function importData(
    data: BackupData,
    mode: 'overwrite' | 'merge',
  ): Promise<number> {
    const incoming = Array.isArray(data?.nodes) ? data.nodes : []
    if (mode === 'overwrite') {
      await db.nodes.clear()
      if (incoming.length) await db.nodes.bulkAdd(incoming)
      activeRootId.value = null
    } else {
      const idMap = new Map<string, string>()
      for (const n of incoming) idMap.set(n.id, genId())
      const remapped: Node[] = incoming.map((n) => {
        const newId = idMap.get(n.id)!
        return {
          ...n,
          id: newId,
          parentId: n.parentId ? (idMap.get(n.parentId) ?? n.parentId) : null,
          rootId: idMap.get(n.rootId) ?? newId,
        }
      })
      if (remapped.length) await db.nodes.bulkAdd(remapped)
    }
    await loadRoots()
    return incoming.length
  }

  return {
    roots,
    activeRootId,
    currentNodes,
    sidebarKeyword,
    contentKeyword,
    loading,
    filteredRoots,
    activeRoot,
    flatNodes,
    renderRows,
    loadRoots,
    selectRoot,
    addRoot,
    renameRoot,
    deleteRoot,
    addNode,
    renameNode,
    deleteNode,
    countDescendants,
    exportAll,
    importData,
  }
})
