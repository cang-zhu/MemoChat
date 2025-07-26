const path = require('path');
const fs = require('fs');
const os = require('os');

// 默认配置
const defaultConfig = {
  // API配置
  api: {
    key: "", // 默认为空，需要用户设置
    url: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    model: "qwen-max"
  },
  // 聊天记录路径配置
  chatRecords: {
    wechat: {
      windows: "C:\\Users\\%USERNAME%\\Documents\\WeChat Files",
      mac: path.join(os.homedir(), "Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat")
    },
    qq: {
      windows: "C:\\Users\\%USERNAME%\\Documents\\Tencent Files",
      mac: ""
    }
  },
  // 应用设置
  app: {
    defaultExportPath: path.join(os.homedir(), "Documents"),
    language: "zh-CN",
    theme: "light"
  }
};

// 用户配置文件路径
const userConfigPath = path.join(os.homedir(), '.memochat', 'config.json');

// 确保配置目录存在
function ensureConfigDir() {
  const configDir = path.dirname(userConfigPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

// 加载用户配置
function loadUserConfig() {
  ensureConfigDir();
  
  if (fs.existsSync(userConfigPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
      return { ...defaultConfig, ...userConfig };
    } catch (error) {
      console.error('加载用户配置失败:', error);
      return defaultConfig;
    }
  } else {
    // 首次运行，创建默认配置文件
    saveUserConfig(defaultConfig);
    return defaultConfig;
  }
}

// 保存用户配置
function saveUserConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(userConfigPath, JSON.stringify(config, null, 2), 'utf8');
}

// 更新特定配置项
function updateConfig(key, value) {
  const config = loadUserConfig();
  
  // 支持嵌套路径，如 'api.key'
  const keys = key.split('.');
  let current = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
  saveUserConfig(config);
  return config;
}

module.exports = {
  loadUserConfig,
  saveUserConfig,
  updateConfig,
  defaultConfig
};