import type { Node, FlatNode } from '../types'

/**
 * 将某个大类下的所有节点（含大类自身）拍平成带完整路径的列表。
 *
 * 步骤：
 * 1. 建立 id -> node 映射与 parentId -> children 映射
 * 2. 从大类根节点开始深度优先遍历，保证同一父级的子项相邻
 * 3. 每个节点向上回溯父链得到 pathNames
 *
 * @param nodes 该大类下的全部节点（包含 rootId 对应的根节点）
 * @param rootId 大类根节点 id
 * @param includeRoot 是否在结果中包含大类根节点本身（右侧列表通常排除）
 */
export function flattenTree(
  nodes: Node[],
  rootId: string,
  includeRoot = false,
): FlatNode[] {
  const byId = new Map<string, Node>()
  const childrenMap = new Map<string | null, Node[]>()

  for (const n of nodes) {
    byId.set(n.id, n)
  }
  for (const n of nodes) {
    const list = childrenMap.get(n.parentId) ?? []
    list.push(n)
    childrenMap.set(n.parentId, list)
  }
  // 同级按 order，再按创建时间排序
  for (const list of childrenMap.values()) {
    list.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
  }

  const result: FlatNode[] = []

  const buildPath = (node: Node): string[] => {
    const names: string[] = []
    let cur: Node | undefined = node
    while (cur) {
      names.unshift(cur.name)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return names
  }

  const walk = (node: Node, depth: number) => {
    const children = childrenMap.get(node.id) ?? []
    const flat: FlatNode = {
      ...node,
      pathNames: buildPath(node),
      depth,
      isLeaf: children.length === 0,
    }
    if (includeRoot || node.id !== rootId) {
      result.push(flat)
    }
    for (const child of children) {
      walk(child, depth + 1)
    }
  }

  const root = byId.get(rootId)
  if (root) {
    walk(root, 0)
  }
  return result
}
