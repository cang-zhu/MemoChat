"""
隐私管理模块
处理用户隐私设置、数据脱敏和授权管理
"""

import re
import hashlib
from typing import List, Dict, Optional
from datetime import datetime

class PrivacyManager:
    """隐私管理器"""
    
    def __init__(self):
        self.privacy_levels = {
            'basic': {
                'data_sharing': False,
                'requires_user_api_key': True,
                'anonymization': False,
                'local_processing_only': True
            },
            'advanced': {
                'data_sharing': True,
                'requires_user_api_key': False,
                'anonymization': True,
                'local_processing_only': False
            }
        }
        
        # 敏感信息模式
        self.sensitive_patterns = {
            'phone': r'1[3-9]\d{9}',
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'id_card': r'\d{17}[\dXx]',
            'bank_card': r'\d{16,19}',
            'address': r'[\u4e00-\u9fa5]+[省市区县][^\s]{2,20}',
            'qq_number': r'[1-9]\d{4,10}',
            'wechat_id': r'wxid_[a-zA-Z0-9_-]+',
        }
    
    def has_valid_consent(self, privacy_level: str) -> bool:
        """检查是否有有效的用户授权"""
        # 这里应该与config.js中的授权状态同步
        # 暂时返回True，实际应该检查配置文件
        return True
    
    def anonymize_messages(self, messages: List[Dict]) -> List[Dict]:
        """对消息进行脱敏处理"""
        anonymized_messages = []
        sender_mapping = {}  # 发送者映射表
        
        for msg in messages:
            anonymized_msg = msg.copy()
            
            # 脱敏发送者信息
            sender = msg.get('sender', '')
            if sender not in sender_mapping:
                sender_mapping[sender] = f"用户{len(sender_mapping) + 1}"
            anonymized_msg['sender'] = sender_mapping[sender]
            
            # 脱敏消息内容
            content = msg.get('message', '')
            anonymized_content = self._anonymize_content(content)
            anonymized_msg['message'] = anonymized_content
            
            # 移除或脱敏其他敏感字段
            if 'sender_qq' in anonymized_msg:
                anonymized_msg['sender_qq'] = '***'
            if 'source_file' in anonymized_msg:
                anonymized_msg['source_file'] = '***'
            
            anonymized_messages.append(anonymized_msg)
        
        return anonymized_messages
    
    def _anonymize_content(self, content: str) -> str:
        """脱敏消息内容"""
        anonymized = content
        
        for pattern_name, pattern in self.sensitive_patterns.items():
            anonymized = re.sub(pattern, f'[{pattern_name.upper()}]', anonymized)
        
        return anonymized
    
    def generate_data_hash(self, messages: List[Dict]) -> str:
        """生成数据哈希用于完整性验证"""
        content = json.dumps(messages, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(content.encode()).hexdigest()
    
    def can_share_data(self, privacy_level: str) -> bool:
        """检查是否可以共享数据"""
        return self.privacy_levels.get(privacy_level, {}).get('data_sharing', False)
    
    def requires_user_api_key(self, privacy_level: str) -> bool:
        """检查是否需要用户提供API密钥"""
        return self.privacy_levels.get(privacy_level, {}).get('requires_user_api_key', True)
    
    def log_data_access(self, operation: str, privacy_level: str, data_count: int):
        """记录数据访问日志"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'operation': operation,
            'privacy_level': privacy_level,
            'data_count': data_count
        }
        # 这里可以写入日志文件或数据库
        print(f"数据访问日志: {log_entry}")

# 全局实例
privacy_manager = PrivacyManager()