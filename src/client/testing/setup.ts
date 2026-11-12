import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

// jsdom は <dialog> の showModal / close を実装していないため、開閉だけを再現する最小スタブを入れる。
// フォーカス移動・Esc キー・背景の inert など実ブラウザの挙動は E2E で確認する（test.md 4.3）
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
}
if (typeof HTMLDialogElement.prototype.close !== 'function') {
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
    if (!this.open) return
    if (returnValue !== undefined) this.returnValue = returnValue
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

export const server = setupServer()

// msw 3 では onUnhandledRequest ではなく onUnhandledFrame（旧名は無視される）
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
