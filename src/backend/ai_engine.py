import requests
import json
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class QwenAI:
    def __init__(self, api_key=None):
        # 优先使用传入的API密钥，其次使用环境变量，最后尝试从文件读取
        if api_key is None:
            api_key = os.getenv('QWEN_API_KEY')
            
        # 如果环境变量中没有，尝试从文件读取
        if api_key is None or api_key == "":
            api_key_path = os.path.join(os.path.dirname(__file__), 'api_key.txt')
            if os.path.exists(api_key_path):
                with open(api_key_path, 'r') as f:
                    api_key = f.read().strip()
        
        self.api_key = api_key
        self.api_url = os.getenv('QWEN_API_URL') or "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
        self.model = os.getenv('QWEN_MODEL') or "qwen-max"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def generate_summary(self, chat_history, query=None):
        """生成聊天记录摘要"""
        # 构建提示词
        if query:
            prompt = f"以下是一段聊天记录，请根据问题'{query}'提取相关信息并总结：\n\n{chat_history}"
        else:
            prompt = f"以下是一段聊天记录，请提取其中的关键信息，包括但不限于：商品名称、数量、价格、发货时间、客户需求等，并以结构化方式呈现：\n\n{chat_history}"
        
        # 构建请求数据
        payload = {
            "model": self.model,
            "input": {
                "messages": [
                    {"role": "system", "content": "你是一个专业的聊天记录分析助手，擅长从对话中提取关键信息并生成结构化摘要。"},
                    {"role": "user", "content": prompt}
                ]
            },
            "parameters": {}
        }
        
        # 发送请求
        response = requests.post(self.api_url, headers=self.headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            return result['output']['text']
        else:
            return f"API调用失败: {response.status_code} - {response.text}"