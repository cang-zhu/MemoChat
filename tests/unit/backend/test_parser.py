import pytest
import sys
import os
from datetime import datetime

# 添加src路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../src/backend'))

from parser import ChatParser

class TestChatParser:
    def setup_method(self):
        """每个测试方法前的设置"""
        self.parser = ChatParser()
    
    def test_parse_wechat_format(self):
        """测试微信格式解析"""
        chat_content = """[2024/2/1 14:30:00] 产品经理小陈: 关于用户反馈的几个优化建议，我们来讨论一下
[2024/2/1 14:31:15] UI设计师小美: 用户主要反馈什么问题？
[2024/2/1 14:32:30] 产品经理小陈: 主要是界面操作不够直观，还有加载速度慢"""
        
        result = self.parser.parse_chat_content(chat_content)
        
        assert len(result['messages']) == 3
        assert result['messages'][0]['sender'] == '产品经理小陈'
        assert result['messages'][0]['message'] == '关于用户反馈的几个优化建议，我们来讨论一下'
        assert '2024/2/1 14:30:00' in result['messages'][0]['timestamp']
    
    def test_parse_qq_format(self):
        """测试QQ格式解析"""
        chat_content = """2024-02-01 14:30:00 产品经理小陈
关于用户反馈的几个优化建议，我们来讨论一下

2024-02-01 14:31:15 UI设计师小美
用户主要反馈什么问题？"""
        
        result = self.parser.parse_chat_content(chat_content, format_type='qq')
        
        assert len(result['messages']) == 2
        assert result['messages'][0]['sender'] == '产品经理小陈'
    
    def test_extract_participants(self):
        """测试参与者提取"""
        messages = [
            {'sender': '用户A', 'message': '消息1', 'timestamp': '2024-01-01 12:00:00'},
            {'sender': '用户B', 'message': '消息2', 'timestamp': '2024-01-01 12:01:00'},
            {'sender': '用户A', 'message': '消息3', 'timestamp': '2024-01-01 12:02:00'}
        ]
        
        participants = self.parser.extract_participants(messages)
        
        assert len(participants) == 2
        assert '用户A' in participants
        assert '用户B' in participants
    
    def test_parse_invalid_format(self):
        """测试无效格式处理"""
        invalid_content = "这是一段无效的聊天记录格式"
        
        result = self.parser.parse_chat_content(invalid_content)
        
        assert len(result['messages']) == 0
        assert result['error'] is not None
    
    def test_parse_empty_content(self):
        """测试空内容处理"""
        with pytest.raises(ValueError, match="聊天内容不能为空"):
            self.parser.parse_chat_content("")