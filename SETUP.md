# MemoChat 环境配置指南

## 快速开始

1. **复制环境变量模板**
   ```bash
   cp .env.example .env
   ```

2. **编辑 .env 文件**
   ```bash
   # 使用你喜欢的编辑器
   nano .env
   # 或者
   code .env
   ```

3. **必填配置项**
   - `QWEN_API_KEY` : 通义千问API密钥（必须）

## 获取API密钥

### 通义千问API密钥
1. 访问 [阿里云百炼控制台](https://dashscope.console.aliyun.com/)
2. 注册/登录阿里云账号
3. 开通DashScope服务
4. 创建API-KEY
5. 复制密钥到 `.env` 文件中的 `QWEN_API_KEY`

## 聊天记录路径配置

### 自动检测
应用会自动检测您的操作系统并尝试找到默认的聊天记录路径。

### 手动配置
如果自动检测失败，您可以手动设置路径：

#### Windows
- 微信: `C:\Users\你的用户名\Documents\WeChat Files`
- QQ: `C:\Users\你的用户名\Documents\Tencent Files`

#### macOS
- 微信: `~/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat`
- QQ: `~/Library/Containers/com.tencent.qq/Data/Library/Application Support/QQ`

## 可选配置

### 导出路径
设置 `DEFAULT_EXPORT_PATH` 来指定默认的文件导出位置。

### 语言和主题
- `LANGUAGE`: 支持 `zh-CN` (中文) 和 `en-US` (英文)
- `THEME`: 支持 `light` (浅色) 和 `dark` (深色)

### 服务器配置
- `FLASK_PORT`: Flask后端端口，默认5000
- `FLASK_ENV`: 运行环境，开发时使用 `development`

## 安全注意事项

⚠️ **重要**:

- 不要将 `.env` 文件提交到Git仓库
- 不要在公开场所分享您的API密钥
- 定期更换API密钥

## 故障排除

### 常见问题

1. **API密钥无效**
   - 检查密钥是否正确复制
   - 确认API服务是否已开通
   - 检查账户余额

2. **找不到聊天记录**
   - 确认聊天软件已安装
   - 检查路径配置是否正确
   - 尝试手动选择文件夹

3. **应用无法启动**
   - 检查所有依赖是否已安装
   - 确认Python虚拟环境已激活
   - 查看错误日志

## 联系支持

如果遇到问题，请：

1. 查看 [GitHub Issues](https://github.com/cang-zhu/MemoChat/issues)
2. 创建新的Issue并提供详细信息
3. 包含错误日志和系统信息
