#!/usr/bin/env node

/**
 * MideastSim Agent 会话初始化脚本
 * 创建所有国家 Agent 和 PM Agent 的持久化会话
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const WORKSPACE = '/home/node/.openclaw/workspace/mideastsim';
const AGENTS_DIR = path.join(WORKSPACE, 'agents');
const SESSION_CONFIG = path.join(WORKSPACE, 'agent_sessions.json');
const OPENCLAW_HOST = '127.0.0.1';
const OPENCLAW_PORT = 18789;

// Agent 列表
const AGENTS = [
    { id: 'pm', label: 'PM Analyst', role: 'pm' },
    { id: 'trump', label: 'USA - Trump', role: 'usa' },
    { id: 'mujtaba', label: 'Iran - Mujtaba', role: 'iran' },
    { id: 'netanyahu', label: 'Israel - Netanyahu', role: 'israel' },
    { id: 'syria', label: 'Syria - Assad', role: 'syria' },
    { id: 'saudi_arabia', label: 'Saudi Arabia', role: 'saudi' },
    { id: 'russia', label: 'Russia - Putin', role: 'russia' },
    { id: 'iraq', label: 'Iraq', role: 'iraq' },
    { id: 'turkey', label: 'Turkey - Erdogan', role: 'turkey' },
    { id: 'egypt', label: 'Egypt - Sisi', role: 'egypt' },
    { id: 'uae', label: 'UAE', role: 'uae' },
    { id: 'qatar', label: 'Qatar', role: 'qatar' },
    { id: 'lebanon', label: 'Lebanon', role: 'lebanon' },
    { id: 'kuwait', label: 'Kuwait', role: 'kuwait' },
    { id: 'bahrain', label: 'Bahrain', role: 'bahrain' }
];

// HTTP 请求辅助函数
function httpRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(30000);
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// 读取 Agent 的 SOUL.md 和 KNOWLEDGE.md
function readAgentFiles(agentId) {
    const soulPath = path.join(AGENTS_DIR, agentId, 'SOUL.md');
    const knowledgePath = path.join(AGENTS_DIR, agentId, 'KNOWLEDGE.md');
    
    let systemPrompt = '';
    
    try {
        systemPrompt = fs.readFileSync(soulPath, 'utf8');
        console.log(`✓ 读取 ${agentId}/SOUL.md`);
    } catch (e) {
        console.error(`✗ 读取 ${agentId}/SOUL.md 失败：${e.message}`);
        return null;
    }
    
    if (fs.existsSync(knowledgePath)) {
        try {
            const knowledge = fs.readFileSync(knowledgePath, 'utf8');
            systemPrompt += '\n\n## 知识库\n' + knowledge;
            console.log(`✓ 读取 ${agentId}/KNOWLEDGE.md`);
        } catch (e) {
            console.warn(`⚠ 读取 ${agentId}/KNOWLEDGE.md 失败：${e.message}`);
        }
    }
    
    return systemPrompt;
}

// 创建 Agent 会话
async function createAgentSession(agent) {
    console.log(`\n📋 创建 Agent: ${agent.id} (${agent.label})`);
    
    const systemPrompt = readAgentFiles(agent.id);
    if (!systemPrompt) {
        console.error(`✗ ${agent.id} 系统提示读取失败，跳过`);
        return null;
    }
    
    // 截断系统提示（避免过长）
    const maxPromptLength = 50000;
    const truncatedPrompt = systemPrompt.length > maxPromptLength 
        ? systemPrompt.substring(0, maxPromptLength) + '\n\n...(truncated)'
        : systemPrompt;
    
    console.log(`📝 系统提示长度：${truncatedPrompt.length} 字符`);
    
    // 使用 sessions_spawn API 创建会话
    // 注意：这里使用简化的任务描述，实际系统提示通过配置文件注入
    const sessionKey = `agent:${agent.id}:main`;
    
    const requestBody = {
        task: `你是 ${agent.label}。请按照 SOUL.md 中的角色设定和 KNOWLEDGE.md 中的知识库进行响应。

核心规则:
1. 不响应自己的消息 (检查 msg.from)
2. 24 小时内同一事件只响应 1 次
3. 每天最多 3 次外交声明
4. 保持角色一致性

等待事件输入...`,
        label: `${agent.id}-agent`,
        mode: 'session',
        runtime: 'subagent',
        cleanup: 'keep'
    };
    
    try {
        const postData = JSON.stringify(requestBody);
        const result = await httpRequest({
            hostname: OPENCLAW_HOST,
            port: OPENCLAW_PORT,
            path: '/v1/sessions/spawn',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        }, postData);
        
        if (result.status >= 200 && result.status < 300) {
            console.log(`✓ ${agent.id} 会话创建成功: ${JSON.stringify(result.data.sessionKey || 'N/A')}`);
            return {
                sessionKey: result.data.childSessionKey || sessionKey,
                status: 'active',
                createdAt: new Date().toISOString()
            };
        } else {
            console.error(`✗ ${agent.id} 会话创建失败：HTTP ${result.status}`);
            console.error(`响应：${JSON.stringify(result.data)}`);
            return {
                sessionKey: sessionKey,
                status: 'failed',
                error: `HTTP ${result.status}`
            };
        }
    } catch (e) {
        console.error(`✗ ${agent.id} 会话创建异常：${e.message}`);
        return {
            sessionKey: sessionKey,
            status: 'error',
            error: e.message
        };
    }
}

// 保存会话配置
function saveSessionConfig(config) {
    fs.writeFileSync(SESSION_CONFIG, JSON.stringify(config, null, 2));
    console.log(`\n💾 会话配置已保存：${SESSION_CONFIG}`);
}

// 主函数
async function main() {
    console.log('🚀 MideastSim Agent 会话初始化');
    console.log('================================\n');
    
    // 加载现有配置
    let sessionConfig = {};
    if (fs.existsSync(SESSION_CONFIG)) {
        try {
            sessionConfig = JSON.parse(fs.readFileSync(SESSION_CONFIG, 'utf8'));
            console.log('📖 加载现有会话配置');
        } catch (e) {
            console.warn('⚠ 无法读取现有配置，将创建新配置');
        }
    }
    
    // 创建所有 Agent 会话
    const results = {};
    
    for (const agent of AGENTS) {
        const result = await createAgentSession(agent);
        if (result) {
            results[agent.id] = {
                sessionKey: result.sessionKey,
                label: agent.label,
                status: result.status,
                createdAt: result.createdAt,
                lastActive: null
            };
            
            // 更新配置
            sessionConfig[agent.id] = results[agent.id];
            
            // 每个 Agent 之间延迟 1 秒，避免速率限制
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // 保存配置
    saveSessionConfig(sessionConfig);
    
    // 打印摘要
    console.log('\n================================');
    console.log('📊 初始化摘要');
    console.log('================================');
    
    const successCount = Object.values(results).filter(r => r.status === 'active').length;
    const failedCount = Object.values(results).filter(r => r.status === 'failed' || r.status === 'error').length;
    
    console.log(`✅ 成功：${successCount}`);
    console.log(`❌ 失败：${failedCount}`);
    console.log(`📋 总计：${Object.keys(results).length}`);
    
    if (failedCount > 0) {
        console.log('\n⚠️ 失败的 Agent:');
        Object.entries(results).forEach(([id, r]) => {
            if (r.status === 'failed' || r.status === 'error') {
                console.log(`  - ${id}: ${r.error || '未知错误'}`);
            }
        });
    }
    
    console.log('\n✨ 初始化完成！');
    console.log(`\n后端配置提示:`);
    console.log(`1. 读取 ${SESSION_CONFIG} 获取 session keys`);
    console.log(`2. 更新 backend/forward.go 中的 sendToAgent 函数`);
    console.log(`3. 重启后端服务`);
}

// 运行
main().catch(console.error);
