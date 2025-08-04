from flask import Flask, request, jsonify
import os
import pandas as pd
from datetime import datetime
import json
from flask_cors import CORS
from dotenv import load_dotenv

# 加载环境变量，指定正确的.env文件路径
env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(env_path)

from parser import ChatParser
from ai_engine import QwenAI
from chat_extractor_manager import ChatExtractorManager
from privacy_manager import PrivacyManager

app = Flask(__name__)
CORS(app)  # 启用CORS支持

# 从环境变量获取API密钥
api_key = os.getenv('QWEN_API_KEY')
ai_engine = QwenAI(api_key=api_key)

# 初始化提取管理器和隐私管理器
extractor_manager = ChatExtractorManager()
privacy_manager = PrivacyManager()

@app.route('/')
def index():
    return jsonify({'status': 'MemoChat Backend Server is running', 'version': '1.0'})

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/api/load-chat', methods=['POST'])
def load_chat():
    try:
        data = request.json
        file_path = data.get('file_path')
        
        print(f"[DEBUG] 接收到文件路径: {file_path}")
        
        if not file_path or not os.path.exists(file_path):
            print(f"[ERROR] 文件不存在: {file_path}")
            return jsonify({'error': 'File not found'}), 404
        
        print(f"[DEBUG] 开始解析文件...")
        parser = ChatParser(file_path=file_path)
        
        # 添加调试信息
        print(f"[DEBUG] 文件内容长度: {len(parser.raw_text)}")
        print(f"[DEBUG] 文件前100字符: {repr(parser.raw_text[:100])}")
        
        chat_df = parser.auto_detect_and_parse()
        
        print(f"[DEBUG] 解析结果: {len(chat_df)} 条消息")
        print(f"[DEBUG] 联系人数量: {len(parser.contacts)}")
        
        # 检查是否成功解析到消息
        if chat_df.empty:
            print(f"[ERROR] 解析结果为空")
            return jsonify({'error': '无法解析聊天文件，请检查文件格式是否正确'}), 400
        
        # 获取联系人列表
        contacts = parser.get_contacts()
        
        # 转换为JSON格式返回
        chat_data = chat_df.to_dict('records')
        for item in chat_data:
            item['timestamp'] = item['timestamp'].isoformat()
        
        print(f"[DEBUG] 成功返回 {len(chat_data)} 条消息")
        
        return jsonify({
            'chat_data': chat_data,
            'contacts': contacts
        })
        
    except UnicodeDecodeError as e:
        print(f"[ERROR] 编码错误: {e}")
        return jsonify({'error': '文件编码错误，请确保文件是UTF-8编码'}), 400
    except Exception as e:
        print(f"[ERROR] 解析异常: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'解析文件时出错: {str(e)}'}), 500

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

@app.route('/api/scan-directory', methods=['POST'])
def scan_directory():
    """扫描指定目录下的聊天文件"""
    try:
        data = request.json
        directory_path = data.get('directory_path')
        
        if not directory_path:
            return jsonify({'error': '未提供目录路径'}), 400
        
        if not os.path.exists(directory_path):
            return jsonify({'error': f'目录不存在: {directory_path}'}), 404
        
        if not os.path.isdir(directory_path):
            return jsonify({'error': f'路径不是目录: {directory_path}'}), 400
        
        # 扫描目录下的文件
        files = []
        supported_extensions = ['.txt', '.csv', '.json', '.log']
        
        try:
            for root, dirs, filenames in os.walk(directory_path):
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    file_ext = os.path.splitext(filename)[1].lower()
                    
                    # 只包含支持的文件类型
                    if file_ext in supported_extensions:
                        try:
                            stat = os.stat(file_path)
                            files.append({
                                'name': filename,
                                'path': file_path,
                                'size': stat.st_size,
                                'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                'extension': file_ext
                            })
                        except (OSError, PermissionError) as e:
                            print(f"[WARNING] 无法访问文件 {file_path}: {e}")
                            continue
        
        except PermissionError:
            return jsonify({'error': f'无权限访问目录: {directory_path}'}), 403
        except Exception as e:
            return jsonify({'error': f'扫描目录时出错: {str(e)}'}), 500
        
        # 按修改时间排序（最新的在前）
        files.sort(key=lambda x: x['modified'], reverse=True)
        
        return jsonify({
            'ok': True,
            'status': 200,
            'data': {
                'directory': directory_path,
                'files': files,
                'file_count': len(files),
                'scan_time': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        print(f"[ERROR] 扫描目录异常: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'扫描目录时出错: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 6000))  # 从环境变量读取端口，默认6000
    app.run(host='127.0.0.1', port=port)
