const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const config = require('./config');
const SystemDetector = require('./utils/systemDetector');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // 在开发环境中加载React开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 在生产环境中加载打包后的HTML文件
    mainWindow.loadFile(path.join(__dirname, 'frontend/index.html'));
  }

  // 发送初始化状态到渲染进程（延迟发送，确保页面已加载）
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      try {
        const userConfig = config.loadUserConfig();
        const needsInitialization = !userConfig.api.key || 
                                   (!userConfig.chatRecords.wechat.mac && !userConfig.chatRecords.wechat.windows &&
                                    !userConfig.chatRecords.qq.mac && !userConfig.chatRecords.qq.windows);
        
        console.log('Sending initialization status:', { needsInitialization });
        mainWindow.webContents.send('initialization-status', { needsInitialization });
      } catch (error) {
        console.error('Error checking initialization status:', error);
        mainWindow.webContents.send('initialization-status', { needsInitialization: true });
      }
    }, 1000); // 延迟1秒发送
  });
}

// 启动Python后端服务
function startPythonBackend() {
  const pythonPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, 'backend');
  
  const scriptPath = path.join(pythonPath, 'server.py');
  
  // 加载用户配置
  const userConfig = config.loadUserConfig();
  
  // 确保.env文件存在并更新配置
  updateEnvFile(userConfig);
  
  // 启动Python后端
  pythonProcess = spawn('python', [scriptPath]);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python stdout: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python stderr: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

// 更新.env文件
function updateEnvFile(userConfig) {
  const envPath = path.join(__dirname, '..', '.env');
  
  const envContent = `# API配置
QWEN_API_KEY=${userConfig.api.key || ''}
QWEN_API_URL=${userConfig.api.url || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'}
QWEN_MODEL=${userConfig.api.model || 'qwen-turbo'}

# 聊天记录路径配置
WECHAT_PATH_WINDOWS=${userConfig.chatRecords.wechat?.windows || 'C:\\Users\\%USERNAME%\\Documents\\WeChat Files'}
WECHAT_PATH_MAC=${userConfig.chatRecords.wechat?.mac || ''}
QQ_PATH_WINDOWS=${userConfig.chatRecords.qq?.windows || 'C:\\Users\\%USERNAME%\\Documents\\Tencent Files'}
QQ_PATH_MAC=${userConfig.chatRecords.qq?.mac || ''}

# 应用设置
DEFAULT_EXPORT_PATH=${userConfig.app.defaultExportPath || ''}
LANGUAGE=${userConfig.app.language || 'zh-CN'}
THEME=${userConfig.app.theme || 'light'}
`;

  fs.writeFileSync(envPath, envContent);
}

app.whenReady().then(() => {
  createWindow();
  startPythonBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  
  // 关闭Python进程
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ========== 初始化相关的IPC处理程序 ==========

// 检测系统信息
ipcMain.handle('detect-system', async () => {
  try {
    const detector = new SystemDetector();
    return detector.getSystemInfo();
  } catch (error) {
    throw new Error('系统检测失败: ' + error.message);
  }
});

// 验证API密钥
ipcMain.handle('validate-api-key', async (event, apiKey) => {
  try {
    // 这里可以添加实际的API密钥验证逻辑
    // 暂时只检查格式
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return { valid: false, error: 'API密钥格式不正确' };
    }
    
    // TODO: 实际调用API验证密钥有效性
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
});

// 验证聊天记录路径
ipcMain.handle('validate-chat-path', async (event, platform, chatPath) => {
  try {
    const detector = new SystemDetector();
    return detector.validateChatPath(platform, chatPath);
  } catch (error) {
    return { valid: false, reason: error.message };
  }
});

// 选择目录
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择聊天记录目录'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 完成初始化
ipcMain.handle('complete-initialization', async (event, initConfig) => {
  try {
    // 保存配置
    config.updateConfig('api.key', initConfig.apiKey);
    config.updateConfig('api.model', initConfig.selectedModel); // 新增
    
    // 保存聊天路径
    Object.entries(initConfig.chatPaths).forEach(([platform, path]) => {
      const osType = process.platform === 'win32' ? 'windows' : 'mac';
      config.updateConfig(`chatRecords.${platform}.${osType}`, path);
    });
    
    // 更新环境变量
    const userConfig = config.loadUserConfig();
    updateEnvFile(userConfig);
    
    // 创建API密钥文件供Python后端使用
    const pythonPath = app.isPackaged
      ? path.join(process.resourcesPath, 'backend')
      : path.join(__dirname, 'backend');
    const apiKeyPath = path.join(pythonPath, 'api_key.txt');
    fs.writeFileSync(apiKeyPath, initConfig.apiKey);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ========== 原有的IPC处理程序 ==========

// 处理文件选择对话框
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '文本文件', extensions: ['txt', 'csv', 'html'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 保存API密钥
ipcMain.handle('save-api-key', async (event, apiKey) => {
  try {
    config.updateConfig('api.key', apiKey);
    
    // 更新后端使用的API密钥文件
    const pythonPath = app.isPackaged
      ? path.join(process.resourcesPath, 'backend')
      : path.join(__dirname, 'backend');
    const apiKeyPath = path.join(pythonPath, 'api_key.txt');
    fs.writeFileSync(apiKeyPath, apiKey);
    
    // 更新.env文件
    const userConfig = config.loadUserConfig();
    updateEnvFile(userConfig);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取配置
ipcMain.handle('get-config', async () => {
  return config.loadUserConfig();
});

// 获取聊天路径
ipcMain.handle('get-chat-paths', async () => {
  const userConfig = config.loadUserConfig();
  return userConfig.chatRecords;
});

// 保存聊天路径
ipcMain.handle('save-chat-path', async (event, { platform, type, path }) => {
  try {
    config.updateConfig(`chatRecords.${type}.${platform}`, path);
    
    // 更新.env文件
    const userConfig = config.loadUserConfig();
    updateEnvFile(userConfig);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存模型配置
ipcMain.handle('save-model-config', async (event, model) => {
  try {
    config.updateConfig('api.model', model);
    
    // 更新环境变量
    const userConfig = config.loadUserConfig();
    updateEnvFile(userConfig);
    
    return { success: true };
  } catch (error) {
    console.error('保存模型配置失败:', error);
    return { success: false, error: error.message };
  }
});