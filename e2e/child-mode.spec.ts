import { test, expect, type Page } from '@playwright/test'

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
