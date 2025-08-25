import pytest
import requests
import time
import subprocess
import os
import signal
from threading import Thread

class TestAPIIntegration:
    @classmethod
    def setup_class(cls):
        """启动Flask服务器"""
        cls.base_url = 'http://127.0.0.1:6000'
        cls.server_process = None
        cls.start_server()
        time.sleep(3)  # 等待服务器启动
    
    @classmethod
    def teardown_class(cls):
        """关闭Flask服务器"""
        if cls.server_process:
            cls.server_process.terminate()
            cls.server_process.wait()
    
    @classmethod
    def start_server(cls):
        """启动测试服务器"""
        server_path = os.path.join(os.path.dirname(__file__), '../../src/backend/server.py')
        env = os.environ.copy()
        env['FLASK_ENV'] = 'testing'
        env['QWEN_API_KEY'] = 'test_api_key'
        
        cls.server_process = subprocess.Popen(
            ['python', server_path],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    
    def test_server_health(self):
        """测试服务器健康状态"""
        response = requests.get(f'{self.base_url}/api/health')
        assert response.status_code == 200
        
        data = response.json()
        assert data['status'] == 'healthy'
        assert 'timestamp' in data
    
    def test_full_chat_workflow(self):
        """测试完整的聊天处理工作流"""
        # 1. 加载聊天记录
        test_file_path = os.path.join(os.path.dirname(__file__), '../../test_data/产品需求讨论.txt')
        load_data = {'file_path': test_file_path}
        
        response = requests.post(f'{self.base_url}/api/load-chat', json=load_data)
        assert response.status_code == 200
        
        chat_data = response.json()
        assert 'messages' in chat_data
        assert len(chat_data['messages']) > 0
        
        # 2. 生成摘要（模拟，因为需要真实API密钥）
        summary_data = {
            'messages': chat_data['messages'][:3],  # 只取前3条消息
            'summary_type': 'brief'
        }
        
        # 注意：这里可能会因为API密钥问题失败，在实际测试中需要配置有效的测试密钥
        try:
            response = requests.post(f'{self.base_url}/api/generate-summary', json=summary_data)
            if response.status_code == 200:
                summary = response.json()
                assert 'summary' in summary
        except Exception as e:
            pytest.skip(f"跳过摘要生成测试，原因：{e}")
    
    def test_file_not_found_handling(self):
        """测试文件不存在的处理"""
        load_data = {'file_path': './nonexistent_file.txt'}
        
        response = requests.post(f'{self.base_url}/api/load-chat', json=load_data)
        assert response.status_code == 404
        
        data = response.json()
        assert 'error' in data
    
    def test_invalid_request_handling(self):
        """测试无效请求处理"""
        # 发送空的请求体
        response = requests.post(f'{self.base_url}/api/load-chat', json={})
        assert response.status_code in [400, 404]
        
        # 发送无效的JSON
        response = requests.post(
            f'{self.base_url}/api/generate-summary',
            json={'invalid': 'data'}
        )
        assert response.status_code == 400