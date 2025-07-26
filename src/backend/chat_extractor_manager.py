"""
聊天记录提取管理器
统一管理微信和QQ聊天记录提取功能
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Optional
import logging

from windows_wechat import WindowsWeChatExtractor
from windows_qqchat import WindowsQQExtractor

class ChatExtractorManager:
    """聊天记录提取管理器"""
    
    def __init__(self):
        self.logger = self._setup_logger()
        self.wechat_extractor = WindowsWeChatExtractor()
        self.qq_extractor = WindowsQQExtractor()
        
    def _setup_logger(self):
        """设置日志"""
        logger = logging.getLogger('ChatExtractorManager')
        logger.setLevel(logging.INFO)
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        return logger
    
    def scan_all_chat_accounts(self) -> Dict:
        """扫描所有聊天账户"""
        result = {
            'wechat_accounts': [],
            'qq_accounts': [],
            'scan_time': datetime.now().isoformat()
        }
        
        try:
            # 扫描微信账户
            self.logger.info("正在扫描微信账户...")
            result['wechat_accounts'] = self.wechat_extractor.scan_wechat_accounts()
            
            # 扫描QQ账户
            self.logger.info("正在扫描QQ账户...")
            result['qq_accounts'] = self.qq_extractor.scan_qq_accounts()
            
            self.logger.info(f"扫描完成: 微信 {len(result['wechat_accounts'])} 个账户, "
                           f"QQ {len(result['qq_accounts'])} 个账户")
            
        except Exception as e:
            self.logger.error(f"扫描账户时出错: {e}")
        
        return result
    
    def extract_from_files(self, file_configs: List[Dict]) -> List[Dict]:
        """从多个文件中提取聊天记录"""
        all_messages = []
        
        for config in file_configs:
            file_path = config.get('file_path')
            chat_type = config.get('type', 'auto')  # wechat, qq, auto
            
            if not os.path.exists(file_path):
                self.logger.warning(f"文件不存在: {file_path}")
                continue
            
            try:
                if chat_type == 'wechat':
                    messages = self.wechat_extractor.extract_from_text_export(file_path)
                elif chat_type == 'qq':
                    messages = self.qq_extractor.extract_from_text_export(file_path)
                else:
                    # 自动检测
                    messages = self._auto_detect_and_extract(file_path)
                
                # 添加文件来源信息
                for msg in messages:
                    msg['source_file'] = file_path
                    msg['detected_type'] = chat_type
                
                all_messages.extend(messages)
                self.logger.info(f"从 {file_path} 提取到 {len(messages)} 条消息")
                
            except Exception as e:
                self.logger.error(f"处理文件 {file_path} 时出错: {e}")
        
        return all_messages
    
    def _auto_detect_and_extract(self, file_path: str) -> List[Dict]:
        """自动检测文件类型并提取"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 简单的启发式检测
            if 'wxid_' in content or '微信' in content:
                self.logger.info(f"检测到微信格式: {file_path}")
                return self.wechat_extractor.extract_from_text_export(file_path)
            elif any(keyword in content for keyword in ['QQ', 'qq.com', '腾讯']):
                self.logger.info(f"检测到QQ格式: {file_path}")
                return self.qq_extractor.extract_from_text_export(file_path)
            else:
                self.logger.warning(f"无法自动检测文件类型: {file_path}")
                # 尝试两种格式
                wechat_messages = self.wechat_extractor.extract_from_text_export(file_path)
                qq_messages = self.qq_extractor.extract_from_text_export(file_path)
                return wechat_messages if len(wechat_messages) > len(qq_messages) else qq_messages
                
        except Exception as e:
            self.logger.error(f"自动检测文件 {file_path} 时出错: {e}")
            return []
    
    def merge_and_sort_messages(self, messages: List[Dict]) -> List[Dict]:
        """合并并排序消息"""
        try:
            # 按时间戳排序
            sorted_messages = sorted(messages, key=lambda x: x.get('timestamp', ''))
            
            # 去重（基于时间戳和发送者）
            unique_messages = []
            seen = set()
            
            for msg in sorted_messages:
                key = (msg.get('timestamp'), msg.get('sender'), msg.get('message', '')[:50])
                if key not in seen:
                    seen.add(key)
                    unique_messages.append(msg)
            
            self.logger.info(f"合并排序完成: {len(messages)} -> {len(unique_messages)} 条消息")
            return unique_messages
            
        except Exception as e:
            self.logger.error(f"合并排序消息时出错: {e}")
            return messages
    
    def export_unified_format(self, messages: List[Dict], output_path: str, metadata: Dict = None):
        """导出统一格式"""
        try:
            export_data = {
                'format_version': '1.0',
                'export_time': datetime.now().isoformat(),
                'message_count': len(messages),
                'metadata': metadata or {},
                'messages': messages
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"已导出 {len(messages)} 条消息到 {output_path}")
            
        except Exception as e:
            self.logger.error(f"导出统一格式时出错: {e}")
    
    def generate_extraction_report(self, scan_result: Dict, messages: List[Dict]) -> Dict:
        """生成提取报告"""
        report = {
            'scan_summary': {
                'wechat_accounts': len(scan_result.get('wechat_accounts', [])),
                'qq_accounts': len(scan_result.get('qq_accounts', [])),
                'scan_time': scan_result.get('scan_time')
            },
            'extraction_summary': {
                'total_messages': len(messages),
                'message_sources': {},
                'time_range': self._get_time_range(messages),
                'top_senders': self._get_top_senders(messages)
            },
            'recommendations': self._generate_recommendations(scan_result, messages)
        }
        
        # 统计消息来源
        for msg in messages:
            source = msg.get('source', 'unknown')
            report['extraction_summary']['message_sources'][source] = \
                report['extraction_summary']['message_sources'].get(source, 0) + 1
        
        return report
    
    def _get_time_range(self, messages: List[Dict]) -> Dict:
        """获取时间范围"""
        if not messages:
            return {}
        
        timestamps = [msg.get('timestamp') for msg in messages if msg.get('timestamp')]
        if not timestamps:
            return {}
        
        return {
            'earliest': min(timestamps),
            'latest': max(timestamps)
        }
    
    def _get_top_senders(self, messages: List[Dict], top_n: int = 10) -> List[Dict]:
        """获取发言最多的用户"""
        sender_counts = {}
        for msg in messages:
            sender = msg.get('sender', 'Unknown')
            sender_counts[sender] = sender_counts.get(sender, 0) + 1
        
        sorted_senders = sorted(sender_counts.items(), key=lambda x: x[1], reverse=True)
        return [{'sender': sender, 'message_count': count} 
                for sender, count in sorted_senders[:top_n]]
    
    def _generate_recommendations(self, scan_result: Dict, messages: List[Dict]) -> List[str]:
        """生成建议"""
        recommendations = []
        
        if len(messages) == 0:
            recommendations.append("未提取到任何消息，建议检查文件格式或路径")
        
        if len(scan_result.get('wechat_accounts', [])) > 0:
            recommendations.append("发现微信账户，建议使用微信官方导出功能获取完整聊天记录")
        
        if len(scan_result.get('qq_accounts', [])) > 0:
            recommendations.append("发现QQ账户，建议使用QQ聊天记录导出工具")
        
        recommendations.append("为保护隐私，建议定期清理导出的聊天记录文件")
        recommendations.append("使用前请确保已获得相关人员同意")
        
        return recommendations

def main():
    """主函数 - 演示完整流程"""
    manager = ChatExtractorManager()
    
    print("=== 聊天记录提取管理器 ===")
    
    # 1. 扫描账户
    print("\n1. 扫描聊天账户...")
    scan_result = manager.scan_all_chat_accounts()
    
    # 2. 从文件提取（示例）
    print("\n2. 从文件提取聊天记录...")
    file_configs = [
        {'file_path': 'wechat_export.txt', 'type': 'wechat'},
        {'file_path': 'qq_export.txt', 'type': 'qq'},
    ]
    
    messages = manager.extract_from_files(file_configs)
    
    # 3. 合并排序
    print("\n3. 合并排序消息...")
    unified_messages = manager.merge_and_sort_messages(messages)
    
    # 4. 导出结果
    print("\n4. 导出结果...")
    manager.export_unified_format(unified_messages, 'unified_chat_export.json')
    
    # 5. 生成报告
    print("\n5. 生成提取报告...")
    report = manager.generate_extraction_report(scan_result, unified_messages)
    
    with open('extraction_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print("提取完成！")

if __name__ == "__main__":
    main()