import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# 添加src路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../src/backend'))

from ai_engine import QwenAI

class TestQwenAI:
    def setup_method(self):
        """每个测试方法前的设置"""
        self.api_key = "test_api_key"
        self.ai_engine = QwenAI(api_key=self.api_key)
    
    def test_init(self):
        """测试初始化"""
        assert self.ai_engine.api_key == self.api_key
        assert self.ai_engine.api_url is not None
    
    @patch('requests.post')
    def test_generate_summary_success(self, mock_post):
        """测试成功生成摘要"""
        # 模拟API响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "output": {
                "text": "这是一个测试摘要，包含了聊天的主要内容。"
            }
        }
        mock_post.return_value = mock_response
        
        messages = [
            "[2024/2/1 14:30:00] 用户A: 你好",
            "[2024/2/1 14:31:00] 用户B: 你好，有什么可以帮助你的吗？"
        ]
        
        result = self.ai_engine.generate_summary(messages)
        
        assert "测试摘要" in result
        mock_post.assert_called_once()
    
    @patch('requests.post')
    def test_generate_summary_api_error(self, mock_post):
        """测试API错误处理"""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"error": "Invalid request"}
        mock_post.return_value = mock_response
        
        messages = ["测试消息"]
        
        with pytest.raises(Exception):
            self.ai_engine.generate_summary(messages)
    
    def test_generate_summary_empty_messages(self):
        """测试空消息列表"""
        with pytest.raises(ValueError, match="消息列表不能为空"):
            self.ai_engine.generate_summary([])
    
    def test_generate_summary_invalid_messages(self):
        """测试无效消息格式"""
        with pytest.raises(TypeError):
            self.ai_engine.generate_summary(None)