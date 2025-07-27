import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  const root = createRoot(container);
  root.render(<App />);
});