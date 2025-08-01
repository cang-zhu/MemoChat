const path = require('path');
const fs = require('fs');
const os = require('os');

// 默认配置
const defaultConfig = {
    api: {
        key: "",
        url: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
        model: "qwen-turbo-latest", // 改为最新免费模型作为默认
        availableModels: [
            { name: "qwen-turbo-latest", displayName: "通义千问-Turbo (免费)", free: true },
            { name: "qwen-plus-latest", displayName: "通义千问-Plus (付费)", free: false },
            { name: "qwen-max-latest", displayName: "通义千问-Max (付费)", free: false }
        ]
    },
    chatRecords: {
        wechat: {
            windows: "",
            mac: "",
            linux: ""
        },
        qq: {
            windows: "",
            mac: "",
            linux: ""
        }
    },
    paths: {
        wechat: "",
        qq: "",
        export: ""
    },
    app: {
        defaultExportPath: "",
        language: "zh-CN",
        theme: "light"
    },
    privacy: {
        enabled: true,
        keywords: ["密码", "账号", "手机号", "身份证", "银行卡"]
    },
    ui: {
        language: "zh-CN",
        theme: "light"
    }
};

// 配置文件路径
const configPath = path.join(os.homedir(), '.memochat', 'config.json');

// 确保配置目录存在
function ensureConfigDir() {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
}

// 加载配置
function loadConfig() {
    try {
        ensureConfigDir();
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const userConfig = JSON.parse(configData);
            return mergeConfig(defaultConfig, userConfig);
        }
    } catch (error) {
        console.error('加载配置失败:', error);
    }
    return { ...defaultConfig };
}

// 加载用户配置（兼容main.js中的调用）
function loadUserConfig() {
    return loadConfig();
}

// 保存配置
function saveConfig(config) {
    try {
        ensureConfigDir();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存配置失败:', error);
        return false;
    }
}

// 深度合并配置
function mergeConfig(defaultConfig, userConfig) {
    const result = { ...defaultConfig };
    
    for (const key in userConfig) {
        if (userConfig.hasOwnProperty(key)) {
            if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
                result[key] = mergeConfig(defaultConfig[key] || {}, userConfig[key]);
            } else {
                result[key] = userConfig[key];
            }
        }
    }
    
    return result;
}

// 更新配置项
function updateConfig(keyPath, value) {
    try {
        const config = loadConfig();
        const keys = keyPath.split('.');
        let current = config;
        
        // 导航到目标位置
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        // 设置值
        current[keys[keys.length - 1]] = value;
        
        // 保存配置
        return saveConfig(config);
    } catch (error) {
        console.error('更新配置失败:', error);
        return false;
    }
}

// 获取配置项
function getConfig(keyPath) {
    try {
        const config = loadConfig();
        if (!keyPath) return config;
        
        const keys = keyPath.split('.');
        let current = config;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && current.hasOwnProperty(key)) {
                current = current[key];
            } else {
                return undefined;
            }
        }
        
        return current;
    } catch (error) {
        console.error('获取配置失败:', error);
        return undefined;
    }
}

module.exports = {
    defaultConfig,
    loadConfig,
    loadUserConfig,  // 添加这个函数
    saveConfig,
    updateConfig,
    getConfig,
    mergeConfig
};