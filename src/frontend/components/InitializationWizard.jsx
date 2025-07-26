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
  
  // 新增：授权相关状态
  const [privacyLevel, setPrivacyLevel] = useState('basic'); // 'basic' 或 'advanced'
  const [consentGiven, setConsentGiven] = useState({
    basic: false,
    advanced: false,
    dataSharing: false
  });

  const steps = [
    { id: 1, title: '欢迎使用', description: '欢迎使用MemoChat聊天记录分析工具' },
    { id: 2, title: '隐私授权', description: '选择您的隐私保护级别' }, // 新增步骤
    { id: 3, title: '系统检测', description: '检测您的操作系统和已安装的聊天软件' },
    { id: 4, title: 'API配置', description: '配置AI服务' },
    { id: 5, title: '聊天路径', description: '设置聊天记录文件路径' },
    { id: 6, title: '完成设置', description: '初始化完成，开始使用' }
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
          <div className="privacy-consent-step">
            <h2>隐私保护与数据使用授权</h2>
            <p className="privacy-intro">
              我们非常重视您的隐私安全。请选择适合您的隐私保护级别：
            </p>
            
            <div className="privacy-levels">
              {/* 基础级别 */}
              <div className={`privacy-level ${privacyLevel === 'basic' ? 'selected' : ''}`}>
                <div className="level-header">
                  <input
                    type="radio"
                    id="basic-level"
                    name="privacyLevel"
                    value="basic"
                    checked={privacyLevel === 'basic'}
                    onChange={(e) => setPrivacyLevel(e.target.value)}
                  />
                  <label htmlFor="basic-level">
                    <h3>🔒 基础级别（推荐）</h3>
                  </label>
                </div>
                <div className="level-content">
                  <div className="consent-statement">
                    <strong>授权声明：</strong>
                    <p>"您的全部相关聊天记录都仅用于您的个人需求分析"</p>
                  </div>
                  <div className="level-features">
                    <h4>特点：</h4>
                    <ul>
                      <li>✅ 数据完全本地处理</li>
                      <li>✅ 需要您提供自己的API-KEY</li>
                      <li>✅ 最高隐私保护</li>
                      <li>✅ 数据不会上传到我们的服务器</li>
                      <li>✅ 您完全控制数据流向</li>
                    </ul>
                  </div>
                  <div className="consent-checkbox">
                    <input
                      type="checkbox"
                      id="basic-consent"
                      checked={consentGiven.basic}
                      onChange={(e) => setConsentGiven(prev => ({...prev, basic: e.target.checked}))}
                    />
                    <label htmlFor="basic-consent">
                      我同意在基础级别下使用MemoChat，理解我的聊天记录仅用于个人分析
                    </label>
                  </div>
                </div>
              </div>

              {/* 进阶级别 */}
              <div className={`privacy-level ${privacyLevel === 'advanced' ? 'selected' : ''}`}>
                <div className="level-header">
                  <input
                    type="radio"
                    id="advanced-level"
                    name="privacyLevel"
                    value="advanced"
                    checked={privacyLevel === 'advanced'}
                    onChange={(e) => setPrivacyLevel(e.target.value)}
                  />
                  <label htmlFor="advanced-level">
                    <h3>🚀 进阶级别</h3>
                  </label>
                </div>
                <div className="level-content">
                  <div className="consent-statement">
                    <strong>授权声明：</strong>
                    <p>"在基础授权的前提下，提供您的脱敏数据以及应用体验反馈来帮助我们训练！"</p>
                  </div>
                  <div className="level-features">
                    <h4>特点：</h4>
                    <ul>
                      <li>✅ 包含基础级别所有保护</li>
                      <li>✅ 可使用我们提供的AI模型</li>
                      <li>✅ 无需提供自己的API-KEY</li>
                      <li>✅ 更好的用户体验</li>
                      <li>⚠️ 脱敏后的数据用于模型优化</li>
                    </ul>
                  </div>
                  <div className="consent-checkboxes">
                    <div className="consent-checkbox">
                      <input
                        type="checkbox"
                        id="advanced-consent"
                        checked={consentGiven.advanced}
                        onChange={(e) => setConsentGiven(prev => ({...prev, advanced: e.target.checked}))}
                      />
                      <label htmlFor="advanced-consent">
                        我同意在进阶级别下使用MemoChat，理解基础授权的所有条款
                      </label>
                    </div>
                    <div className="consent-checkbox">
                      <input
                        type="checkbox"
                        id="data-sharing-consent"
                        checked={consentGiven.dataSharing}
                        onChange={(e) => setConsentGiven(prev => ({...prev, dataSharing: e.target.checked}))}
                      />
                      <label htmlFor="data-sharing-consent">
                        我同意提供脱敏数据和使用反馈，帮助改进AI模型（可随时撤回）
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="privacy-notice">
              <h4>📋 重要说明：</h4>
              <ul>
                <li>无论选择哪种级别，您的原始聊天记录都不会被直接上传</li>
                <li>进阶级别的数据共享仅限于经过脱敏处理的统计信息</li>
                <li>您可以随时在设置中更改隐私级别</li>
                <li>您有权随时撤回授权并删除相关数据</li>
              </ul>
            </div>
          </div>
        );

      case 3:
        // 原来的系统检测步骤
        return (
          <div className="system-detection-step">
            {/* ... existing system detection code ... */}
          </div>
        );

      case 4:
        return (
          <div className="api-config-step">
            <h2>AI服务配置</h2>
            {privacyLevel === 'basic' ? (
              <div className="basic-api-config">
                <p>基于您选择的基础隐私级别，请配置您自己的API密钥：</p>
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
            ) : (
              <div className="advanced-api-config">
                <p>基于您选择的进阶级别，您可以：</p>
                <div className="api-options">
                  <div className="option">
                    <input
                      type="radio"
                      id="use-our-api"
                      name="apiOption"
                      value="ours"
                      defaultChecked
                    />
                    <label htmlFor="use-our-api">
                      <strong>使用我们提供的AI服务</strong>
                      <small>（测试阶段免费，无需配置）</small>
                    </label>
                  </div>
                  <div className="option">
                    <input
                      type="radio"
                      id="use-own-api"
                      name="apiOption"
                      value="own"
                    />
                    <label htmlFor="use-own-api">
                      <strong>使用自己的API密钥</strong>
                      <small>（更高控制权）</small>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
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

      case 6:
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

  // 验证当前步骤是否可以继续
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 2: // 隐私授权步骤
        if (privacyLevel === 'basic') {
          return consentGiven.basic;
        } else {
          return consentGiven.advanced && consentGiven.dataSharing;
        }
      // ... other cases ...
      default:
        return true;
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