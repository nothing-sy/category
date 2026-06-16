/**
 * 统一节点模型：大类 / 子分类 / 词汇 都是 node，靠 parentId 构成最多三级的树。
 * - 大类（根节点）：parentId = null，rootId = 自身 id
 * - 其余节点：rootId 指向所属大类，便于按大类一次性查询
 */
export interface Node {
  id: string
  name: string
  parentId: string | null
  rootId: string
  order: number
  note?: string
  createdAt: number
  updatedAt: number
}

/** 平铺后用于右侧列表渲染的节点：携带完整祖先路径信息 */
export interface FlatNode extends Node {
  /** 从大类到当前节点（含自身）的名称链，如 ['小说', '微动作', '颔首'] */
  pathNames: string[]
  /** 当前节点深度，大类为 0 */
  depth: number
  /** 是否为叶子节点（无子项，视为词汇） */
  isLeaf: boolean
}

/** 导出 / 导入备份文件结构 */
export interface BackupData {
  app: 'category-vocab'
  version: number
  exportedAt: number
  nodes: Node[]
}

/**
 * 右侧渲染行：
 * - category：二级分类，作为一行标题
 * - words：某个父级下的全部叶子词汇，平铺在同一组里
 */
export type RenderRow =
  | { kind: 'category'; key: string; node: FlatNode; depth: number }
  | {
      kind: 'words'
      key: string
      parentId: string
      parentName: string
      depth: number
      words: FlatNode[]
    }
