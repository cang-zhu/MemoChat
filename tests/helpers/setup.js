// Jest测试环境设置

// 模拟Electron环境
global.require = jest.fn();
global.ipcRenderer = {
  invoke: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn()
};

// 模拟Node.js模块
jest.mock('electron', () => ({
  ipcRenderer: global.ipcRenderer,
  remote: {
    dialog: {
      showOpenDialog: jest.fn(),
      showSaveDialog: jest.fn()
    }
  }
}));

// 模拟文件系统操作
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true)
}));

// 设置测试超时
jest.setTimeout(30000);

// 全局测试工具函数
global.createMockFile = (name, content) => {
  return new File([content], name, { type: 'text/plain' });
};

global.waitFor = (condition, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('等待超时'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

// 清理函数
beforeEach(() => {
  // 清理所有mock
  jest.clearAllMocks();
});

afterEach(() => {
  // 清理DOM
  document.body.innerHTML = '';
});