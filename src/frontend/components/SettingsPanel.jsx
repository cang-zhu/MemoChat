import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import './SettingsPanel.css';

const SettingsPanel = () => {
  const [apiKey, setApiKey] = useState('');
  const [wechatPath, setWechatPath] = useState({ windows: '', mac: '' });
  const [qqPath, setQQPath] = useState({ windows: '', mac: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      // 加载API密钥
      const config = await ipcRenderer.invoke('get-config');
      setApiKey(config.api.key || '');
      
      // 加载聊天记录路径
      const chatPaths = await ipcRenderer.invoke('get-chat-paths');
      setWechatPath(chatPaths.wechat);
      setQQPath(chatPaths.qq);
    };
    
    loadConfig();
  }, []);

  // 保存API密钥
  const handleSaveAPIKey = async () => {
    setIsSaving(true);
    setMessage('');
    
    try {
      const result = await ipcRenderer.invoke('save-api-key', apiKey);
      if (result.success) {
        setMessage('API密钥保存成功！');
      } else {
        setMessage(`保存失败: ${result.error}`);
      }
    } catch (error) {
      setMessage(`发生错误: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 选择路径
  const handleSelectPath = async (platform, type) => {
    const path = await ipcRenderer.invoke('select-directory');
    if (!path) return;
    
    if (type === 'wechat') {
      setWechatPath({ ...wechatPath, [platform]: path });
      await ipcRenderer.invoke('save-chat-path', { platform, type: 'wechat', path });
    } else {
      setQQPath({ ...qqPath, [platform]: path });
      await ipcRenderer.invoke('save-chat-path', { platform, type: 'qq', path });
    }
  };

  return (
    <div className="settings-panel">
      <h2>应用设置</h2>
      
      <div className="settings-section">
        <h3>API设置</h3>
        <div className="form-group">
          <label>通义千问API密钥:</label>
          <input 
            type="password" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            placeholder="请输入您的API密钥"
          />
          <button onClick={handleSaveAPIKey} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
        {message && <div className="message">{message}</div>}
      </div>
      
      <div className="settings-section">
        <h3>聊天记录路径设置</h3>
        <div className="form-group">
          <label>微信聊天记录路径 (Windows):</label>
          <div className="path-input">
            <input type="text" value={wechatPath.windows} readOnly />
            <button onClick={() => handleSelectPath('windows', 'wechat')}>选择</button>
          </div>
        </div>
        
        <div className="form-group">
          <label>微信聊天记录路径 (Mac):</label>
          <div className="path-input">
            <input type="text" value={wechatPath.mac} readOnly />
            <button onClick={() => handleSelectPath('mac', 'wechat')}>选择</button>
          </div>
        </div>
        
        <div className="form-group">
          <label>QQ聊天记录路径 (Windows):</label>
          <div className="path-input">
            <input type="text" value={qqPath.windows} readOnly />
            <button onClick={() => handleSelectPath('windows', 'qq')}>选择</button>
          </div>
        </div>
        
        <div className="form-group">
          <label>QQ聊天记录路径 (Mac):</label>
          <div className="path-input">
            <input type="text" value={qqPath.mac} readOnly />
            <button onClick={() => handleSelectPath('mac', 'qq')}>选择</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;