/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CHILD_MODE_PIN_STORAGE_KEY,
  CHILD_MODE_PREVIEW_PIN,
  CHILD_MODE_PREVIEW_VALUE,
  CHILD_MODE_STORAGE_KEY,
} from '@/data/childMode'

interface ChildModeContextValue {
  enabled: boolean
  isPreview: boolean
  enable: (pin: string) => boolean
  disable: (pin: string) => boolean
  verify: (pin: string) => boolean
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

function readEnabled() {
  if (isPreviewMode()) {
    // 预览模式下同步写入设备状态，离开预览地址后仍能验证受限页面。
    try {
      localStorage.setItem(CHILD_MODE_STORAGE_KEY, 'true')
    } catch {
      // localStorage 不可用时保留内存态
    }
    return true
  }
  try {
    return localStorage.getItem(CHILD_MODE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function readPinHash() {
  // 预览地址固定使用演示密码，保证设计验收时始终可以退出。
  if (isPreviewMode()) {
    const previewHash = hashPin(CHILD_MODE_PREVIEW_PIN)
    try {
      localStorage.setItem(CHILD_MODE_PIN_STORAGE_KEY, previewHash)
    } catch {
      // localStorage 不可用时保留内存态
    }
    return previewHash
  }
  try {
    return localStorage.getItem(CHILD_MODE_PIN_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function useChildModeState(): ChildModeContextValue {
  const isPreview = useMemo(() => isPreviewMode(), [])
  const [enabled, setEnabled] = useState(readEnabled)
  const [pinHash, setPinHash] = useState(readPinHash)

  useEffect(() => {
    const root = document.documentElement
    if (enabled) root.classList.add('child-mode')
    else root.classList.remove('child-mode')
  }, [enabled])

  // 同一浏览器的其他标签页切换模式时保持同步。
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === CHILD_MODE_STORAGE_KEY) setEnabled(event.newValue === 'true')
      if (event.key === CHILD_MODE_PIN_STORAGE_KEY) setPinHash(event.newValue || '')
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
    try {
      localStorage.setItem(CHILD_MODE_PIN_STORAGE_KEY, nextHash)
      localStorage.setItem(CHILD_MODE_STORAGE_KEY, 'true')
    } catch {
      // localStorage 不可用时降级为内存态
    }
    return true
  }, [])

  const disable = useCallback((pin: string) => {
    if (!verify(pin)) return false
    setEnabled(false)
    setPinHash('')
    try {
      localStorage.setItem(CHILD_MODE_STORAGE_KEY, 'false')
      localStorage.removeItem(CHILD_MODE_PIN_STORAGE_KEY)
    } catch {
      // localStorage 不可用时降级为内存态
    }
    return true
  }, [verify])

  return useMemo(
    () => ({ enabled, isPreview, enable, disable, verify }),
    [enabled, isPreview, enable, disable, verify],
  )
}
