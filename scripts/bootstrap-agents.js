#!/usr/bin/env node
/**
 * MideastSim Agent 引导脚本 - 直接操作 OpenClaw 数据目录
 * 参考: bootstrap_agents_memory.py
 * 
 * 直接创建：
 * - Agent 目录结构
 * - Session 文件 (.jsonl)
 * - Sessions 索引
 * - LCM 数据库记录
 * - openclaw.json 配置
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// OpenClaw 数据根目录
const OPENCLAW_ROOT = '/home/node/.openclaw';
const DATA_ROOT = path.join(OPENCLAW_ROOT, 'workspace');
const CONFIG_FILE = path.join(OPENCLAW_ROOT, 'openclaw.json');
const LCM_DB = path.join(OPENCLAW_ROOT, 'lcm.db');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function nowIso() {
  return new Date().toISOString().replace('+00:00', 'Z');
}

function generateUuid() {
  return crypto.randomUUID();
}

function shortId() {
  return crypto.randomBytes(4).toString('hex');
}

// 读取 openclaw.json
function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    log(`❌ 无法读取配置: ${e.message}`, 'red');
    process.exit(1);
  }
}

// 保存 openclaw.json
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

// 确保 Agent 目录结构
function ensureAgentDirs(agentId) {
  const agentBase = path.join(OPENCLAW_ROOT, 'agents', agentId);
  const agentDir = path.join(agentBase, 'agent');
  const sessionsDir = path.join(agentBase, 'sessions');
  const workspaceDir = agentId === 'main' 
    ? path.join(OPENCLAW_ROOT, 'workspace')
    : path.join(OPENCLAW_ROOT, `workspace-${agentId}`);
  
  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.mkdirSync(path.join(workspaceDir, 'memory'), { recursive: true });
  
  // 创建 IDENTITY.md
  const identityPath = path.join(workspaceDir, 'IDENTITY.md');
  if (!fs.existsSync(identityPath)) {
    fs.writeFileSync(identityPath, `# IDENTITY

- Agent ID: ${agentId}
- Initialized At (UTC): ${nowIso()}
- Purpose: MideastSim Country Agent
`, 'utf8');
  }
  
  // 创建 MEMORY.md
  const memoryPath = path.join(workspaceDir, 'MEMORY.md');
  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, `# MEMORY

- Agent ID: ${agentId}
- Type: MideastSim Country Agent
- Notes: 长期记忆入口文件
`, 'utf8');
  }
  
  return { agentDir, sessionsDir, workspaceDir };
}

// 确保 Agent 在配置中
function ensureAgentInConfig(config, agentId, name) {
  config.agents = config.agents || {};
  config.agents.list = config.agents.list || [];
  
  const existing = config.agents.list.find(a => a.id === agentId);
  if (existing) {
    return { entry: existing, created: false };
  }
  
  const entry = {
    id: agentId,
    name: name || agentId,
    workspace: `/home/node/.openclaw/workspace-${agentId}`,
    agentDir: `/home/node/.openclaw/agents/${agentId}/agent`,
    description: `MideastSim Agent: ${name || agentId}`
  };
  
  config.agents.list.push(entry);
  return { entry, created: true };
}

// 创建 session 文件
function createSessionFile(sessionFile, sessionId, cwd, provider, model, seedTask) {
  const ts = nowIso();
  const modelChangeId = shortId();
  const thinkingId = shortId();
  const snapshotId = shortId();
  
  const records = [
    {
      type: 'session',
      version: 3,
      id: sessionId,
      timestamp: ts,
      cwd: cwd
    },
    {
      type: 'model_change',
      id: modelChangeId,
      parentId: null,
      timestamp: ts,
      provider: provider,
      modelId: model
    },
    {
      type: 'thinking_level_change',
      id: thinkingId,
      parentId: modelChangeId,
      timestamp: ts,
      thinkingLevel: 'off'
    },
    {
      type: 'custom',
      customType: 'model-snapshot',
      data: {
        timestamp: Date.now(),
        provider: provider,
        modelApi: 'openai-completions',
        modelId: model
      },
      id: snapshotId,
      parentId: thinkingId,
      timestamp: ts
    }
  ];
  
  if (seedTask && seedTask.trim()) {
    records.push({
      type: 'message',
      id: shortId(),
      parentId: snapshotId,
      timestamp: ts,
      message: {
        role: 'user',
        content: [{ type: 'text', text: seedTask.trim() }],
        timestamp: Date.now()
      }
    });
  }
  
  const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(sessionFile, content, 'utf8');
  
  return records.length;
}

// 更新 sessions 索引
function updateSessionsIndex(sessionsDir, sessionKey, sessionId, sessionFile, provider, model, workspaceDir) {
  const indexPath = path.join(sessionsDir, 'sessions.json');
  let index = {};
  
  if (fs.existsSync(indexPath)) {
    try {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (e) {
      index = {};
    }
  }
  
  index[sessionKey] = {
    sessionId: sessionId,
    updatedAt: Date.now(),
    systemSent: true,
    abortedLastRun: false,
    chatType: 'direct',
    deliveryContext: { channel: 'webchat' },
    lastChannel: 'webchat',
    origin: {
      provider: 'webchat',
      surface: 'webchat',
      chatType: 'direct'
    },
    sessionFile: sessionFile,
    modelProvider: provider,
    model: model,
    systemPromptReport: {
      source: 'mideastsim-bootstrap',
      generatedAt: Date.now(),
      sessionId: sessionId,
      sessionKey: sessionKey,
      provider: provider,
      model: model,
      workspaceDir: workspaceDir
    }
  };
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
}

// 构建 session key
function buildSessionKey(agentId, runtime, label, sessionId) {
  if (runtime === 'main') {
    return `agent:${agentId}:main`;
  }
  const suffix = label && label.trim() ? label.trim() : sessionId.slice(0, 8);
  return `agent:${agentId}:${runtime}:${suffix}`;
}

// 主函数：创建单个 Agent
function createAgent(agentSpec) {
  const {
    agentId,
    name,
    runtime = 'subagent',
    mode = 'session',
    label,
    task,
    soulContent,
    provider = 'bailian',
    model = 'qwen3-max-2026-01-23'
  } = agentSpec;
  
  log(`🤖 创建 Agent: ${name || agentId}`, 'blue');
  
  // 1. 确保目录
  const dirs = ensureAgentDirs(agentId);
  log(`   ✓ 目录: ${dirs.workspaceDir}`, 'green');
  
  // 2. 保存 SOUL.md
  const soulPath = path.join(dirs.workspaceDir, 'SOUL.md');
  fs.writeFileSync(soulPath, soulContent, 'utf8');
  log(`   ✓ SOUL.md`, 'green');
  
  // 3. 更新配置
  const config = loadConfig();
  const { entry, created } = ensureAgentInConfig(config, agentId, name);
  if (created) {
    log(`   ✓ 已添加到 openclaw.json`, 'green');
  }
  
  // 4. 创建 session
  const sessionId = generateUuid();
  const sessionKey = buildSessionKey(agentId, runtime, label || agentId, sessionId);
  const sessionFile = path.join(dirs.sessionsDir, `${sessionId}.jsonl`);
  
  const recordCount = createSessionFile(
    sessionFile,
    sessionId,
    dirs.workspaceDir,
    provider,
    model,
    task || `初始化 ${agentId} Agent 会话`
  );
  log(`   ✓ Session 文件: ${sessionId}.jsonl (${recordCount} 条记录)`, 'green');
  
  // 5. 更新索引
  const runtimeSessionFile = sessionFile.replace(OPENCLAW_ROOT, '/home/node/.openclaw');
  const runtimeWorkspace = dirs.workspaceDir.replace(OPENCLAW_ROOT, '/home/node/.openclaw');
  updateSessionsIndex(
    dirs.sessionsDir,
    sessionKey,
    sessionId,
    runtimeSessionFile,
    provider,
    model,
    runtimeWorkspace
  );
  log(`   ✓ Sessions 索引`, 'green');
  
  // 6. 保存配置
  saveConfig(config);
  
  return {
    agentId,
    sessionId,
    sessionKey,
    sessionFile: sessionFile,
    workspaceDir: dirs.workspaceDir,
    soulPath
  };
}

// 从 agents-config.json 加载并创建
function main() {
  const args = process.argv.slice(2);
  const singleAgent = args.find(arg => arg.startsWith('--agent='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  
  log('='.repeat(60), 'blue');
  log('MideastSim Agent Bootstrap (文件系统模式)', 'blue');
  log('='.repeat(60), 'blue');
  
  // 读取 MideastSim Agent 配置
  const configPath = path.join(DATA_ROOT, 'mideastsim', 'agents-config.json');
  if (!fs.existsSync(configPath)) {
    log(`❌ 找不到配置: ${configPath}`, 'red');
    process.exit(1);
  }
  
  const mideastConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  log(`✓ 加载配置: ${Object.keys(mideastConfig.agents).length} 个 Agent`);
  
  let agentsToCreate;
  if (singleAgent) {
    if (!mideastConfig.agents[singleAgent]) {
      log(`❌ 未知 Agent: ${singleAgent}`, 'red');
      process.exit(1);
    }
    agentsToCreate = [singleAgent];
  } else {
    agentsToCreate = Object.keys(mideastConfig.agents);
  }
  
  log(`\n将创建 ${agentsToCreate.length} 个 Agent...\n`);
  
  if (dryRun) {
    log('⚠️  干跑模式，不写入文件', 'yellow');
    for (const agentId of agentsToCreate) {
      const agent = mideastConfig.agents[agentId];
      log(`  - ${agentId}: ${agent.name} (${agent.country})`);
    }
    return;
  }
  
  const results = [];
  for (const agentId of agentsToCreate) {
    const agent = mideastConfig.agents[agentId];
    
    // 生成 SOUL.md 内容
    const faction = mideastConfig.factions[agent.faction] || { name: '未分类' };
    
    let relations = '';
    for (const [key, rel] of Object.entries(mideastConfig.relations)) {
      const [c1, c2] = key.split('-');
      if (c1 === agent.country) {
        relations += `- **${c2}**: ${rel.status} (分数: ${rel.score})\n`;
      } else if (c2 === agent.country) {
        relations += `- **${c1}**: ${rel.status} (分数: ${rel.score})\n`;
      }
    }
    
    const soulContent = `# ${agent.avatar} ${agent.name} - ${agent.title}

## ⚠️ 重要提醒（必须记住）

${agent.must_remember.map(r => `- **${r}**`).join('\n')}

## 身份

- **姓名**: ${agent.name}
- **职位**: ${agent.title}
- **国家**: ${agent.country_name || agent.country} (${agent.country})
- **头像**: ${agent.avatar}

### 所属阵营: ${faction.name}
成员: ${faction.members?.join(', ') || 'N/A'}

## 性格特征

- **核心性格**: ${agent.personality.traits.join('、')}
- **决策风格**: ${agent.personality.style}
- **决策方式**: ${agent.personality.decision_making}

### 国际关系
${relations}

## 核心目标

${agent.goals.map(g => `- ${g}`).join('\n')}

## 红线（不可触碰）

${agent.red_lines.map(r => `- **${r}**`).join('\n')}

## 决策输出格式

必须用 JSON 格式输出决策:

\`\`\`json
{
  "decision": "行动类型",
  "confidence": 0.9,
  "reasoning": "基于国家利益的简要逻辑",
  "action": {
    "type": "diplomatic_statement|military_exercise|declare_war|sanction|...",
    "target": "目标国家ID",
    "content": "公开声明"
  },
  "statement": "对世界频道的公开声明（用第一人称）"
}
\`\`\`
`;
    
    const result = createAgent({
      agentId,
      name: agent.name,
      runtime: 'main',  // 独立 agent，不是 subagent
      mode: 'session',
      label: `${agentId}-${agent.country.toLowerCase()}`,
      task: `你是 ${agent.name}，${agent.title}。根据 SOUL.md 的设定进行决策。当收到世界事件时，分析对${agent.country_name || agent.country}的利益影响，然后以${agent.name}的风格做出回应。`,
      soulContent,
      provider: 'bailian',
      model: 'qwen3-max-2026-01-23'
    });
    
    results.push(result);
    log('');
  }
  
  // 保存 agent_sessions.json 供后端使用
  const sessionsConfig = {};
  for (const r of results) {
    const agent = mideastConfig.agents[r.agentId];
    sessionsConfig[r.agentId] = {
      id: r.agentId,
      name: agent.name,
      country: agent.country,
      sessionKey: r.sessionKey,
      sessionId: r.sessionId,
      description: `${agent.name} - ${agent.title}`
    };
  }
  
  const sessionsPath = path.join(DATA_ROOT, 'mideastsim', 'agent_sessions.json');
  fs.writeFileSync(sessionsPath, JSON.stringify(sessionsConfig, null, 2), 'utf8');
  log(`✓ 会话配置已保存: ${sessionsPath}`, 'green');
  
  log('\n' + '='.repeat(60), 'blue');
  log('Agent 创建完成!', 'green');
  log('='.repeat(60), 'blue');
  
  log('\n创建结果:');
  for (const r of results) {
    log(`  ${r.agentId.padEnd(12)} → ${r.sessionKey}`, 'green');
  }
  
  log('\n⚠️  重启 OpenClaw Gateway 后生效:');
  log('   openclaw gateway restart');
}

main();
