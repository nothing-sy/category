import Dexie, { type Table } from 'dexie'
import type { Node } from '../types'

/**
 * 浏览器 IndexedDB 持久化（经 Dexie 封装）。
 * 所有分类层级与词汇都存在 nodes 表中。
 */
class CategoryDB extends Dexie {
  nodes!: Table<Node, string>

  constructor() {
    super('category-vocab-db')
    this.version(1).stores({
      // id 为主键，其余为可查询索引
      nodes: 'id, parentId, rootId, name, order',
    })
  }
}

export const db = new CategoryDB()

/** 生成唯一 id，优先使用原生 crypto.randomUUID */
export function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}
