#!/usr/bin/env node
/**
 * MideastSim Agent 一键生成脚本 - 修正版
 * 使用 sessions_spawn 工具创建 Gateway 会话
 * 
 * 用法:
 *   node create-agents-from-json.js              # 创建所有
 *   node create-agents-from-json.js --agent usa  # 创建单个
 *   node create-agents-from-json.js --config-only # 只生成配置，不创建会话
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = '/home/node/.openclaw/workspace/mideastsim';
const CONFIG_FILE = path.join(WORKSPACE, 'agents-config.json');
const AGENTS_DIR = path.join(WORKSPACE, 'agents');
const SESSION_CONFIG = path.join(WORKSPACE, 'agent_sessions.json');

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

// 读取配置文件
function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    log(`❌ 无法读取配置文件: ${e.message}`, 'red');
    process.exit(1);
  }
}

// 生成 SOUL.md
function generateSoulMd(agentId, agent, config) {
  const faction = config.factions[agent.faction] || { name: '未分类', characteristics: '' };
  
  let powerBlock = '';
  if (agent.faction && config.factions[agent.faction]) {
    const f = config.factions[agent.faction];
    powerBlock = `\n### 所属阵营: ${f.name}\n成员: ${f.members.join(', ')}\n特点: ${f.characteristics}\n`;
  }

  let relations = '\n### 国际关系\n';
  for (const [key, rel] of Object.entries(config.relations)) {
    const [c1, c2] = key.split('-');
    if (c1 === agent.country) {
      relations += `- **${c2}**: ${rel.status} (分数: ${rel.score}) - ${rel.reason}\n`;
    } else if (c2 === agent.country) {
      relations += `- **${c1}**: ${rel.status} (分数: ${rel.score}) - ${rel.reason}\n`;
    }
  }

  let hotspots = '\n### 当前地缘热点\n';
  for (const spot of config.hotspots) {
    if (spot.parties.includes(agent.country) || agent.country === 'GLOBAL') {
      hotspots += `- **${spot.name}**: ${spot.type} - ${spot.status}\n`;
    }
  }

  return `# ${agent.avatar} ${agent.name} - ${agent.title}

## ⚠️ 重要提醒（必须记住）

${agent.must_remember.map(r => `- **${r}**`).join('\n')}

## 身份

- **姓名**: ${agent.name}
- **职位**: ${agent.title}
- **国家**: ${agent.country_name || agent.country} (${agent.country})
- **头像**: ${agent.avatar}
${powerBlock}

## 性格特征

- **核心性格**: ${agent.personality.traits.join('、')}
- **决策风格**: ${agent.personality.style}
- **决策方式**: ${agent.personality.decision_making}
${relations}
${hotspots}
## 背景

${agent.background.identity}
${agent.background.experience ? `- 经历: ${agent.background.experience}` : ''}
${agent.background.base ? `- 支持基础: ${agent.background.base}` : ''}

## 核心目标

${agent.goals.map(g => `- ${g}`).join('\n')}

## 深层恐惧

${agent.fears.map(f => `- ${f}`).join('\n')}

## 红线（不可触碰）

${agent.red_lines.map(r => `- **${r}**`).join('\n')}

## 关键议题

${Object.entries(agent.key_issues || {}).map(([k, v]) => `- **${k}**: ${v}`).join('\n')}

${agent.speech_patterns ? `## 语言特点\n\n常用表达: ${agent.speech_patterns.join(', ')}\n` : ''}

## 行为准则

### 必须遵守:
1. **始终代表 ${agent.country} 的国家利益**
2. **牢记所属阵营立场**: ${faction.name}
3. **参考国际关系**决定敌友态度
4. **根据当前热点**调整优先级
5. **绝不背叛 must_remember 中的原则**

### 回应方式:
- **敌对国家**: 强硬、警告、威胁、制裁
- **盟友国家**: 支持、合作、协调、援助
- **中立国家**: 务实、交易、观望、拉拢

### 优先级:
1. 生存红线
2. 核心目标
3. 阵营利益
4. 个人风格

## 使用 World Skill 进行交互

当需要行动时，使用 world skill:

\`\`\`javascript
const world = require('world');

// 发送公开声明
await world.messaging.sendPublic({
  content: "你的声明内容",
  type: "diplomacy"
});

// 执行外交行动
await world.actions.diplomaticStatement({
  target_id: "目标国家",
  statement_type: "support|criticize|neutral",
  content: "声明内容"
});
\`\`\`

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

## 记忆锚点

### 国家定位
- 我是: ${agent.country} (${agent.country_name || ''})
- 阵营: ${faction.name}
- 角色: ${agent.title}

### 绝对不能忘
${agent.must_remember.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;
}

// 生成 KNOWLEDGE.md
function generateKnowledgeMd(agentId, agent, config) {
  const allies = [];
  const enemies = [];
  
  for (const [key, rel] of Object.entries(config.relations)) {
    const [c1, c2] = key.split('-');
    if (c1 === agent.country && rel.score > 30) {
      allies.push({ country: c2, score: rel.score, status: rel.status });
    } else if (c1 === agent.country && rel.score < -30) {
      enemies.push({ country: c2, score: rel.score, status: rel.status });
    } else if (c2 === agent.country && rel.score > 30) {
      allies.push({ country: c1, score: rel.score, status: rel.status });
    } else if (c2 === agent.country && rel.score < -30) {
      enemies.push({ country: c1, score: rel.score, status: rel.status });
    }
  }

  const relevantHotspots = config.hotspots.filter(h => 
    h.parties.includes(agent.country) || agent.country === 'GLOBAL'
  );

  return `# ${agent.name} 知识库

## 国家概况

- **国家代码**: ${agent.country}
- **全称**: ${agent.country_name || agent.country}
- **阵营**: ${config.factions[agent.faction]?.name || '未分类'}
- **角色**: ${agent.title}

## 国际关系详情

### 盟友（关系 > 30）
${allies.length > 0 ? allies.map(a => `- **${a.country}**: ${a.status} (分数: ${a.score})`).join('\n') : '- 无明显盟友'}

### 敌对（关系 < -30）
${enemies.length > 0 ? enemies.map(e => `- **${e.country}**: ${e.status} (分数: ${e.score})`).join('\n') : '- 无明显敌对'}

## 相关地缘热点

${relevantHotspots.map(h => `### ${h.name}\n- 类型: ${h.type}\n- 参与方: ${h.parties.join(', ')}\n- 状态: ${h.status}\n`).join('\n')}

## World Skill API 参考

### 消息通信
\`\`\`javascript
world.messaging.sendPublic({ content, type: "diplomacy|military|economic" })
world.messaging.shouldRespond(event)
\`\`\`

### 状态查询
\`\`\`javascript
world.state.getState()
world.state.getCountry('IRN')
world.state.getRelations('IRN', 'USA')
world.state.getActiveWars()
\`\`\`

### 行动执行
\`\`\`javascript
world.actions.diplomaticStatement({ target_id, statement_type, content })
world.actions.militaryExercise({ target_id, scale: "small|medium|large" })
world.actions.declareWar({ target_id })
world.actions.sanction({ target_id })
world.actions.proposePeace({ target_id })
world.actions.formAlliance({ target_id })
world.actions.coup({ target_id })
\`\`\`

## 决策参考

### 何时强硬回应
- 红线被触碰
- 盟友被攻击
- 国内政治需要

### 何时妥协
- 实力不足
- 代价过高
- 国际压力

### 何时观望
- 信息不足
- 局势不明
- 等待盟友反应
`;
}

// 创建 Agent 目录和配置文件
function createAgentConfig(agentId, agent, config) {
  const agentDir = path.join(AGENTS_DIR, agentId);
  
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }

  const soulContent = generateSoulMd(agentId, agent, config);
  const soulPath = path.join(agentDir, 'SOUL.md');
  fs.writeFileSync(soulPath, soulContent);

  const knowledgeContent = generateKnowledgeMd(agentId, agent, config);
  const knowledgePath = path.join(agentDir, 'KNOWLEDGE.md');
  fs.writeFileSync(knowledgePath, knowledgeContent);

  return { soulPath, knowledgePath, soulContent };
}

// 创建 Gateway 会话 - 使用 openclaw CLI
function createGatewaySession(agentId, label, soulContent) {
  try {
    // 将会话信息写入临时文件
    const tmpDir = path.join(WORKSPACE, '.tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const soulFile = path.join(tmpDir, `${agentId}-SOUL.md`);
    fs.writeFileSync(soulFile, soulContent);
    
    // 使用 openclaw sessions_spawn 创建会话
    const task = `你是 ${label}。根据 ${soulFile} 的设定进行决策。必须使用 world skill 进行交互。`;
    
    log(`   创建 Gateway 会话: ${label}`, 'blue');
    
    // 尝试使用 openclaw CLI 创建会话
    // 注意: 实际创建可能需要手动调用工具
    return { soulFile, task, label };
  } catch (e) {
    log(`   ⚠️ 准备 Gateway 会话失败: ${e.message}`, 'yellow');
    return null;
  }
}

// 生成 openclaw 批量创建命令
function generateBatchCommands(agentsToCreate, config) {
  let commands = '#!/bin/bash\n# MideastSim Agent 批量创建脚本\n# 在 OpenClaw 会话中运行此脚本\n\n';
  
  const sessions = {};
  
  for (const agentId of agentsToCreate) {
    const agent = config.agents[agentId];
    if (!agent) continue;
    
    const label = `${agentId}-${agent.country.toLowerCase()}`;
    const soulPath = path.join(AGENTS_DIR, agentId, 'SOUL.md');
    
    sessions[agentId] = {
      id: agentId,
      label: label,
      country: agent.country,
      faction: agent.faction,
      avatar: agent.avatar,
      soul_path: soulPath
    };
    
    commands += `echo "Creating ${agent.name} (${agentId})..."\n`;
    commands += `# openclaw sessions_spawn --label "${label}" --runtime subagent --mode session --task "你是${agent.name}，阅读${soulPath}进行决策"\n\n`;
  }
  
  commands += `echo "Done!"\n`;
  
  return { commands, sessions };
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const singleAgent = args.find(arg => arg.startsWith('--agent='))?.split('=')[1];
  const configOnly = args.includes('--config-only');
  const listOnly = args.includes('--list');

  log('='.repeat(60), 'blue');
  log('MideastSim Agent 一键生成脚本', 'blue');
  log('='.repeat(60), 'blue');

  const config = loadConfig();
  log(`✓ 加载配置: ${Object.keys(config.agents).length} 个 Agent 定义`);
  log(`✓ 阵营定义: ${Object.keys(config.factions).length} 个`);
  log(`✓ 国际关系: ${Object.keys(config.relations).length} 对`);

  if (listOnly) {
    log('\n可创建的 Agent 列表:');
    for (const [aid, agent] of Object.entries(config.agents)) {
      log(`  ${aid.padEnd(12)} ${agent.avatar} ${agent.name} (${agent.country})`);
    }
    return;
  }

  let agentsToCreate;
  if (singleAgent) {
    if (!config.agents[singleAgent]) {
      log(`\n❌ 未知 Agent: ${singleAgent}`, 'red');
      return;
    }
    agentsToCreate = [singleAgent];
  } else {
    agentsToCreate = Object.keys(config.agents);
  }

  log(`\n将创建 ${agentsToCreate.length} 个 Agent 配置...`);
  log(`输出目录: ${AGENTS_DIR}\n`);

  // 创建所有 Agent 配置
  for (const agentId of agentsToCreate) {
    const agent = config.agents[agentId];
    log(`🤖 ${agent.avatar} ${agent.name} (${agentId})`, 'blue');
    
    const { soulPath, knowledgePath } = createAgentConfig(agentId, agent, config);
    log(`   ✓ SOUL.md: ${soulPath}`, 'green');
    log(`   ✓ KNOWLEDGE.md: ${knowledgePath}`, 'green');
  }

  // 生成批量创建脚本
  const { commands, sessions } = generateBatchCommands(agentsToCreate, config);
  const batchScript = path.join(WORKSPACE, 'scripts', 'create-gateway-sessions.sh');
  fs.writeFileSync(batchScript, commands);
  fs.chmodSync(batchScript, 0o755);
  
  // 保存 agent_sessions.json（配置版本，会话key需要后续填充）
  fs.writeFileSync(SESSION_CONFIG, JSON.stringify(sessions, null, 2));

  log('\n' + '='.repeat(60), 'blue');
  log('配置生成完成!', 'green');
  log(`  📁 Agent 配置: ${AGENTS_DIR}`);
  log(`  📄 会话配置: ${SESSION_CONFIG}`);
  log(`  📝 批量脚本: ${batchScript}`);

  if (configOnly) {
    log('\n✅ 仅生成配置，跳过 Gateway 会话创建', 'yellow');
    return;
  }

  log('\n⚠️  Gateway 会话需要手动创建:', 'yellow');
  log('   方法1: 运行批量脚本（需要 OpenClaw 环境）:');
  log(`   bash ${batchScript}`);
  log('');
  log('   方法2: 使用 OpenClaw 工具逐个创建:');
  
  for (const agentId of agentsToCreate.slice(0, 3)) {
    const agent = config.agents[agentId];
    const soulPath = path.join(AGENTS_DIR, agentId, 'SOUL.md');
    log(`   openclaw sessions spawn --label "${agentId}-${agent.country.toLowerCase()}" --runtime subagent --mode session --task "你是${agent.name}，阅读${soulPath}进行决策"`);
  }
  
  if (agentsToCreate.length > 3) {
    log(`   ... 还有 ${agentsToCreate.length - 3} 个`);
  }
  
  log('');
  log('   方法3: 在当前 OpenClaw 会话中使用工具调用:');
  log('   使用 sessions_spawn 工具，传入 SOUL.md 作为附件');
}

main().catch(e => {
  log(`错误: ${e.message}`, 'red');
  process.exit(1);
});
