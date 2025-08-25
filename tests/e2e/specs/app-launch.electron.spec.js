const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

test.describe('MemoChat Electron App Launch', () => {
  let electronApp;
  let page;
  
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['../../src/main.js'],
      cwd: __dirname
    });
    page = await electronApp.firstWindow();
  });
  
  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });
  
  test('should launch app successfully', async () => {
    await page.waitForLoadState('domcontentloaded');
    
    const title = await page.title();
    expect(title).toBe('MemoChat - AI智能聊天摘要');
  });
  
  test('should show main interface elements', async () => {
    // 检查主要界面元素
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    
    // 检查上传区域
    const uploadArea = page.locator('.upload-area');
    await expect(uploadArea).toBeVisible({ timeout: 10000 });
  });
  
  test('should handle initialization dialog', async () => {
    // 如果显示初始化对话框，应该能够处理
    const initDialog = page.locator('.initialization-dialog');
    
    if (await initDialog.isVisible()) {
      // 可以选择跳过或完成初始化
      const skipButton = page.locator('.skip-init, .close-dialog');
      if (await skipButton.isVisible()) {
        await skipButton.click();
      }
    }
  });
});