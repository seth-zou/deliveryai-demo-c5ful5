/** 儿童模式下从菜品规格中移除的选项 key。 */
export const CHILD_BLOCKED_OPTIONS = [
  'menu.option.heavy',
  'menu.option.super_spicy',
  'menu.option.spicy_marinate',
] as const

/** 儿童模式下隐藏的桌边服务 key。 */
export const CHILD_BLOCKED_SERVICES = ['service.bill'] as const

export const CHILD_MODE_STORAGE_KEY = 'child-mode'
export const CHILD_MODE_PIN_STORAGE_KEY = 'child-mode-pin-hash'
export const CHILD_MODE_PREVIEW_VALUE = 'child-mode'
export const CHILD_MODE_PREVIEW_PIN = '1234'
/** 会话级一次性标记：记录本次会话已做过“摘要缺失自动恢复”，避免每次加载都重复自愈（REQ-011）。 */
export const CHILD_MODE_RECOVERED_SESSION_KEY = 'child-mode-recovered'

export const isChildBlockedOption = (option: string) =>
  (CHILD_BLOCKED_OPTIONS as readonly string[]).includes(option)

export const isChildBlockedService = (service: string) =>
  (CHILD_BLOCKED_SERVICES as readonly string[]).includes(service)
