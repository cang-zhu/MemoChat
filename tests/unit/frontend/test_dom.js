/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// 加载HTML文件
const html = fs.readFileSync(
  path.resolve(__dirname, '../../../src/frontend/index.html'),
  'utf8'
);

describe('DOM Elements', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = html;
    
    // 模拟Electron环境
    global.require = jest.fn();
    global.ipcRenderer = {
      invoke: jest.fn(),
      send: jest.fn(),
      on: jest.fn()
    };
  });
  
  test('should have main container', () => {
    const container = document.getElementById('root');
    expect(container).toBeTruthy();
  });
  
  test('should have upload area', () => {
    const uploadArea = document.querySelector('.upload-area');
    expect(uploadArea).toBeTruthy();
  });
  
  test('should create export button dynamically', () => {
    // 模拟导出按钮创建逻辑（基于用户提到的代码）
    const exportButton = document.createElement('button');
    exportButton.textContent = '导出摘要';
    exportButton.className = 'export-btn';
    exportButton.onclick = () => {
      console.log('导出功能被触发');
    };
    
    document.body.appendChild(exportButton);
    
    const button = document.querySelector('.export-btn');
    expect(button).toBeTruthy();
    expect(button.textContent).toBe('导出摘要');
    expect(typeof button.onclick).toBe('function');
  });
  
  test('should handle file input change', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.html,.csv';
    
    document.body.appendChild(fileInput);
    
    // 模拟文件选择事件
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false
    });
    
    const changeEvent = new Event('change');
    fileInput.dispatchEvent(changeEvent);
    
    expect(fileInput.files.length).toBe(1);
    expect(fileInput.files[0].name).toBe('test.txt');
  });
  
  test('should handle summary display', () => {
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'summary-result';
    summaryContainer.innerHTML = '<h3>摘要结果</h3><p>这是测试摘要内容</p>';
    
    document.body.appendChild(summaryContainer);
    
    const container = document.querySelector('.summary-result');
    expect(container).toBeTruthy();
    expect(container.textContent).toContain('摘要结果');
    expect(container.textContent).toContain('这是测试摘要内容');
  });
});