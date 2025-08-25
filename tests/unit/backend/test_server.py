import pytest
import json
import sys
import os
from unittest.mock import patch, Mock

# 添加src路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../src/backend'))

from server import app

@pytest.fixture
def client():
    """创建测试客户端"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

class TestServerAPI:
    def test_health_check(self, client):
        """测试健康检查端点"""
        response = client.get('/api/health')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert 'timestamp' in data
    
    def test_index_route(self, client):
        """测试根路径"""
        response = client.get('/')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'MemoChat Backend Server' in data['status']
    
    @patch('os.path.exists')
    def test_load_chat_success(self, mock_exists, client):
        """测试成功加载聊天记录"""
        mock_exists.return_value = True
        
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = \
                "[2024/2/1 14:30:00] 用户A: 测试消息"
            
            test_data = {'file_path': './test_data/test_chat.txt'}
            response = client.post('/api/load-chat',
                                 json=test_data,
                                 content_type='application/json')
            
            assert response.status_code == 200
    
    def test_load_chat_file_not_found(self, client):
        """测试文件不存在的情况"""
        test_data = {'file_path': './nonexistent.txt'}
        response = client.post('/api/load-chat',
                             json=test_data,
                             content_type='application/json')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    @patch('ai_engine.QwenAI.generate_summary')
    def test_generate_summary_success(self, mock_generate, client):
        """测试成功生成摘要"""
        mock_generate.return_value = "这是一个测试摘要"
        
        test_data = {
            'messages': ['测试消息1', '测试消息2'],
            'summary_type': 'comprehensive'
        }
        
        response = client.post('/api/generate-summary',
                             json=test_data,
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'summary' in data
    
    def test_generate_summary_missing_messages(self, client):
        """测试缺少消息参数"""
        test_data = {'summary_type': 'brief'}
        
        response = client.post('/api/generate-summary',
                             json=test_data,
                             content_type='application/json')
        
        assert response.status_code == 400