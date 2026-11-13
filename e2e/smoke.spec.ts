// 仮のスモークテスト。CI の E2E ジョブ（webServer 起動・ブラウザのキャッシュ・所要時間）を確かめるためのもの。
// test.md 7.3 のシナリオ1（未認証のリダイレクト）を実装した時点で削除する。
import { expect, test } from '@playwright/test'

test('トップページが表示される', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('GainLog')).toBeVisible()
})

test('ヘルスチェック API が応答する', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.ok()).toBe(true)
  expect(await res.json()).toEqual({ status: 'ok' })
})
