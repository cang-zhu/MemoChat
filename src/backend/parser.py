import re
import pandas as pd
from datetime import datetime

class ChatParser:
    def __init__(self, file_path=None, text_content=None):
        self.file_path = file_path
        self.text_content = text_content
        self.raw_text = self._read_content()
        self.messages = []
        self.contacts = set()
    
    def _read_content(self):
        """读取聊天内容，支持文件路径或直接文本内容"""
        if self.text_content:
            return self.text_content
        elif self.file_path:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                return f.read()
        return ""
    
    def parse_wechat(self):
        """解析微信聊天记录格式"""
        # 重置数据
        self.messages = []
        self.contacts = set()
        
        # 微信聊天记录通常格式: [2023/1/1 12:00:00] 张三: 消息内容
        pattern = r'\[(\d{4}/\d{1,2}/\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2})\]\s+([^:]+):\s+(.+)'
        matches = re.findall(pattern, self.raw_text, re.MULTILINE)
        
        for match in matches:
            timestamp_str, sender, content = match
            try:
                timestamp = datetime.strptime(timestamp_str, '%Y/%m/%d %H:%M:%S')
            except ValueError:
                # 尝试其他可能的日期格式
                try:
                    timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    timestamp = datetime.now()  # 默认值
            
            self.contacts.add(sender)
            self.messages.append({
                'timestamp': timestamp,
                'sender': sender,
                'content': content
            })
        
        return pd.DataFrame(self.messages)
    
    def parse_qq(self):
        """解析QQ聊天记录格式"""
        # 重置数据
        self.messages = []
        self.contacts = set()
        
        # QQ聊天记录通常格式: 2023-01-01 12:00:00 张三: 消息内容
        pattern = r'(\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2})\s+([^:]+):\s+(.+)'
        matches = re.findall(pattern, self.raw_text, re.MULTILINE)
        
        for match in matches:
            timestamp_str, sender, content = match
            try:
                timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                timestamp = datetime.now()  # 默认值
            
            self.contacts.add(sender)
            self.messages.append({
                'timestamp': timestamp,
                'sender': sender,
                'content': content
            })
        
        return pd.DataFrame(self.messages)
    
    def auto_detect_and_parse(self):
        """自动检测聊天记录类型并解析"""
        # 重置数据
        self.messages = []
        self.contacts = set()
        
        # 简单检测：如果包含[yyyy/mm/dd]格式，可能是微信记录
        if re.search(r'\[\d{4}/\d{1,2}/\d{1,2}', self.raw_text):
            return self.parse_wechat()
        # 如果包含yyyy-mm-dd格式，可能是QQ记录
        elif re.search(r'\d{4}-\d{1,2}-\d{1,2}', self.raw_text):
            return self.parse_qq()
        # 尝试两种格式都解析
        else:
            wechat_result = self.parse_wechat()
            if len(wechat_result) > 0:
                return wechat_result
            return self.parse_qq()
    
    def filter_by_time(self, df, start_time, end_time):
        """按时间范围筛选消息"""
        if start_time and end_time:
            mask = (df['timestamp'] >= start_time) & (df['timestamp'] <= end_time)
            return df[mask]
        return df
    
    def filter_by_sender(self, df, sender):
        """按发送者筛选消息"""
        if sender:
            return df[df['sender'] == sender]
        return df
    
    def get_contacts(self):
        """获取所有联系人列表"""
        return list(self.contacts)
    
    def format_for_ai(self, df):
        """将DataFrame格式化为适合AI处理的文本"""
        formatted_text = ""
        for _, row in df.iterrows():
            timestamp = row['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
            formatted_text += f"[{timestamp}] {row['sender']}: {row['content']}\n"
        return formatted_text