import os
import tempfile
import shutil
import json
from contextlib import contextmanager
from unittest.mock import Mock

class TestHelper:
    """测试辅助工具类"""
    
    @staticmethod
    @contextmanager
    def temp_directory():
        """创建临时目录用于测试"""
        temp_dir = tempfile.mkdtemp()
        try:
            yield temp_dir
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
    
    @staticmethod
    def create_test_chat_file(content, filename="test_chat.txt"):
        """创建测试聊天文件"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(content)
            return f.name
    
    @staticmethod
    def mock_api_response(status_code=200, data=None):
        """模拟API响应"""
        response = Mock()
        response.status_code = status_code
        response.json.return_value = data or {}
        return response
    
    @staticmethod
    def load_test_data(filename):
        """加载测试数据文件"""
        test_data_path = os.path.join(
            os.path.dirname(__file__), 
            '../fixtures/api-responses', 
            filename
        )
        with open(test_data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    @staticmethod
    def create_mock_chat_messages(count=5):
        """创建模拟聊天消息"""
        messages = []
        for i in range(count):
            messages.append({
                'timestamp': f'2024/2/1 14:{30+i}:00',
                'sender': f'用户{chr(65+i%3)}',  # 用户A, B, C循环
                'message': f'这是第{i+1}条测试消息'
            })
        return messages
    
    @staticmethod
    def assert_valid_chat_format(chat_data):
        """验证聊天数据格式"""
        assert isinstance(chat_data, dict)
        assert 'messages' in chat_data
        assert isinstance(chat_data['messages'], list)
        
        for message in chat_data['messages']:
            assert 'timestamp' in message
            assert 'sender' in message
            assert 'message' in message
            assert isinstance(message['timestamp'], str)
            assert isinstance(message['sender'], str)
            assert isinstance(message['message'], str)