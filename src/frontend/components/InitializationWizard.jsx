import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import './InitializationWizard.css';

const InitializationWizard = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [systemInfo, setSystemInfo] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState({});
  const [chatPaths, setChatPaths] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { id: 1, title: '欢迎使用', description: '欢迎使用MemoChat聊天记录分析工具' },
    { id: 2, title: '系统检测', description: '检测您的操作系统和已安装的聊天软件' },
    { id: 3, title: 'API配置', description: '配置通义千问API密钥' },
    { id: 4, title: '聊天路径', description: '设置聊天记录文件路径' },
    { id: 5, title: '完成设置', description: '初始化完成，开始使用' }
  ];

  // 初始化时检测系统信息
  useEffect(() => {
    if (currentStep === 2) {
      detectSystem();
    }
  }, [currentStep]);

  // 检测系统信息
  const detectSystem = async () => {
    setIsLoading(true);
    try {
      const info = await ipcRenderer.invoke('detect-system');
      setSystemInfo(info);
      
      // 自动设置找到的聊天路径
      const paths = {};
      info.platforms.forEach(platform => {
        if (platform.paths.default) {
          paths[platform.name.toLowerCase()] = platform.paths.default;
        }
      });
      setChatPaths(paths);
    } catch (error) {
      setError('系统检测失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 验证API密钥
  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setError('请输入API密钥');
      return false;
    }
    
    setIsLoading(true);
    try {
      const result = await ipcRenderer.invoke('validate-api-key', apiKey);
      if (!result.valid) {
        setError('API密钥验证失败: ' + result.error);
        return false;
      }
      return true;
    } catch (error) {
      setError('API密钥验证失败: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 选择聊天记录路径
  const selectChatPath = async (platform) => {
    try {
      const path = await ipcRenderer.invoke('select-directory');
      if (path) {
        const validation = await ipcRenderer.invoke('validate-chat-path', platform, path);
        if (validation.valid) {
          setChatPaths(prev => ({ ...prev, [platform]: path }));
          setError('');
        } else {
          setError(`路径验证失败: ${validation.reason}`);
        }
      }
    } catch (error) {
      setError('选择路径失败: ' + error.message);
    }
  };

  // 下一步
  const nextStep = async () => {
    setError('');
    
    if (currentStep === 3) {
      // 验证API密钥
      const isValid = await validateApiKey();
      if (!isValid) return;
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 上一步
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 完成初始化
  const completeInitialization = async () => {
    setIsLoading(true);
    try {
      // 保存所有配置到.env文件
      const config = {
        apiKey,
        chatPaths,
        systemInfo
      };
      
      const result = await ipcRenderer.invoke('complete-initialization', config);
      if (result.success) {
        onComplete();
      } else {
        setError('初始化失败: ' + result.error);
      }
    } catch (error) {
      setError('初始化失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="welcome-step">
            <h2>欢迎使用 MemoChat</h2>
            <p>MemoChat是一个强大的聊天记录分析工具，可以帮助您：</p>
            <ul>
              <li>自动解析微信、QQ等聊天记录</li>
              <li>使用AI生成聊天摘要</li>
              <li>导出分析结果</li>
            </ul>
            <p>让我们开始设置您的应用吧！</p>
          </div>
        );

      case 2:
        return (
          <div className="system-detection-step">
            <h2>系统检测</h2>
            {isLoading ? (
              <div className="loading">正在检测系统信息...</div>
            ) : systemInfo ? (
              <div className="system-info">
                <div className="os-info">
                  <h3>操作系统</h3>
                  <p>{systemInfo.os.name} {systemInfo.os.version} ({systemInfo.os.arch})</p>
                </div>
                
                <div className="platforms-info">
                  <h3>检测到的聊天软件</h3>
                  {systemInfo.platforms.length > 0 ? (
                    <ul>
                      {systemInfo.platforms.map(platform => (
                        <li key={platform.name} className="platform-item">
                          <span className="platform-name">{platform.displayName}</span>
                          <span className="platform-status installed">已安装</span>
                          {platform.paths.found.length > 0 && (
                            <div className="found-paths">
                              <small>找到聊天记录路径: {platform.paths.found.length} 个</small>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>未检测到支持的聊天软件</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="error">系统检测失败</div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="api-config-step">
            <h2>API配置</h2>
            <p>请输入您的通义千问API密钥：</p>
            <div className="form-group">
              <label>API密钥:</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="api-key-input"
              />
              <small className="help-text">
                您可以在 <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noopener noreferrer">
                  阿里云百炼控制台
                </a> 获取API密钥
              </small>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="chat-paths-step">
            <h2>聊天记录路径设置</h2>
            <p>我们已为您自动检测聊天记录路径，您可以确认或修改：</p>
            
            {systemInfo?.platforms.map(platform => (
              <div key={platform.name} className="platform-path-config">
                <h3>{platform.displayName}</h3>
                <div className="path-input-group">
                  <input
                    type="text"
                    value={chatPaths[platform.name.toLowerCase()] || ''}
                    readOnly
                    placeholder="未设置路径"
                    className="path-input"
                  />
                  <button
                    onClick={() => selectChatPath(platform.name.toLowerCase())}
                    className="select-path-btn"
                  >
                    选择路径
                  </button>
                </div>
                {platform.paths.found.length > 0 && (
                  <div className="suggested-paths">
                    <small>建议路径:</small>
                    {platform.paths.found.map((path, index) => (
                      <div key={index} className="suggested-path">
                        <span>{path}</span>
                        <button
                          onClick={() => setChatPaths(prev => ({ ...prev, [platform.name.toLowerCase()]: path }))}
                          className="use-path-btn"
                        >
                          使用
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 5:
        return (
          <div className="completion-step">
            <h2>设置完成</h2>
            <div className="config-summary">
              <h3>配置摘要:</h3>
              <div className="summary-item">
                <strong>操作系统:</strong> {systemInfo?.os.name}
              </div>
              <div className="summary-item">
                <strong>API密钥:</strong> 已配置
              </div>
              <div className="summary-item">
                <strong>聊天平台:</strong>
                <ul>
                  {Object.entries(chatPaths).map(([platform, path]) => (
                    <li key={platform}>{platform.toUpperCase()}: {path}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p>点击"完成"按钮开始使用MemoChat！</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="initialization-wizard">
      <div className="wizard-header">
        <div className="steps-indicator">
          {steps.map(step => (
            <div
              key={step.id}
              className={`step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
            >
              <div className="step-number">{step.id}</div>
              <div className="step-info">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-content">
        {renderStepContent()}
        
        {error && (
          <div className="error-message">{error}</div>
        )}
      </div>

      <div className="wizard-footer">
        <button
          onClick={prevStep}
          disabled={currentStep === 1 || isLoading}
          className="btn btn-secondary"
        >
          上一步
        </button>
        
        {currentStep < steps.length ? (
          <button
            onClick={nextStep}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? '处理中...' : '下一步'}
          </button>
        ) : (
          <button
            onClick={completeInitialization}
            disabled={isLoading}
            className="btn btn-success"
          >
            {isLoading ? '保存中...' : '完成'}
          </button>
        )}
      </div>
    </div>
  );
};

export default InitializationWizard;