import type { BackupData } from '../types'

/**
 * 通过 GitHub Gist 实现可选的云同步。
 * 仅使用用户自己的 Personal Access Token（需 gist 权限），token 与配置仅存在本地浏览器。
 */

const GIST_FILENAME = 'category-vocab-backup.json'
const STORAGE_KEY = 'category-vocab-gist-config'
const API = 'https://api.github.com'

export interface GistConfig {
  token: string
  gistId: string
}

export function loadGistConfig(): GistConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as GistConfig
  } catch {
    /* ignore */
  }
  return { token: '', gistId: '' }
}

export function saveGistConfig(config: GistConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

function headers(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function ensureOk(res: Response, action: string): Promise<void> {
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.message ? `：${body.message}` : ''
    } catch {
      /* ignore */
    }
    throw new Error(`${action}失败（HTTP ${res.status}）${detail}`)
  }
}

/** 上传备份到 Gist；无 gistId 时创建新的私密 Gist，返回（可能更新后的）gistId */
export async function pushToGist(
  config: GistConfig,
  data: BackupData,
): Promise<string> {
  const content = JSON.stringify(data, null, 2)
  const payload = {
    description: `分类词汇工具备份 @ ${new Date(data.exportedAt).toLocaleString()}`,
    files: { [GIST_FILENAME]: { content } },
  }

  if (config.gistId) {
    const res = await fetch(`${API}/gists/${config.gistId}`, {
      method: 'PATCH',
      headers: headers(config.token),
      body: JSON.stringify(payload),
    })
    await ensureOk(res, '上传到 Gist')
    return config.gistId
  }

  const res = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: headers(config.token),
    body: JSON.stringify({ ...payload, public: false }),
  })
  await ensureOk(res, '创建 Gist')
  const body = (await res.json()) as { id: string }
  return body.id
}

/** 从 Gist 拉取备份内容 */
export async function pullFromGist(config: GistConfig): Promise<BackupData> {
  if (!config.gistId) throw new Error('请先填写 Gist ID')
  const res = await fetch(`${API}/gists/${config.gistId}`, {
    headers: headers(config.token),
  })
  await ensureOk(res, '从 Gist 读取')
  const body = (await res.json()) as {
    files: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>
  }
  const file = body.files[GIST_FILENAME] ?? Object.values(body.files)[0]
  if (!file) throw new Error('该 Gist 中没有找到备份文件')

  let content = file.content ?? ''
  // 内容过大时 GitHub 会截断，需要再请求 raw_url
  if (file.truncated && file.raw_url) {
    const rawRes = await fetch(file.raw_url)
    await ensureOk(rawRes, '读取 Gist 原始内容')
    content = await rawRes.text()
  }
  return JSON.parse(content) as BackupData
}
