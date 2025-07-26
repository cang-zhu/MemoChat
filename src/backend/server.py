from flask import Flask, request, jsonify
import os
import pandas as pd
from datetime import datetime
import json
from dotenv import load_dotenv
from parser import ChatParser
from ai_engine import QwenAI
from chat_extractor_manager import ChatExtractorManager
from privacy_manager import PrivacyManager

# 加载环境变量
load_dotenv()

app = Flask(__name__)

# 从环境变量获取API密钥
api_key = os.getenv('QWEN_API_KEY')
ai_engine = QwenAI(api_key=api_key)

# 初始化提取管理器和隐私管理器
extractor_manager = ChatExtractorManager()
privacy_manager = PrivacyManager()

@app.route('/api/load-chat', methods=['POST'])
def load_chat():
    data = request.json
    file_path = data.get('file_path')
    
    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404
    
    parser = ChatParser(file_path=file_path)
    chat_df = parser.auto_detect_and_parse()
    
    # 获取联系人列表
    contacts = parser.get_contacts()
    
    # 转换为JSON格式返回
    chat_data = chat_df.to_dict('records')
    for item in chat_data:
        item['timestamp'] = item['timestamp'].isoformat()
    
    return jsonify({
        'chat_data': chat_data,
        'contacts': contacts
    })

@app.route('/api/filter-chat', methods=['POST'])
def filter_chat():
    data = request.json
    chat_data = data.get('chat_data', [])
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    sender = data.get('sender')
    
    # 转换回DataFrame
    df = pd.DataFrame(chat_data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # 创建解析器实例
    parser = ChatParser()
    
    # 应用过滤
    if start_time and end_time:
        start_time = datetime.fromisoformat(start_time)
        end_time = datetime.fromisoformat(end_time)
        df = parser.filter_by_time(df, start_time, end_time)
    
    if sender:
        df = parser.filter_by_sender(df, sender)
    
    # 转换为JSON格式返回
    filtered_data = df.to_dict('records')
    for item in filtered_data:
        item['timestamp'] = item['timestamp'].isoformat()
    
    return jsonify({'filtered_data': filtered_data})

@app.route('/api/generate-summary', methods=['POST'])
def generate_summary():
    data = request.json
    chat_data = data.get('chat_data', [])
    query = data.get('query')
    
    # 转换回DataFrame
    df = pd.DataFrame(chat_data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # 创建解析器实例并格式化聊天记录
    parser = ChatParser()
    formatted_chat = parser.format_for_ai(df)
    
    # 生成摘要
    summary = ai_engine.generate_summary(formatted_chat, query)
    
    return jsonify({'summary': summary})

@app.route('/api/export-summary', methods=['POST'])
def export_summary():
    data = request.json
    summary = data.get('summary')
    export_path = data.get('export_path')
    
    if not export_path:
        export_path = os.getenv('DEFAULT_EXPORT_PATH') or os.path.expanduser('~/Documents')
    
    # 确保导出目录存在
    os.makedirs(export_path, exist_ok=True)
    
    # 生成文件名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_path = os.path.join(export_path, f'MemoChat_Summary_{timestamp}.txt')
    
    # 保存摘要
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(summary)
    
    return jsonify({'success': True, 'file_path': file_path})

@app.route('/api/scan-chat-accounts', methods=['POST'])
def scan_chat_accounts():
    """扫描聊天账户"""
    try:
        # 检查隐私授权
        data = request.json
        privacy_level = data.get('privacy_level', 'basic')
        
        if not privacy_manager.has_valid_consent(privacy_level):
            return jsonify({'error': '需要用户授权才能扫描聊天账户'}), 403
        
        scan_result = extractor_manager.scan_all_chat_accounts()
        return jsonify(scan_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extract-from-files', methods=['POST'])
def extract_from_files():
    """从文件提取聊天记录"""
    try:
        data = request.json
        file_configs = data.get('file_configs', [])
        privacy_level = data.get('privacy_level', 'basic')
        
        # 检查隐私授权
        if not privacy_manager.has_valid_consent(privacy_level):
            return jsonify({'error': '需要用户授权才能提取聊天记录'}), 403
        
        # 提取消息
        messages = extractor_manager.extract_from_files(file_configs)
        
        # 根据隐私级别处理数据
        if privacy_level == 'basic':
            # 基础级别：不脱敏，仅本地处理
            processed_messages = messages
        else:
            # 进阶级别：脱敏处理
            processed_messages = privacy_manager.anonymize_messages(messages)
        
        # 合并排序
        unified_messages = extractor_manager.merge_and_sort_messages(processed_messages)
        
        return jsonify({
            'messages': unified_messages,
            'message_count': len(unified_messages),
            'privacy_level': privacy_level
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extract-chat-unified', methods=['POST'])
def extract_chat_unified():
    """统一聊天记录提取接口"""
    try:
        data = request.json
        extraction_config = data.get('config', {})
        privacy_level = data.get('privacy_level', 'basic')
        
        # 检查隐私授权
        if not privacy_manager.has_valid_consent(privacy_level):
            return jsonify({'error': '需要用户授权'}), 403
        
        # 1. 扫描账户（如果需要）
        scan_result = {}
        if extraction_config.get('scan_accounts', False):
            scan_result = extractor_manager.scan_all_chat_accounts()
        
        # 2. 从文件提取
        messages = []
        if 'file_configs' in extraction_config:
            messages = extractor_manager.extract_from_files(extraction_config['file_configs'])
        
        # 3. 数据处理
        if privacy_level == 'advanced':
            messages = privacy_manager.anonymize_messages(messages)
        
        unified_messages = extractor_manager.merge_and_sort_messages(messages)
        
        # 4. 生成报告
        report = extractor_manager.generate_extraction_report(scan_result, unified_messages)
        
        return jsonify({
            'messages': unified_messages,
            'scan_result': scan_result,
            'report': report,
            'privacy_level': privacy_level
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export-summary', methods=['POST'])
def export_summary():
    data = request.json
    summary = data.get('summary')
    export_path = data.get('export_path')
    
    if not export_path:
        export_path = os.getenv('DEFAULT_EXPORT_PATH') or os.path.expanduser('~/Documents')
    
    # 确保导出目录存在
    os.makedirs(export_path, exist_ok=True)
    
    # 生成文件名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_path = os.path.join(export_path, f'MemoChat_Summary_{timestamp}.txt')
    
    # 保存摘要
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(summary)
    
    return jsonify({'success': True, 'file_path': file_path})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)