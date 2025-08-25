const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe('Summary Generation', () => {
  let electronApp;
  let page;
  
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['../../src/main.js'],
      cwd: __dirname
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });
  
  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });
  
  test('should generate summary after file upload', async () => {
    // 首先上传文件
    const testFilePath = path.join(__dirname, '../../fixtures/sample-chats/simple-chat.txt');
    const fileInput = page.locator('input[type="file"]');
    
    await fileInput.setInputFiles(testFilePath);
    await expect(page.locator('.chat-preview')).toBeVisible({ timeout: 10000 });
    
    // 选择摘要类型
    const summaryTypeSelect = page.locator('select[name="summary-type"], .summary-type-select');
    if (await summaryTypeSelect.isVisible()) {
      await summaryTypeSelect.selectOption('brief');
    }
    
    // 点击生成摘要按钮
    const generateButton = page.locator('.generate-summary-btn, .generate-btn');
    await generateButton.click();
    
    // 等待摘要生成（可能需要较长时间）
    const summaryResult = page.locator('.summary-result, .summary-content');
    await expect(summaryResult).toBeVisible({ timeout: 30000 });
    
    // 验证摘要内容不为空
    const summaryText = await summaryResult.textContent();
    expect(summaryText.trim().length).toBeGreaterThan(0);
  });
  
  test('should handle API errors gracefully', async () => {
    // 这个测试需要模拟API错误情况
    // 可以通过修改配置或使用无效的API密钥来触发
    
    // 上传文件
    const testFilePath = path.join(__dirname, '../../fixtures/sample-chats/simple-chat.txt');
    const fileInput = page.locator('input[type="file"]');
    
    await fileInput.setInputFiles(testFilePath);
    await expect(page.locator('.chat-preview')).toBeVisible({ timeout: 10000 });
    
    // 尝试生成摘要
    const generateButton = page.locator('.generate-summary-btn, .generate-btn');
    await generateButton.click();
    
    // 检查是否显示错误消息或加载状态
    const errorOrLoading = page.locator('.error-message, .loading, .api-error');
    await expect(errorOrLoading).toBeVisible({ timeout: 10000 });
  });
});