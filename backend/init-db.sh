#!/bin/bash
# 初始化 SQLite 数据库

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="$SCRIPT_DIR/mideastsim.db"
SCHEMA_PATH="$SCRIPT_DIR/schema.sql"

echo "🗄️  初始化 MideastSim 数据库..."
echo "📍 数据库路径：$DB_PATH"

# 如果数据库已存在，询问是否删除
if [ -f "$DB_PATH" ]; then
    echo "⚠️  数据库已存在，是否删除重建？(y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm "$DB_PATH"
        echo "✅ 旧数据库已删除"
    else
        echo "ℹ️  跳过数据库创建"
        exit 0
    fi
fi

# 创建数据库
if [ -f "$SCHEMA_PATH" ]; then
    sqlite3 "$DB_PATH" < "$SCHEMA_PATH"
    if [ $? -eq 0 ]; then
        echo "✅ 数据库创建成功！"
        
        # 验证数据
        echo ""
        echo "📊 数据验证："
        echo "   国家数量：$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM roles;")"
        echo "   关系记录：$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM relations;")"
        echo "   同盟数量：$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM alliances;")"
    else
        echo "❌ 数据库创建失败"
        exit 1
    fi
else
    echo "❌ 找不到 schema.sql 文件"
    exit 1
fi
