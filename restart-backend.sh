#!/bin/bash

# 快速重启后端服务脚本

set -e

echo "🔄 重启 MideastSim 后端服务..."
echo ""

# 杀掉旧进程
echo "📛 停止旧进程..."
pkill -f mideastsim-backend 2>/dev/null || true
sleep 1

# 编译
echo "🔨 编译后端..."
cd /home/node/.openclaw/workspace/mideastsim/backend
go build -o mideastsim-backend main.go database.go auth.go player.go rule_engine.go forward.go forward_action.go middleware.go agent_memory.go agent_memory_handlers.go offline_ai.go history_playback.go telegram.go debug_handler.go

if [ $? -eq 0 ]; then
    echo "✅ 编译成功"
else
    echo "❌ 编译失败"
    exit 1
fi

# 启动新进程
echo "🚀 启动新进程..."
./mideastsim-backend > backend.log 2>&1 &
sleep 2

# 检查是否启动成功
if pgrep -f mideastsim-backend > /dev/null; then
    echo "✅ 后端服务已启动"
    echo ""
    echo "📊 当前配置的 Agents:"
    grep "agentList.*=" forward.go | sed 's/.*agentList :=/   /'
    echo ""
    echo "📖 查看日志：tail -f backend.log"
    echo "🛑 停止服务：./restart-backend.sh"
else
    echo "❌ 启动失败，请检查日志"
    tail -20 backend.log
fi
