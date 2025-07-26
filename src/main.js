const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const config = require('./config');

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
}

// 启动Python后端服务
// 在startPythonBackend函数中修改
function startPythonBackend() {
  const pythonPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, 'backend');
  
  const scriptPath = path.join(pythonPath, 'server.py');
  
  // 加载用户配置
  const userConfig = config.loadUserConfig();
  
  // 确保.env文件存在并更新API密钥
  const envPath = path.join(app.getAppPath(), '.env');
  let envContent = '';
  
  // 尝试读取现有.env文件
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // 更新API密钥
  const apiKeyRegex = /QWEN_API_KEY=.*/;
  const newApiKeyLine = `QWEN_API_KEY=${userConfig.api.key || ''}`;
  
  if (apiKeyRegex.test(envContent)) {
    // 替换现有的API密钥行
    envContent = envContent.replace(apiKeyRegex, newApiKeyLine);
  } else {
    // 添加新的API密钥行
    envContent += `\n${newApiKeyLine}`;
  }
  
  // 保存更新后的.env文件
  fs.writeFileSync(envPath, envContent);
  
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

// 添加IPC处理程序用于保存API密钥
ipcMain.handle('save-api-key', async (event, apiKey) => {
  try {
    config.updateConfig('api.key', apiKey);
    
    // 更新后端使用的API密钥文件
    const pythonPath = app.isPackaged
      ? path.join(process.resourcesPath, 'backend')
      : path.join(__dirname, 'backend');
    const apiKeyPath = path.join(pythonPath, 'api_key.txt');
    fs.writeFileSync(apiKeyPath, apiKey);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 添加IPC处理程序用于获取/保存聊天记录路径
ipcMain.handle('get-chat-paths', async () => {
  const userConfig = config.loadUserConfig();
  return userConfig.chatRecords;
});

ipcMain.handle('save-chat-path', async (event, { platform, type, path }) => {
  try {
    config.updateConfig(`chatRecords.${type}.${platform}`, path);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});