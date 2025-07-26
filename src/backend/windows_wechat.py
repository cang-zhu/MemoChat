"""
Windows微信聊天记录处理模块
支持多种获取方式：文件导入、路径扫描、数据库读取（实验性）
"""

import os
import sqlite3
import json
import re
from datetime import datetime
from pathlib import Path
import logging
from typing import List, Dict, Optional, Tuple

class WindowsWeChatExtractor:
    """Windows微信聊天记录提取器"""
    
    def __init__(self, privacy_manager=None):
        self.logger = self._setup_logger()
        self.wechat_paths = self._get_default_wechat_paths()
        self.privacy_manager = privacy_manager
        
    def _setup_logger(self):
        """设置日志"""
        logger = logging.getLogger('WindowsWeChat')
        logger.setLevel(logging.INFO)
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        return logger
    
    def _get_default_wechat_paths(self) -> List[str]:
        """获取默认微信安装路径"""
        possible_paths = [
            os.path.expanduser("~/Documents/WeChat Files"),
            os.path.expanduser("~/AppData/Roaming/Tencent/WeChat/WeChat Files"),
            "C:/Users/{}/Documents/WeChat Files".format(os.getenv('USERNAME', '')),
            "D:/WeChat/WeChat Files"
        ]
        return [path for path in possible_paths if os.path.exists(path)]
    
    def scan_wechat_accounts(self) -> List[Dict]:
        """扫描微信账户目录"""
        accounts = []
        
        for base_path in self.wechat_paths:
            try:
                for item in os.listdir(base_path):
                    account_path = os.path.join(base_path, item)
                    if os.path.isdir(account_path) and item.startswith('wxid_'):
                        account_info = self._analyze_account_directory(account_path, item)
                        if account_info:
                            accounts.append(account_info)
            except PermissionError:
                self.logger.warning(f"无权限访问路径: {base_path}")
            except Exception as e:
                self.logger.error(f"扫描路径 {base_path} 时出错: {e}")
        
        return accounts
    
    def _analyze_account_directory(self, account_path: str, wxid: str) -> Optional[Dict]:
        """分析账户目录结构"""
        try:
            msg_path = os.path.join(account_path, "Msg")
            if not os.path.exists(msg_path):
                return None
                
            # 查找数据库文件
            db_files = []
            for root, dirs, files in os.walk(msg_path):
                for file in files:
                    if file.endswith('.db'):
                        db_files.append(os.path.join(root, file))
            
            return {
                'wxid': wxid,
                'account_path': account_path,
                'msg_path': msg_path,
                'db_files': db_files,
                'last_modified': os.path.getmtime(account_path)
            }
        except Exception as e:
            self.logger.error(f"分析账户目录 {account_path} 时出错: {e}")
            return None
    
    def extract_from_text_export(self, file_path: str, privacy_level: str = 'basic') -> List[Dict]:
        """从文本导出文件中提取聊天记录（推荐方式）"""
        try:
            # 记录数据访问
            if self.privacy_manager:
                self.privacy_manager.log_data_access('text_extract', privacy_level, 0)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 解析微信文本导出格式
            messages = self._parse_wechat_text_format(content)
            
            # 记录实际提取数量
            if self.privacy_manager:
                self.privacy_manager.log_data_access('text_extract_complete', privacy_level, len(messages))
            
            self.logger.info(f"从文本文件提取到 {len(messages)} 条消息")
            return messages
            
        except Exception as e:
            self.logger.error(f"读取文本文件 {file_path} 时出错: {e}")
            return []
    
    def _parse_wechat_text_format(self, content: str) -> List[Dict]:
        """解析微信文本格式"""
        messages = []
        
        # 微信导出格式: 2024-01-01 12:00:00 张三\n消息内容
        pattern = r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.+?)\n(.+?)(?=\n\d{4}-\d{2}-\d{2}|\n$)'
        
        matches = re.findall(pattern, content, re.DOTALL)
        
        for match in matches:
            timestamp_str, sender, message = match
            try:
                timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                messages.append({
                    'timestamp': timestamp.isoformat(),
                    'sender': sender.strip(),
                    'message': message.strip(),
                    'type': 'text',
                    'source': 'wechat_text_export'
                })
            except ValueError:
                continue
        
        return messages
    
    def attempt_database_read(self, db_path: str, password: str = None) -> List[Dict]:
        """尝试读取数据库文件（实验性功能）"""
        self.logger.warning("⚠️  数据库直接读取功能仅供研究使用，请确保合规性")
        
        if not os.path.exists(db_path):
            self.logger.error(f"数据库文件不存在: {db_path}")
            return []
        
        try:
            # 检查文件是否被锁定
            if self._is_file_locked(db_path):
                self.logger.warning("数据库文件被微信进程锁定，请关闭微信后重试")
                return []
            
            # 尝试连接数据库
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # 获取表结构
            tables = self._get_database_tables(cursor)
            self.logger.info(f"发现数据库表: {tables}")
            
            messages = []
            if 'MSG' in tables:
                messages = self._extract_from_msg_table(cursor)
            
            conn.close()
            return messages
            
        except sqlite3.DatabaseError as e:
            self.logger.error(f"数据库可能已加密: {e}")
            return []
        except Exception as e:
            self.logger.error(f"读取数据库时出错: {e}")
            return []
    
    def _is_file_locked(self, file_path: str) -> bool:
        """检查文件是否被锁定"""
        try:
            with open(file_path, 'r+b') as f:
                pass
            return False
        except IOError:
            return True
    
    def _get_database_tables(self, cursor) -> List[str]:
        """获取数据库表列表"""
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        return [row[0] for row in cursor.fetchall()]
    
    def _extract_from_msg_table(self, cursor) -> List[Dict]:
        """从MSG表提取消息"""
        try:
            # 获取表结构
            cursor.execute("PRAGMA table_info(MSG);")
            columns = [row[1] for row in cursor.fetchall()]
            self.logger.info(f"MSG表字段: {columns}")
            
            # 尝试提取消息
            query = "SELECT * FROM MSG LIMIT 10;"  # 限制数量避免过载
            cursor.execute(query)
            rows = cursor.fetchall()
            
            messages = []
            for row in rows:
                # 这里需要根据实际表结构解析
                # 注意：实际的微信数据库结构可能很复杂
                message_data = dict(zip(columns, row))
                messages.append({
                    'raw_data': message_data,
                    'source': 'wechat_database',
                    'note': '需要进一步解析'
                })
            
            return messages
            
        except Exception as e:
            self.logger.error(f"从MSG表提取数据时出错: {e}")
            return []
    
    def export_to_standard_format(self, messages: List[Dict], output_path: str):
        """导出为标准格式"""
        try:
            export_data = {
                'source': 'windows_wechat',
                'export_time': datetime.now().isoformat(),
                'message_count': len(messages),
                'messages': messages
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"已导出 {len(messages)} 条消息到 {output_path}")
            
        except Exception as e:
            self.logger.error(f"导出数据时出错: {e}")

def main():
    """主函数 - 演示用法"""
    extractor = WindowsWeChatExtractor()
    
    print("=== Windows微信聊天记录提取器 ===")
    print("1. 扫描微信账户")
    print("2. 从文本文件导入")
    print("3. 尝试数据库读取（实验性）")
    
    choice = input("请选择功能 (1-3): ")
    
    if choice == '1':
        accounts = extractor.scan_wechat_accounts()
        print(f"发现 {len(accounts)} 个微信账户:")
        for account in accounts:
            print(f"  - {account['wxid']}: {len(account['db_files'])} 个数据库文件")
    
    elif choice == '2':
        file_path = input("请输入文本文件路径: ")
        messages = extractor.extract_from_text_export(file_path)
        if messages:
            output_path = "wechat_messages.json"
            extractor.export_to_standard_format(messages, output_path)
    
    elif choice == '3':
        db_path = input("请输入数据库文件路径: ")
        messages = extractor.attempt_database_read(db_path)
        if messages:
            output_path = "wechat_db_messages.json"
            extractor.export_to_standard_format(messages, output_path)

if __name__ == "__main__":
    main()