
# MemoChat - AI 智能聊天摘要应用

<div align="center">

![MemoChat Logo](https://img.shields.io/badge/MemoChat-AI%20Chat%20Summary-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-0.1.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)

**基于通义千问 API 的智能聊天摘要应用，专为微信 / QQ 聊天记录设计**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [开发文档](#-开发文档)

</div>

---

## 📖 项目简介

MemoChat 是一款基于 Electron + React + Python 的跨平台桌面应用，专为处理微信 / QQ 聊天记录而设计。通过集成通义千问 AI 模型，能够智能提取聊天中的关键信息，如订单详情、约定事项、发货信息等，大幅提升个人代购、电商客服、咨询顾问等场景的工作效率。

### 🎯 适用场景

- **个人代购**：快速提取客户订单信息、发货时间、备注等  
- **微商 / 私域销售**：回顾客户历史购买记录、价格、意向商品  
- **咨询顾问**：总结与客户的服务约定、会议安排  
- **普通用户**：查询聊天中的重要信息、总结交流内容  

---

## ✨ 功能特性

### 🚀 核心功能

- **🤖 智能初始化系统**
  - 自动检测操作系统和已安装聊天软件
  - 引导式 API 密钥配置
  - 智能聊天路径检测和验证
  - 一键完成应用初始化

- **📁 聊天记录处理**
  - 支持微信 / QQ 聊天记录自动读取
  - 支持手动上传聊天记录文件（.txt、.html、.csv）
  - 智能识别聊天格式并重组对话结构
  - 联系人自动识别与筛选

- **🎯 智能分析**
  - 基于通义千问 AI 的摘要生成
  - 结构化信息提取（订单、时间、价格等）
  - 自然语言问答模式
  - 时间范围精确筛选

- **📊 结果管理**
  - 直观的表格与图文展示
  - 支持导出为 Excel / PDF
  - 一键复制摘要内容
  - 支持历史记录管理

### 🛠 技术特性

- **跨平台支持**：Windows、macOS、Linux  
- **本地优先**：数据隐私保护，数据处理本地完成  
- **模块化设计**：易于扩展和维护  
- **响应式界面**：现代化 UI 设计  
- **配置管理**：统一配置文件系统  

---

## 🚀 快速开始

### 系统要求

- **操作系统**：Windows 10+、macOS 10.14+、Ubuntu 18.04+  
- **Node.js**：16.0+  
- **Python**：3.8+  
- **内存**：至少 4GB RAM  
- **存储**：至少 500MB 可用空间  

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/cang-zhu/MemoChat.git
   cd MemoChat
   ```

2. **安装前端依赖**
   ```bash
   npm install
   ```

3. **安装后端依赖**
   ```bash
   cd src/backend
   pip install -r requirements.txt
   ```

4. **启动应用**
   ```bash
   npm start
   ```

---

## 🧭 首次使用

1. 启动应用后会自动显示初始化向导  
2. 自动检测操作系统和聊天软件  
3. 配置 API 密钥（通义千问）  
4. 设置聊天记录路径  
5. 完成设置，开始使用 MemoChat  

---

## 📚 使用指南

### 获取 API 密钥

1. 访问 阿里云百炼控制台  
2. 注册 / 登录账号  
3. 创建 API 密钥  
4. 在应用中粘贴您的密钥  

### 聊天记录路径

#### Windows 系统

- 微信：`C:\Users\{用户名}\Documents\WeChat Files`  
- QQ：`C:\Users\{用户名}\Documents\Tencent Files`  

#### macOS 系统

- 微信：`~/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat`  
- QQ：`~/Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ`  

### 基本操作流程

1. 导入聊天记录  
   - 选择联系人或上传聊天记录文件  
   - 设置时间范围  
2. AI 分析  
   - 选择分析类型（订单信息、约定事项等）  
   - 等待 AI 处理  
3. 查看结果  
   - 浏览摘要内容  
   - 支持导出 / 复制结果  

---

## 🏗 项目结构

```
MemoChat/
├── src/
│   ├── main.js                 # Electron 主进程
│   ├── config.js               # 配置管理
│   ├── frontend/               # 前端组件
│   │   └── components/
│   │       ├── App.jsx
│   │       ├── InitializationWizard.jsx
│   │       └── SettingsPanel.jsx
│   ├── backend/
│   │   ├── server.py
│   │   ├── ai_engine.py
│   │   ├── parser.py
│   │   └── requirements.txt
│   └── utils/
│       └── systemDetector.js
├── package.json
├── .env
└── README.md
```

---

## 🛠 开发文档

### 技术栈

| 层级     | 技术选型         | 说明                     |
|----------|------------------|--------------------------|
| 前端     | Electron + React | 跨平台桌面应用框架      |
| 后端     | Python + Flask   | 轻量级 Web 框架         |
| AI 引擎  | 通义千问 API     | 阿里云大语言模型         |
| 数据存储 | SQLite + JSON    | 本地数据库和配置文件     |
| 构建工具 | Webpack + Babel  | 现代化构建流程           |

### 开发环境设置

1. 启动开发模式
   ```bash
   npm run dev
   ```

2. 构建应用
   ```bash
   npm run build
   ```

3. 代码规范  
   - 使用 ESLint 进行代码检查  
   - 遵循 React Hooks 最佳实践  
   - Python 代码遵循 PEP8 规范  

### API 接口文档

#### 后端 API 端点

| 端点                   | 方法 | 说明             |
|------------------------|------|------------------|
| /api/load-chats        | POST | 加载聊天记录     |
| /api/filter-chats      | POST | 筛选聊天记录     |
| /api/generate-summary  | POST | 生成 AI 摘要     |
| /api/export-summary    | POST | 导出摘要结果     |

#### IPC 通信事件

| 事件名                | 说明               |
|-----------------------|--------------------|
| detect-system         | 检测系统信息       |
| validate-api-key      | 验证 API 密钥      |
| complete-initialization | 完成初始化       |
| save-api-key          | 保存 API 密钥      |
| get-chat-paths        | 获取聊天路径       |

---

## ⚙ 配置文件示例

（用户配置路径：`~/.memochat/config.json`）

```json
{
  "api": {
    "key": "your-api-key",
    "url": "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    "model": "qwen-max"
  },
  "chatRecords": {
    "wechat": {
      "windows": "C:\\Users\\...\\WeChat Files",
      "mac": "~/Library/Containers/..."
    }
  },
  "app": {
    "language": "zh-CN",
    "theme": "light"
  }
}
```

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. Fork 本项目  
2. 创建功能分支  
   ```bash
   git checkout -b feature/AmazingFeature
   ```  
3. 提交更改  
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```  
4. 推送分支  
   ```bash
   git push origin feature/AmazingFeature
   ```  
5. 创建 Pull Request  

### 开发规范

- 提交信息使用中文，格式清晰  
- 代码注释完整，便于理解  
- 新功能需添加相应测试  
- 遵循现有代码风格  

---

## 📄 许可证

本项目采用 MIT License 许可证。

---

## 🙏 致谢

- 通义千问 - 提供强大的 AI 能力  
- Electron - 跨平台桌面应用框架  
- React - 用户界面库  
- Flask - Python Web 框架  

---

## 📞 联系我们

- 项目地址： GitHub Repository  
- 问题反馈： Issues  
- 功能建议： Discussions  

如果这个项目对您有帮助，请给我们一个 ⭐ Star！

Made with ❤️ by MemoChat Team