/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CHILD_MODE_PIN_STORAGE_KEY,
  CHILD_MODE_PREVIEW_PIN,
  CHILD_MODE_PREVIEW_VALUE,
  CHILD_MODE_RECOVERED_SESSION_KEY,
  CHILD_MODE_STORAGE_KEY,
} from '@/data/childMode'

interface ChildModeContextValue {
  enabled: boolean
  isPreview: boolean
  /** 本次会话内发生过“开关存在但密码摘要缺失”的异常自动恢复（REQ-011）。 */
  recovered: boolean
  enable: (pin: string) => boolean
  disable: (pin: string) => boolean
  verify: (pin: string) => boolean
  dismissRecovered: () => void
}

const ChildModeContext = createContext<ChildModeContextValue | null>(null)

export function ChildModeProvider({ children }: { children: ReactNode }) {
  const value = useChildModeState()
  return <ChildModeContext.Provider value={value}>{children}</ChildModeContext.Provider>
}

export function useChildMode() {
  const value = useContext(ChildModeContext)
  if (!value) throw new Error('useChildMode must be used within ChildModeProvider')
  return value
}

function isPreviewMode() {
  try {
    return new URLSearchParams(window.location.search).get('preview') === CHILD_MODE_PREVIEW_VALUE
  } catch {
    return false
  }
}

/**
 * 仅用于演示的本地密码摘要：避免把明文密码直接写入 localStorage。
 * 这不是安全边界，正式实现应由服务端校验家长身份。
 */
function hashPin(pin: string) {
  let hash = 5381
  for (let index = 0; index < pin.length; index += 1) {
    hash = ((hash << 5) + hash + pin.charCodeAt(index)) >>> 0
  }
  return `h${hash.toString(36)}`
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage 不可用时降级为内存态
  }
}

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // localStorage 不可用时降级为内存态
  }
}

function readSessionRecovered() {
  try {
    return sessionStorage.getItem(CHILD_MODE_RECOVERED_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

function writeSessionRecovered() {
  try {
    sessionStorage.setItem(CHILD_MODE_RECOVERED_SESSION_KEY, 'true')
  } catch {
    // sessionStorage 不可用时降级：仅当前内存态提示
  }
}

function clearSessionRecovered() {
  try {
    sessionStorage.removeItem(CHILD_MODE_RECOVERED_SESSION_KEY)
  } catch {
    // sessionStorage 不可用时无副作用
  }
}

interface StoredState {
  enabled: boolean
  pinHash: string
  recovered: boolean
}

/**
 * 读取设备级状态。只读不写，兼容 React StrictMode 的双调用（T-06）。
 * 若“开关为 true 但摘要缺失”，按无效状态处理并自动清理（T-04 / REQ-011），避免永久锁死。
 */
function readStoredState(isPreview: boolean): StoredState {
  const previewHash = hashPin(CHILD_MODE_PREVIEW_PIN)
  if (isPreview) {
    // 预览模式只使用内存态，绝不写真实 key（T-03）。
    return { enabled: true, pinHash: previewHash, recovered: false }
  }
  const enabled = readStorage(CHILD_MODE_STORAGE_KEY) === 'true'
  const pinHash = readStorage(CHILD_MODE_PIN_STORAGE_KEY) || ''
  if (enabled && !pinHash) {
    writeStorage(CHILD_MODE_STORAGE_KEY, 'false')
    removeStorage(CHILD_MODE_PIN_STORAGE_KEY)
    writeSessionRecovered()
    return { enabled: false, pinHash: '', recovered: true }
  }
  // 已自愈过（如 fail-open 后被旧标签页的 storage 回写覆盖），本次会话继续展示提示，避免静默锁死。
  return { enabled, pinHash, recovered: readSessionRecovered() }
}

function useChildModeState(): ChildModeContextValue {
  const isPreview = useMemo(() => isPreviewMode(), [])
  const [initial] = useState(() => readStoredState(isPreview))
  const [enabled, setEnabled] = useState(initial.enabled)
  const [pinHash, setPinHash] = useState(initial.pinHash)
  const [recovered, setRecovered] = useState(initial.recovered)

  useEffect(() => {
    const root = document.documentElement
    if (enabled) root.classList.add('child-mode')
    else root.classList.remove('child-mode')
  }, [enabled])

  // 同一浏览器的其他标签页切换模式时保持同步。
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== CHILD_MODE_STORAGE_KEY && event.key !== CHILD_MODE_PIN_STORAGE_KEY) return
      // 先读取两个 key 的当前值，避免依赖事件到达顺序（先写完摘要再写开关）造成瞬时误判。
      const nextEnabled = readStorage(CHILD_MODE_STORAGE_KEY) === 'true'
      const nextHash = readStorage(CHILD_MODE_PIN_STORAGE_KEY) || ''
      if (nextEnabled && !nextHash) {
        // 两个 key 不一致：自动清理，不锁死；不在事件处理中途与其他标签页竞争写入 false。
        removeStorage(CHILD_MODE_PIN_STORAGE_KEY)
        writeSessionRecovered()
        setEnabled(false)
        setPinHash('')
        setRecovered(true)
        return
      }
      setEnabled(nextEnabled)
      setPinHash(nextHash)
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const verify = useCallback((pin: string) => !!pinHash && hashPin(pin) === pinHash, [pinHash])

  const enable = useCallback((pin: string) => {
    if (!/^\d{4}$/.test(pin)) return false
    const nextHash = hashPin(pin)
    setPinHash(nextHash)
    setEnabled(true)
    setRecovered(false)
    clearSessionRecovered()
    if (!isPreview) {
      // 先写摘要再写开关，其他标签页同步时可读到完整状态。
      writeStorage(CHILD_MODE_PIN_STORAGE_KEY, nextHash)
      writeStorage(CHILD_MODE_STORAGE_KEY, 'true')
    }
    return true
  }, [isPreview])

  const disable = useCallback((pin: string) => {
    if (!verify(pin)) return false
    setEnabled(false)
    setPinHash('')
    if (!isPreview) {
      writeStorage(CHILD_MODE_STORAGE_KEY, 'false')
      removeStorage(CHILD_MODE_PIN_STORAGE_KEY)
    }
    return true
  }, [isPreview, verify])

  const dismissRecovered = useCallback(() => setRecovered(false), [])

  return useMemo(
    () => ({ enabled, isPreview, recovered, enable, disable, verify, dismissRecovered }),
    [enabled, isPreview, recovered, enable, disable, verify, dismissRecovered],
  )
}
