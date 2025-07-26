# 安装MemoChat所需依赖
#!/bin/bash

echo "🚀 开始安装MemoChat依赖..."

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装Python3"
    exit 1
fi

# 检查Node.js是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm 未安装，请先安装Node.js"
    exit 1
fi

echo "✅ 检测到Python3和Node.js"

# 创建虚拟环境
echo "📦 创建Python虚拟环境..."
python3 -m venv venv

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 升级pip
echo "⬆️ 升级pip..."
pip install --upgrade pip

# 安装Python依赖
echo "📚 安装Python依赖..."
pip install -r src/backend/requirements.txt

# 安装Node.js依赖
echo "📦 安装Node.js依赖..."
npm install

echo "🎉 所有依赖安装完成！"
echo ""
echo "使用方法："
echo "1. 激活虚拟环境: source venv/bin/activate"
echo "2. 启动应用: npm start"
echo "3. 退出虚拟环境: deactivate"