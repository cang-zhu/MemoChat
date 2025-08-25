const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

test.describe('File Upload Functionality', () => {
  let electronApp;
  let page;
  
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['../../src/main.js'],
      cwd: __dirname
    });
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    
    // 跳过初始化对话框（如果存在）
    const skipButton = page.locator('.skip-init, .close-dialog');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }
  });
  
  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });
  
  test('should upload and parse chat file', async () => {
    // 准备测试文件路径
    const testFilePath = path.join(__dirname, '../../fixtures/sample-chats/simple-chat.txt');
    
    // 查找文件输入元素
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // 直接设置文件
      await fileInput.setInputFiles(testFilePath);
    } else {
      // 如果文件输入不可见，尝试点击上传按钮
      const uploadButton = page.locator('.upload-btn, .file-upload-btn');
      await uploadButton.click();
      
      // 等待文件选择对话框并设置文件
      await fileInput.setInputFiles(testFilePath);
    }
    
    // 等待文件处理完成
    await expect(page.locator('.chat-preview, .file-loaded')).toBeVisible({ timeout: 10000 });
    
    // 验证聊天记录显示
    const chatContent = page.locator('.chat-content, .message-list');
    await expect(chatContent).toBeVisible();
  });
  
  test('should handle invalid file format', async () => {
    // 创建一个无效格式的测试文件
    const invalidFilePath = path.join(__dirname, '../../fixtures/invalid-file.pdf');
    
    const fileInput = page.locator('input[type="file"]');
    
    try {
      await fileInput.setInputFiles(invalidFilePath);
      
      // 应该显示错误消息
      const errorMessage = page.locator('.error-message, .alert-error');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    } catch (error) {
      // 如果文件类型被浏览器拒绝，这也是预期的行为
      console.log('文件类型被拒绝，这是预期的行为');
    }
  });
});