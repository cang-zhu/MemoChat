import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import InitializationWizard from './InitializationWizard';
import SettingsPanel from './SettingsPanel';
import './App.css';

const App = () => {
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('main');

  useEffect(() => {
    // 监听初始化状态
    ipcRenderer.on('initialization-status', (event, { needsInitialization }) => {
      setNeedsInitialization(needsInitialization);
      setIsLoading(false);
    });

    return () => {
      ipcRenderer.removeAllListeners('initialization-status');
    };
  }, []);

  const handleInitializationComplete = () => {
    setNeedsInitialization(false);
    setCurrentView('main');
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>正在加载应用...</p>
      </div>
    );
  }

  if (needsInitialization) {
    return (
      <div className="app">
        <InitializationWizard onComplete={handleInitializationComplete} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>MemoChat</h1>
        <nav className="app-nav">
          <button
            className={currentView === 'main' ? 'active' : ''}
            onClick={() => setCurrentView('main')}
          >
            主页
          </button>
          <button
            className={currentView === 'analysis' ? 'active' : ''}
            onClick={() => setCurrentView('analysis')}
          >
            聊天分析
          </button>
          <button
            className={currentView === 'settings' ? 'active' : ''}
            onClick={() => setCurrentView('settings')}
          >
            设置
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'main' && (
          <div className="main-view">
            <h2>欢迎使用 MemoChat</h2>
            <p>您的聊天记录分析工具已准备就绪。</p>
            <div className="quick-actions">
              <button
                className="action-btn primary"
                onClick={() => setCurrentView('analysis')}
              >
                开始分析聊天记录
              </button>
              <button
                className="action-btn secondary"
                onClick={() => setCurrentView('settings')}
              >
                管理设置
              </button>
            </div>
          </div>
        )}

        {currentView === 'analysis' && (
          <div className="analysis-view">
            <h2>聊天记录分析</h2>
            <p>聊天分析功能正在开发中...</p>
          </div>
        )}

        {currentView === 'settings' && (
          <SettingsPanel />
        )}
      </main>
    </div>
  );
};

export default App;