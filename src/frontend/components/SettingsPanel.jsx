import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import './SettingsPanel.css';

const SettingsPanel = () => {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('qwen-turbo-latest');
  const [availableModels, setAvailableModels] = useState([]);
  const [wechatPath, setWechatPath] = useState({ windows: '', mac: '' });
  const [qqPath, setQQPath] = useState({ windows: '', mac: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [isLoading, setIsLoading] = useState(true);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        
        // 加载API配置
        const config = await ipcRenderer.invoke('get-config');
        console.log('Loaded config:', config); // 调试日志
        
        setApiKey(config.api?.key || '');
        setSelectedModel(config.api?.model || 'qwen-turbo-latest');
        
        // 确保 availableModels 有默认值
        const models = config.api?.availableModels || [
          { name: "qwen-turbo-latest", displayName: "通义千问-Turbo (免费)", free: true },
          { name: "qwen-plus-latest", displayName: "通义千问-Plus (付费)", free: false },
          { name: "qwen-max-latest", displayName: "通义千问-Max (付费)", free: false }
        ];
        setAvailableModels(models);
        
        // 加载聊天记录路径
        const chatPaths = await ipcRenderer.invoke('get-chat-paths');
        setWechatPath(chatPaths?.wechat || { windows: '', mac: '' });
        setQQPath(chatPaths?.qq || { windows: '', mac: '' });
        
      } catch (error) {
        console.error('加载配置失败:', error);
        showMessage('加载配置失败: ' + error.message, 'error');
        
        // 设置默认值
        setAvailableModels([
          { name: "qwen-turbo-latest", displayName: "通义千问-Turbo (免费)", free: true },
          { name: "qwen-plus-latest", displayName: "通义千问-Plus (付费)", free: false },
          { name: "qwen-max-latest", displayName: "通义千问-Max (付费)", free: false }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  // 显示消息
  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    
    // 3秒后自动清除消息
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  // 保存API密钥
  const handleSaveAPIKey = async () => {
    if (!apiKey.trim()) {
      showMessage('请输入API密钥', 'error');
      return;
    }

    setIsSaving(true);
    
    try {
      const result = await ipcRenderer.invoke('save-api-key', apiKey);
      if (result.success) {
        showMessage('API密钥保存成功！', 'success');
      } else {
        showMessage(`保存失败: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`发生错误: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 选择路径
  const handleSelectPath = async (platform, type) => {
    try {
      const path = await ipcRenderer.invoke('select-directory');
      if (!path) return;
      
      if (type === 'wechat') {
        setWechatPath({ ...wechatPath, [platform]: path });
        await ipcRenderer.invoke('save-chat-path', { platform, type: 'wechat', path });
        showMessage(`微信聊天记录路径 (${platform}) 保存成功！`, 'success');
      } else {
        setQQPath({ ...qqPath, [platform]: path });
        await ipcRenderer.invoke('save-chat-path', { platform, type: 'qq', path });
        showMessage(`QQ聊天记录路径 (${platform}) 保存成功！`, 'success');
      }
    } catch (error) {
      showMessage(`保存路径失败: ${error.message}`, 'error');
    }
  };

  // 保存模型选择
  const handleSaveModel = async () => {
    if (!selectedModel) {
      showMessage('请选择一个AI模型', 'error');
      return;
    }

    try {
      const result = await ipcRenderer.invoke('save-model-config', selectedModel);
      if (result.success) {
        const modelInfo = availableModels.find(m => m.name === selectedModel);
        showMessage(`模型配置保存成功！当前使用: ${modelInfo?.displayName}`, 'success');
      } else {
        showMessage(`保存失败: ${result.error}`, 'error');
      }
    } catch (error) {
      showMessage(`发生错误: ${error.message}`, 'error');
    }
  };

  // 获取当前选中模型的信息
  const getCurrentModelInfo = () => {
    return availableModels.find(m => m.name === selectedModel);
  };

  if (isLoading) {
    return (
      <div className="settings-panel">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>正在加载设置...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <h2>⚙️ 应用设置</h2>
      
      <div className="settings-section">
        <h3>🔑 API设置</h3>
        
        <div className="form-group">
          <label>通义千问API密钥:</label>
          <input 
            type="password" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            placeholder="请输入您的API密钥 (sk-xxxxxxxx...)"
          />
          <button onClick={handleSaveAPIKey} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存API密钥'}
          </button>
          <small style={{display: 'block', color: '#666', marginTop: '4px'}}>
            您可以在 <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noopener noreferrer">
              阿里云百炼控制台
            </a> 获取API密钥
          </small>
        </div>
        
        <div className="form-group model-selection-group">
          <label>🤖 AI模型选择:</label>
          
          {/* 当前模型显示 */}
          {getCurrentModelInfo() && (
            <div className="current-model-display">
              <strong>当前模型:</strong> {getCurrentModelInfo().displayName}
              <span className={`model-badge ${getCurrentModelInfo().free ? 'free' : 'paid'}`}>
                {getCurrentModelInfo().free ? '免费' : '付费'}
              </span>
            </div>
          )}
          
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {availableModels.map(model => (
              <option key={model.name} value={model.name}>
                {model.displayName}
              </option>
            ))}
          </select>
          <button onClick={handleSaveModel}>保存模型配置</button>
          
          <div className="model-info">
            {getCurrentModelInfo()?.free ? (
              <span style={{color: '#28a745'}}>✅ 免费模型，无需额外费用</span>
            ) : (
              <span style={{color: '#ffc107'}}>💰 付费模型，需要相应权限和余额</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="settings-section">
        <h3>📁 聊天记录路径设置</h3>
        
        <div className="form-group">
          <label>微信聊天记录路径 (Windows):</label>
          <div className="path-input">
            <input 
              type="text" 
              value={wechatPath.windows || ''} 
              readOnly 
              placeholder="未设置路径"
            />
            <button onClick={() => handleSelectPath('windows', 'wechat')}>
              选择路径
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label>微信聊天记录路径 (Mac):</label>
          <div className="path-input">
            <input 
              type="text" 
              value={wechatPath.mac || ''} 
              readOnly 
              placeholder="未设置路径"
            />
            <button onClick={() => handleSelectPath('mac', 'wechat')}>
              选择路径
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label>QQ聊天记录路径 (Windows):</label>
          <div className="path-input">
            <input 
              type="text" 
              value={qqPath.windows || ''} 
              readOnly 
              placeholder="未设置路径"
            />
            <button onClick={() => handleSelectPath('windows', 'qq')}>
              选择路径
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label>QQ聊天记录路径 (Mac):</label>
          <div className="path-input">
            <input 
              type="text" 
              value={qqPath.mac || ''} 
              readOnly 
              placeholder="未设置路径"
            />
            <button onClick={() => handleSelectPath('mac', 'qq')}>
              选择路径
            </button>
          </div>
        </div>
      </div>
      
      {/* 消息提示 */}
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;