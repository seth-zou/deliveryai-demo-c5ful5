import { test, expect, type Page } from '@playwright/test'

const PREVIEW_BASE_URL = `http://localhost:${process.env.PLAYWRIGHT_PREVIEW_PORT || 4399}`

async function enterMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click()
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
}

async function enableChildModeFromHome(page: Page, pin = '1234') {
  await page.goto('/')
  await page.getByRole('button', { name: '开启儿童模式' }).click()
  await expect(page.getByRole('heading', { name: '开启儿童模式' })).toBeVisible()
  await page.getByLabel('设置 4 位家长密码').fill(pin)
  await page.getByRole('button', { name: '确认开启' }).click()
  await expect(page.getByText('儿童模式已开启', { exact: false }).first()).toBeVisible()
}

async function openFirstBrothSpec(page: Page) {
  await page.getByRole('button', { name: '锅底' }).click()
  await page.locator('article').nth(0).locator('button').last().click()
}

async function exitChildMode(page: Page, pin = '1234') {
  await page.getByRole('button', { name: '家长退出' }).click()
  await expect(page.getByRole('heading', { name: '退出儿童模式' })).toBeVisible()
  await page.getByLabel('家长密码').fill(pin)
  await page.getByRole('button', { name: '确认退出' }).click()
  await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).not.toBeVisible()
}

test.describe('儿童模式 - E2E 验收测试', () => {
  test('REQ-001/003: 开启儿童模式后隐藏受限口味并保留点餐主流程', async ({ page }) => {
    await enableChildModeFromHome(page)
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()

    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()
    await expect(page.getByRole('button', { name: '会员与排号' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: '演示控制台' })).not.toBeVisible()

    await openFirstBrothSpec(page)
    await expect(page.getByRole('button', { name: '微辣' })).toBeVisible()
    await expect(page.getByRole('button', { name: '中辣' })).toBeVisible()
    await expect(page.getByRole('button', { name: '重辣' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: '超级辣' })).not.toBeVisible()
    await expect(page.getByText('儿童模式：已隐藏重辣、超级辣与香辣腌制选项')).toBeVisible()
    await expect(page.getByText('谁点了')).not.toBeVisible()
    await expect(page.getByText('本次由小朋友点餐')).toBeVisible()

    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await expect(page.getByText(/小朋友 点了/).first()).toBeVisible()
    await page.getByRole('button', { name: '确认并提交订单' }).click()

    await expect(page.getByRole('button', { name: '去结账' })).not.toBeVisible()
    await expect(page.getByText('在线支付已关闭，请家长到前台或呼叫服务员结账。')).toBeVisible()
    await expect(page.getByRole('button', { name: '退菜 / 取消' })).not.toBeVisible()
  })

  test('REQ-006: 家长密码错误时无法退出，正确后可退出并恢复功能', async ({ page }) => {
    await enableChildModeFromHome(page)
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()

    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()
    await page.getByRole('button', { name: '家长退出' }).click()
    await expect(page.getByRole('heading', { name: '退出儿童模式' })).toBeVisible()

    await page.getByLabel('家长密码').fill('0000')
    await page.getByRole('button', { name: '确认退出' }).click()
    await expect(page.getByText('密码不正确，请重试')).toBeVisible()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()

    await page.getByLabel('家长密码').fill('1234')
    await page.getByRole('button', { name: '确认退出' }).click()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).not.toBeVisible()
    await expect(page.getByRole('button', { name: '会员与排号' })).toBeVisible()
    await expect(page.getByRole('button', { name: '演示控制台' })).toBeVisible()
  })

  test('REQ-004/005: 儿童模式下支付与买单入口被拦截', async ({ page }) => {
    await enableChildModeFromHome(page)
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await page.goto('/#/checkout')
    await expect(page.getByRole('heading', { name: '儿童模式下暂不支持在线支付' })).toBeVisible()
    await expect(page.getByRole('button', { name: /确认支付/ })).not.toBeVisible()

    await page.goto('/#/menu')
    await page.getByRole('button', { name: '呼叫服务' }).click()
    await expect(page.getByText('买单', { exact: true })).not.toBeVisible()
    await expect(page.getByText('加汤', { exact: true })).toBeVisible()
  })

  test('REQ-008: 未开启儿童模式时原有流程不受影响', async ({ page }) => {
    await enterMenu(page)
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).not.toBeVisible()
    await expect(page.getByRole('button', { name: '会员与排号' })).toBeVisible()
    await expect(page.getByRole('button', { name: '演示控制台' })).toBeVisible()

    await openFirstBrothSpec(page)
    await expect(page.getByRole('button', { name: '重辣' })).toBeVisible()
    await expect(page.getByRole('button', { name: '超级辣' })).toBeVisible()
    await expect(page.getByText('谁点了')).toBeVisible()
    await page.getByRole('button', { name: '微辣' }).click()
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await expect(page.getByRole('button', { name: '确认并提交订单' })).toBeVisible()
  })

  test('REQ-001: 滚动后状态横幅仍可见，390px 无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await enableChildModeFromHome(page)
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const banner = page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')
    await expect(banner).toBeVisible()
    const box = await banner.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeLessThan(844)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('REQ-002: 空值与不足 4 位密码无法开启儿童模式', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '开启儿童模式' }).click()
    await page.getByRole('button', { name: '确认开启' }).click()
    await expect(page.getByText('请输入 4 位数字密码')).toBeVisible()
    await page.getByLabel('设置 4 位家长密码').fill('12')
    await page.getByRole('button', { name: '确认开启' }).click()
    await expect(page.getByText('请输入 4 位数字密码')).toBeVisible()
    await expect(page.getByRole('heading', { name: '开启儿童模式' })).toBeVisible()
    await expect(page.getByText('儿童模式已开启', { exact: false })).not.toBeVisible()
  })

  test('REQ-003: 弹窗打开期间跨标签页开启儿童模式，旧超级辣不会被加购', async ({ context }) => {
    const pageA = await context.newPage()
    await enterMenu(pageA)
    await openFirstBrothSpec(pageA)
    await pageA.getByRole('button', { name: '超级辣' }).click()
    await pageA.getByRole('button', { name: '我已了解，继续下单' }).click()
    await expect(pageA.getByRole('button', { name: '超级辣' })).toBeVisible()

    // 另一个标签页在同一浏览器上下文中开启儿童模式，触发 storage 同步。
    const pageB = await context.newPage()
    await enableChildModeFromHome(pageB)
    await expect(pageA.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()

    await expect(pageA.getByRole('button', { name: '超级辣' })).not.toBeVisible()
    await pageA.getByRole('button', { name: '加入本桌购物车' }).click()
    // 桌面购物车侧栏：条目规格不得含“超级辣”，也不得带风险确认标记
    const cartItem = pageA.locator('aside article, aside section').last()
    await expect(cartItem.getByText('客户已确认风险')).not.toBeVisible()
    await expect(cartItem.getByText('超级辣')).not.toBeVisible()
    await expect(cartItem.getByText('小朋友 点了')).toBeVisible()
  })

  test('REQ-006/011: 密码摘要缺失时自动恢复为常规模式，不锁死', async ({ page }) => {
    await enableChildModeFromHome(page)
    await page.evaluate(() => {
      localStorage.setItem('child-mode', 'true')
      localStorage.removeItem('child-mode-pin-hash')
      // 清掉会话恢复标记，复现“首次识别异常”的场景
      sessionStorage.removeItem('child-mode-recovered')
    })
    await page.reload()
    await expect(page.getByText('儿童模式状态异常，已恢复为常规模式。如需再次开启，请重新设置家长密码。')).toBeVisible()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).not.toBeVisible()
    await expect(page.getByRole('button', { name: '开启儿童模式' })).toBeVisible()
    const stored = await page.evaluate(() => localStorage.getItem('child-mode'))
    expect(stored).toBe('false')
  })

  test('REQ-008: 刷新后保持儿童模式且原密码可退出', async ({ page }) => {
    await enableChildModeFromHome(page, '5678')
    await page.reload()
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()

    await page.getByRole('button', { name: '家长退出' }).click()
    await page.getByLabel('家长密码').fill('1234')
    await page.getByRole('button', { name: '确认退出' }).click()
    await expect(page.getByText('密码不正确，请重试')).toBeVisible()
    await page.getByLabel('家长密码').fill('5678')
    await page.getByRole('button', { name: '确认退出' }).click()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).not.toBeVisible()
  })

  // 该用例访问生产构建产物（vite preview）：dev server 的 HMR 客户端在站点存储被禁用时会阻塞首屏，
  // 不属于应用代码问题；生产产物可完整验证 REQ-008 的降级路径。由 playwright.config 的 webServer 自动构建并启动。
  test('REQ-008: localStorage 不可用时降级为内存态，不阻塞点餐', async ({ browser }) => {
    const context = await browser.newContext()
    // localStorage 访问器在部分 Chromium 版本下无法在 init script 中重定义，使用 cookie 标记让脚本在页面运行期生效。
    await context.addCookies([{ name: 'block-storage', value: '1', url: PREVIEW_BASE_URL }])
    const page = await context.newPage()
    await page.addInitScript(() => {
      if (!document.cookie.includes('block-storage=1')) return
      // 模拟浏览器禁用站点存储：任意访问都抛 SecurityError
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => { throw new DOMException('storage blocked', 'SecurityError') },
      })
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        get: () => { throw new DOMException('storage blocked', 'SecurityError') },
      })
    })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto(`${PREVIEW_BASE_URL}/`)
    await page.getByRole('button', { name: '开启儿童模式' }).click()
    await page.getByLabel('设置 4 位家长密码').fill('1234')
    await page.getByRole('button', { name: '确认开启' }).click()
    await expect(page.getByText('儿童模式已开启', { exact: false }).first()).toBeVisible()

    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()
    await openFirstBrothSpec(page)
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await expect(page.getByRole('button', { name: '确认并提交订单' })).toBeVisible()

    expect(errors).toEqual([])
    // 刷新后回到默认关闭（内存态不持久化）
    await page.goto(`${PREVIEW_BASE_URL}/`)
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).not.toBeVisible()
    expect(errors).toEqual([])
    await context.close()
  })

  test('REQ-008: 同一浏览器其他标签页开启/退出儿童模式时同步', async ({ context }) => {
    const pageA = await context.newPage()
    await enterMenu(pageA)
    const pageB = await context.newPage()

    await enableChildModeFromHome(pageB)
    await expect(pageA.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()
    // 在 A 标签页退出，验证 B 标签页同步关闭
    await exitChildMode(pageA)
    await expect(pageB.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).not.toBeVisible()
    await expect(pageB.getByText('儿童模式已开启', { exact: true })).not.toBeVisible()
  })

  test('REQ-009: 儿童模式与老人模式可叠加', async ({ page }) => {
    await enableChildModeFromHome(page)
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await page.getByRole('button', { name: '切换至老人模式' }).click()

    await expect(page.locator('html')).toHaveClass(/elderly/)
    await expect(page.locator('html')).toHaveClass(/child-mode/)
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()
    await expect(page.getByRole('button', { name: '会员与排号' })).not.toBeVisible()
  })

  test('REQ-004: 已支付订单在儿童模式下仍展示付款完成页', async ({ page }) => {
    await enterMenu(page)
    await openFirstBrothSpec(page)
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await page.getByRole('button', { name: '确认并提交订单' }).click()
    await page.getByRole('button', { name: '去结账' }).click()
    await page.getByRole('button', { name: /确认支付/ }).click()
    await expect(page.getByRole('heading', { name: '付款完成' })).toBeVisible()

    await enableChildModeFromHome(page)
    await page.goto('/#/checkout')
    await expect(page.getByRole('heading', { name: '儿童模式下暂不支持在线支付' })).not.toBeVisible()
  })

  test('REQ-005: 儿童模式保留搜索/加购/提交/继续加菜/服务', async ({ page }) => {
    await enableChildModeFromHome(page)
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()

    await page.getByPlaceholder(/搜索|Search/).fill('不存在')
    // 无匹配结果验证搜索可用，再清空搜索走完整加购流程
    await expect(page.locator('article')).toHaveCount(0)
    await page.getByPlaceholder(/搜索|Search/).fill('')
    await openFirstBrothSpec(page)
    await page.getByRole('button', { name: '加入本桌购物车' }).click()
    await page.getByRole('button', { name: '确认并提交订单' }).click()
    await page.getByRole('button', { name: '继续加菜' }).click()
    await expect(page.getByRole('heading', { name: '想吃什么，告诉爸爸妈妈一起点。' })).toBeVisible()

    await page.getByRole('button', { name: '呼叫服务' }).click()
    const serviceDialog = page.getByRole('dialog')
    await expect(serviceDialog.getByText('加汤', { exact: true })).toBeVisible()
    await expect(serviceDialog.getByText('加饮料', { exact: true })).toBeVisible()
    await expect(serviceDialog.getByText('加餐具', { exact: true })).toBeVisible()
    await expect(serviceDialog.getByText('买单', { exact: true })).not.toBeVisible()
  })

  test('REQ-010/011: 预览不覆盖真实设备状态与家长密码', async ({ page }) => {
    await enableChildModeFromHome(page, '5678')
    const realHash = await page.evaluate(() => localStorage.getItem('child-mode-pin-hash'))

    await page.goto('/?preview=child-mode')
    await exitChildMode(page, '1234')
    const afterPreview = await page.evaluate(() => ({
      enabled: localStorage.getItem('child-mode'),
      hash: localStorage.getItem('child-mode-pin-hash'),
    }))
    expect(afterPreview).toEqual({ enabled: 'true', hash: realHash })

    await page.goto('/#/menu')
    await expect(page.getByRole('button', { name: '家长退出' })).toBeVisible()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()
    await exitChildMode(page, '5678')
  })

  test('PREVIEW-001: ?preview=child-mode 可直达儿童模式预览并使用演示密码退出', async ({ page }) => {
    await page.goto('/?preview=child-mode')
    await expect(page.getByRole('heading', { name: '想吃什么，告诉爸爸妈妈一起点。' })).toBeVisible()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).toBeVisible()
    await expect(page.getByText('本桌购物车').first()).toBeVisible()

    await page.getByRole('button', { name: '家长退出' }).click()
    await expect(page.getByText('预览模式密码：1234')).toBeVisible()
    await page.getByLabel('家长密码').fill('1234')
    await page.getByRole('button', { name: '确认退出' }).click()
    await expect(page.getByText('儿童模式已开启 · 已隐藏重辣菜品与支付入口')).not.toBeVisible()
  })
})
