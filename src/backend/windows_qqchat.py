"""
Windows QQ聊天记录处理模块
支持多种获取方式：文件导入、路径扫描、数据库读取（实验性）
"""

import os
import sqlite3
import json
import re
from datetime import datetime
from pathlib import Path
import logging
from typing import List, Dict, Optional

class WindowsQQExtractor:
    """Windows QQ聊天记录提取器"""
    
    def __init__(self, privacy_manager=None):
        self.logger = self._setup_logger()
        self.qq_paths = self._get_default_qq_paths()
        self.privacy_manager = privacy_manager
        
    def _setup_logger(self):
        """设置日志"""
        logger = logging.getLogger('WindowsQQ')
        logger.setLevel(logging.INFO)
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        return logger
    
    def _get_default_qq_paths(self) -> List[str]:
        """获取默认QQ安装路径"""
        username = os.getenv('USERNAME', '')
        possible_paths = [
            f"C:/Users/{username}/Documents/Tencent Files",
            f"C:/Users/{username}/AppData/Roaming/Tencent/QQ",
            "D:/Tencent Files",
            "E:/Tencent Files"
        ]
        return [path for path in possible_paths if os.path.exists(path)]
    
    def scan_qq_accounts(self, privacy_level: str = 'basic') -> List[Dict]:
        """扫描QQ账户目录"""
        accounts = []
        
        try:
            # 记录数据访问
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_scan_start', privacy_level, 0)
            
            for base_path in self.qq_paths:
                try:
                    for item in os.listdir(base_path):
                        account_path = os.path.join(base_path, item)
                        if os.path.isdir(account_path) and item.isdigit():
                            account_info = self._analyze_qq_directory(account_path, item, privacy_level)
                            if account_info:
                                accounts.append(account_info)
                except PermissionError:
                    self.logger.warning(f"无权限访问路径: {base_path}")
                except Exception as e:
                    self.logger.error(f"扫描路径 {base_path} 时出错: {e}")
            
            # 记录扫描结果
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_scan_complete', privacy_level, len(accounts))
            
            self.logger.info(f"QQ账户扫描完成，发现 {len(accounts)} 个账户")
            
        except Exception as e:
            self.logger.error(f"QQ账户扫描过程中发生错误: {e}")
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_scan_error', privacy_level, 0)
        
        return accounts
    
    def _analyze_qq_directory(self, account_path: str, qq_number: str, privacy_level: str = 'basic') -> Optional[Dict]:
        """分析QQ账户目录结构"""
        try:
            # QQ数据库通常在 Msg3.0.db 或类似文件中
            db_files = []
            for root, dirs, files in os.walk(account_path):
                for file in files:
                    if file.endswith('.db') and 'Msg' in file:
                        db_files.append(os.path.join(root, file))
            
            account_info = {
                'qq_number': qq_number if privacy_level == 'basic' else f"QQ用户{hash(qq_number) % 1000}",
                'account_path': account_path if privacy_level == 'basic' else '***',
                'db_files': db_files if privacy_level == 'basic' else [f"数据库文件{i+1}" for i in range(len(db_files))],
                'db_count': len(db_files),
                'last_modified': os.path.getmtime(account_path)
            }
            
            return account_info
            
        except Exception as e:
            self.logger.error(f"分析QQ目录 {account_path} 时出错: {e}")
            return None
    
    def extract_from_text_export(self, file_path: str, privacy_level: str = 'basic') -> List[Dict]:
        """从文本导出文件中提取聊天记录"""
        try:
            # 验证文件
            if not os.path.exists(file_path):
                self.logger.error(f"文件不存在: {file_path}")
                return []
            
            # 检查文件大小
            file_size = os.path.getsize(file_path)
            if file_size > 100 * 1024 * 1024:  # 100MB限制
                self.logger.warning(f"文件过大 ({file_size / 1024 / 1024:.1f}MB): {file_path}")
                return []
            
            # 记录数据访问
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_text_extract_start', privacy_level, 0)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            messages = self._parse_qq_text_format(content, privacy_level)
            
            # 记录实际提取数量
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_text_extract_complete', privacy_level, len(messages))
            
            self.logger.info(f"从QQ文本文件提取到 {len(messages)} 条消息")
            return messages
            
        except UnicodeDecodeError:
            self.logger.error(f"文件编码错误，尝试其他编码: {file_path}")
            try:
                with open(file_path, 'r', encoding='gbk') as f:
                    content = f.read()
                messages = self._parse_qq_text_format(content, privacy_level)
                self.logger.info(f"使用GBK编码成功提取 {len(messages)} 条消息")
                return messages
            except Exception as e:
                self.logger.error(f"使用GBK编码仍然失败: {e}")
                return []
        except Exception as e:
            self.logger.error(f"读取QQ文本文件 {file_path} 时出错: {e}")
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_text_extract_error', privacy_level, 0)
            return []
    
    def _parse_qq_text_format(self, content: str, privacy_level: str = 'basic') -> List[Dict]:
        """解析QQ文本格式"""
        messages = []
        
        try:
            # QQ导出格式可能是: 2024-01-01 12:00:00 昵称(QQ号)\n消息内容
            pattern = r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.+?)\((\d+)\)\n(.+?)(?=\n\d{4}-\d{2}-\d{2}|\n$)'
            
            matches = re.findall(pattern, content, re.DOTALL)
            
            sender_mapping = {}  # 用于隐私级别的发送者映射
            
            for match in matches:
                timestamp_str, nickname, qq_number, message = match
                try:
                    timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                    
                    # 根据隐私级别处理发送者信息
                    if privacy_level == 'basic':
                        sender_name = nickname.strip()
                        sender_qq = qq_number
                    else:
                        # 进阶级别：匿名化处理
                        if nickname not in sender_mapping:
                            sender_mapping[nickname] = f"QQ用户{len(sender_mapping) + 1}"
                        sender_name = sender_mapping[nickname]
                        sender_qq = '***'
                    
                    # 根据隐私级别处理消息内容
                    processed_message = message.strip()
                    if privacy_level == 'advanced' and self.privacy_manager:
                        processed_message = self.privacy_manager._anonymize_content(processed_message)
                    
                    messages.append({
                        'timestamp': timestamp.isoformat(),
                        'sender': sender_name,
                        'sender_qq': sender_qq,
                        'message': processed_message,
                        'type': 'text',
                        'source': 'qq_text_export',
                        'privacy_level': privacy_level
                    })
                except ValueError as e:
                    self.logger.warning(f"时间戳解析失败: {timestamp_str}, 错误: {e}")
                    continue
                except Exception as e:
                    self.logger.warning(f"解析消息时出错: {e}")
                    continue
            
            self.logger.info(f"成功解析 {len(messages)} 条QQ消息")
            
        except Exception as e:
            self.logger.error(f"解析QQ文本格式时出错: {e}")
        
        return messages
    
    def attempt_database_read(self, db_path: str, privacy_level: str = 'basic') -> List[Dict]:
        """尝试读取QQ数据库文件（高难度实验性功能）"""
        self.logger.warning("⚠️  QQ数据库读取极其复杂，需要动态密钥解密")
        self.logger.warning("⚠️  此功能仅供研究使用，请确保合规性")
        
        try:
            # 记录数据访问尝试
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_db_read_attempt', privacy_level, 0)
            
            if not os.path.exists(db_path):
                self.logger.error(f"QQ数据库文件不存在: {db_path}")
                return []
            
            # 检查文件是否被锁定
            if self._is_file_locked(db_path):
                self.logger.warning("QQ数据库文件被QQ进程锁定，请关闭QQ后重试")
                return []
            
            # 检查文件大小
            file_size = os.path.getsize(db_path)
            if file_size > 500 * 1024 * 1024:  # 500MB限制
                self.logger.warning(f"QQ数据库文件过大 ({file_size / 1024 / 1024:.1f}MB)，跳过处理")
                return []
            
            # QQ数据库通常是加密的，需要密钥
            self.logger.error("QQ数据库已加密，需要动态获取解密密钥")
            self.logger.info("建议使用以下替代方案:")
            self.logger.info("1. 使用QQ官方导出功能")
            self.logger.info("2. 使用第三方QQ聊天记录导出工具")
            self.logger.info("3. 手动复制粘贴聊天内容")
            
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_db_read_failed', privacy_level, 0)
            
            return []
            
        except Exception as e:
            self.logger.error(f"尝试读取QQ数据库时出错: {e}")
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_db_read_error', privacy_level, 0)
            return []
    
    def _is_file_locked(self, file_path: str) -> bool:
        """检查文件是否被锁定"""
        try:
            with open(file_path, 'r+b') as f:
                pass
            return False
        except IOError:
            return True
        except Exception as e:
            self.logger.warning(f"检查文件锁定状态时出错: {e}")
            return True
    
    def extract_from_qq_backup(self, backup_path: str, privacy_level: str = 'basic') -> List[Dict]:
        """从QQ备份文件中提取（如果有的话）"""
        try:
            # 记录数据访问
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_backup_extract_start', privacy_level, 0)
            
            if not os.path.exists(backup_path):
                self.logger.error(f"QQ备份文件不存在: {backup_path}")
                return []
            
            # QQ可能有不同的备份格式
            if backup_path.endswith('.bak'):
                messages = self._parse_qq_backup_file(backup_path, privacy_level)
            elif backup_path.endswith('.txt'):
                messages = self.extract_from_text_export(backup_path, privacy_level)
            else:
                self.logger.warning(f"不支持的QQ备份文件格式: {backup_path}")
                return []
            
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_backup_extract_complete', privacy_level, len(messages))
            
            return messages
                
        except Exception as e:
            self.logger.error(f"读取QQ备份文件时出错: {e}")
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_backup_extract_error', privacy_level, 0)
            return []
    
    def _parse_qq_backup_file(self, backup_path: str, privacy_level: str = 'basic') -> List[Dict]:
        """解析QQ备份文件"""
        # 这里需要根据实际的QQ备份格式来实现
        self.logger.warning("QQ备份文件解析功能待实现")
        return []
    
    def export_to_standard_format(self, messages: List[Dict], output_path: str, privacy_level: str = 'basic'):
        """导出为标准格式"""
        try:
            # 记录导出操作
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_export_start', privacy_level, len(messages))
            
            export_data = {
                'source': 'windows_qq',
                'export_time': datetime.now().isoformat(),
                'message_count': len(messages),
                'privacy_level': privacy_level,
                'data_hash': self.privacy_manager.generate_data_hash(messages) if self.privacy_manager else None,
                'messages': messages
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"已导出 {len(messages)} 条QQ消息到 {output_path}")
            
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_export_complete', privacy_level, len(messages))
            
        except Exception as e:
            self.logger.error(f"导出QQ数据时出错: {e}")
            if self.privacy_manager:
                self.privacy_manager.log_data_access('qq_export_error', privacy_level, 0)

def main():
    """主函数 - 演示用法"""
    extractor = WindowsQQExtractor()
    
    print("=== Windows QQ聊天记录提取器 ===")
    print("1. 扫描QQ账户")
    print("2. 从文本文件导入")
    print("3. 从备份文件导入")
    print("4. 尝试数据库读取（实验性）")
    
    choice = input("请选择功能 (1-4): ")
    
    if choice == '1':
        accounts = extractor.scan_qq_accounts()
        print(f"发现 {len(accounts)} 个QQ账户:")
        for account in accounts:
            print(f"  - QQ {account['qq_number']}: {len(account['db_files'])} 个数据库文件")
    
    elif choice == '2':
        file_path = input("请输入文本文件路径: ")
        messages = extractor.extract_from_text_export(file_path)
        if messages:
            output_path = "qq_messages.json"
            extractor.export_to_standard_format(messages, output_path)
    
    elif choice == '3':
        backup_path = input("请输入备份文件路径: ")
        messages = extractor.extract_from_qq_backup(backup_path)
        if messages:
            output_path = "qq_backup_messages.json"
            extractor.export_to_standard_format(messages, output_path)
    
    elif choice == '4':
        db_path = input("请输入数据库文件路径: ")
        messages = extractor.attempt_database_read(db_path)

if __name__ == "__main__":
    main()