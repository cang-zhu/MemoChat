const os = require('os');
const fs = require('fs');
const path = require('path');

class SystemDetector {
  constructor() {
    this.platform = os.platform();
    this.homedir = os.homedir();
  }

  // 检测操作系统
  detectOS() {
    const platform = this.platform;
    let osInfo = {
      platform: platform,
      name: '',
      version: os.release(),
      arch: os.arch()
    };

    switch (platform) {
      case 'win32':
        osInfo.name = 'Windows';
        break;
      case 'darwin':
        osInfo.name = 'macOS';
        break;
      case 'linux':
        osInfo.name = 'Linux';
        break;
      default:
        osInfo.name = 'Unknown';
    }

    return osInfo;
  }

  // 检测支持的聊天平台
  detectSupportedPlatforms() {
    const platforms = [];
    
    // 检测微信
    if (this.detectWeChatInstallation()) {
      platforms.push({
        name: 'WeChat',
        displayName: '微信',
        installed: true,
        paths: this.getWeChatPaths()
      });
    }

    // 检测QQ
    if (this.detectQQInstallation()) {
      platforms.push({
        name: 'QQ',
        displayName: 'QQ',
        installed: true,
        paths: this.getQQPaths()
      });
    }

    return platforms;
  }

  // 检测微信是否安装
  detectWeChatInstallation() {
    try {
      if (this.platform === 'win32') {
        // Windows微信检测
        const possiblePaths = [
          'C:\\Program Files\\Tencent\\WeChat',
          'C:\\Program Files (x86)\\Tencent\\WeChat'
        ];
        return possiblePaths.some(p => fs.existsSync(p));
      } else if (this.platform === 'darwin') {
        // macOS微信检测
        const appPath = '/Applications/WeChat.app';
        return fs.existsSync(appPath);
      }
    } catch (error) {
      console.error('检测微信安装失败:', error);
    }
    return false;
  }

  // 检测QQ是否安装
  detectQQInstallation() {
    try {
      if (this.platform === 'win32') {
        // Windows QQ检测
        const possiblePaths = [
          'C:\\Program Files\\Tencent\\QQ',
          'C:\\Program Files (x86)\\Tencent\\QQ'
        ];
        return possiblePaths.some(p => fs.existsSync(p));
      } else if (this.platform === 'darwin') {
        // macOS QQ检测
        const appPath = '/Applications/QQ.app';
        return fs.existsSync(appPath);
      }
    } catch (error) {
      console.error('检测QQ安装失败:', error);
    }
    return false;
  }

  // 获取微信聊天记录路径
  getWeChatPaths() {
    const paths = {
      found: [],
      default: null
    };

    try {
      if (this.platform === 'win32') {
        const defaultPath = path.join(this.homedir, 'Documents', 'WeChat Files');
        paths.default = defaultPath;
        if (fs.existsSync(defaultPath)) {
          paths.found.push(defaultPath);
        }
      } else if (this.platform === 'darwin') {
        const possiblePaths = [
          path.join(this.homedir, 'Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat'),
          path.join(this.homedir, 'Library/Containers/com.tencent.WeChat/Data/Library/Application Support/com.tencent.WeChat')
        ];
        
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            paths.found.push(p);
            if (!paths.default) paths.default = p;
          }
        }
      }
    } catch (error) {
      console.error('获取微信路径失败:', error);
    }

    return paths;
  }

  // 获取QQ聊天记录路径
  getQQPaths() {
    const paths = {
      found: [],
      default: null
    };

    try {
      if (this.platform === 'win32') {
        const defaultPath = path.join(this.homedir, 'Documents', 'Tencent Files');
        paths.default = defaultPath;
        if (fs.existsSync(defaultPath)) {
          paths.found.push(defaultPath);
        }
      } else if (this.platform === 'darwin') {
        const possiblePaths = [
          path.join(this.homedir, 'Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ'),
          path.join(this.homedir, 'Library/Application Support/QQ')
        ];
        
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            paths.found.push(p);
            if (!paths.default) paths.default = p;
          }
        }
      }
    } catch (error) {
      console.error('获取QQ路径失败:', error);
    }

    return paths;
  }

  // 验证聊天记录路径是否有效
  validateChatPath(platform, chatPath) {
    try {
      if (!fs.existsSync(chatPath)) {
        return { valid: false, reason: '路径不存在' };
      }

      const stat = fs.statSync(chatPath);
      if (!stat.isDirectory()) {
        return { valid: false, reason: '路径不是目录' };
      }

      // 检查是否有读取权限
      try {
        fs.accessSync(chatPath, fs.constants.R_OK);
      } catch (error) {
        return { valid: false, reason: '没有读取权限' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  // 获取完整的系统信息
  getSystemInfo() {
    return {
      os: this.detectOS(),
      platforms: this.detectSupportedPlatforms(),
      homedir: this.homedir
    };
  }
}

module.exports = SystemDetector;