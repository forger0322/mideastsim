#!/bin/bash

# MideastSim Agent 会话管理脚本
# 用于创建、管理和维护 OpenClaw Agent 会话

set -e

WORKSPACE="/home/node/.openclaw/workspace/mideastsim"
AGENTS_DIR="$WORKSPACE/agents"
SESSION_CONFIG="$WORKSPACE/agent_sessions.json"
OPENCLAW_GATEWAY="http://127.0.0.1:18789"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 读取 SOUL.md 和 KNOWLEDGE.md
read_agent_files() {
    local agent_id=$1
    local soul_file="$AGENTS_DIR/$agent_id/SOUL.md"
    local knowledge_file="$AGENTS_DIR/$agent_id/KNOWLEDGE.md"
    
    if [ ! -f "$soul_file" ]; then
        log_error "SOUL.md not found: $soul_file"
        return 1
    fi
    
    local system_prompt=$(cat "$soul_file")
    
    if [ -f "$knowledge_file" ]; then
        local knowledge=$(cat "$knowledge_file")
        system_prompt="$system_prompt

## 知识库
$knowledge"
    fi
    
    echo "$system_prompt"
}

# 创建 Agent 会话
create_agent_session() {
    local agent_id=$1
    local label=$2
    local task=$3
    
    log_info "创建 Agent 会话：$agent_id"
    
    # 使用 OpenClaw CLI 或 API 创建会话
    # 这里使用 sessions_spawn 的等效 API 调用
    curl -s -X POST "$OPENCLAW_GATEWAY/v1/sessions" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$label\",
            \"agent_id\": \"$agent_id\",
            \"task\": \"$task\",
            \"mode\": \"session\"
        }" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_info "✓ Agent $agent_id 会话创建成功"
        return 0
    else
        log_error "✗ Agent $agent_id 会话创建失败"
        return 1
    fi
}

# 检查会话是否存在
check_session() {
    local session_key=$1
    
    curl -s "$OPENCLAW_GATEWAY/v1/sessions" | grep -q "$session_key"
    return $?
}

# 列出所有 Agent 会话
list_sessions() {
    log_info "当前 Agent 会话列表:"
    curl -s "$OPENCLAW_GATEWAY/v1/sessions" | jq '.' 2>/dev/null || echo "无法获取会话列表"
}

# 清理僵尸会话
cleanup_sessions() {
    log_info "清理僵尸会话..."
    # 实现清理逻辑
}

# 主函数
main() {
    case "${1:-}" in
        create)
            if [ -z "${2:-}" ]; then
                log_error "用法：$0 create <agent_id>"
                exit 1
            fi
            create_agent_session "$2" "${3:-$2}" "${4:-}"
            ;;
        list)
            list_sessions
            ;;
        cleanup)
            cleanup_sessions
            ;;
        *)
            echo "用法：$0 {create|list|cleanup} [args...]"
            echo ""
            echo "命令:"
            echo "  create <agent_id> [label] [task]  创建 Agent 会话"
            echo "  list                              列出所有会话"
            echo "  cleanup                           清理僵尸会话"
            exit 1
            ;;
    esac
}

main "$@"
