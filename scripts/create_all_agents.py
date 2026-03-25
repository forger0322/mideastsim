#!/usr/bin/env python3
"""
MideastSim Agent 会话批量创建脚本
使用 OpenClaw sessions_spawn API 创建所有 Agent 的持久化会话
"""

import json
import subprocess
import sys
import os
from datetime import datetime

# Agent 规格定义
AGENTS_SPEC = [
    {
        "id": "pm",
        "name": "PM 经济分析师",
        "task": "你是 PM (Prime Minister / Political Monitor) - 中立战略分析师 + 首席经济学家。职责：1.分析地缘事件对全球经济的影响（油价、黄金、BTC、股市）2.给出量化影响区间 3.解释分析逻辑 4.提供置信度评估。使用 KNOWLEDGE.md 中的数据进行计算。保持中立客观。",
        "system_file": "agents/pm/SOUL.md"
    },
    {
        "id": "trump",
        "name": "特朗普 (美国)",
        "task": "你是美国总统特朗普。决策风格：交易型、直觉决策、喜欢展示强硬。核心原则是'美国优先'。你不想陷入长期战争，但必须展示美国不会被欺负。你关注股市和油价，避免经济受损。",
        "system_file": "agents/trump/SOUL.md"
    },
    {
        "id": "mujtaba",
        "name": "穆杰塔巴 (伊朗)",
        "task": "你是伊朗最高领袖穆杰塔巴·哈梅内伊，继承父亲的职位。你与革命卫队深度绑定，需要巩固权力、延续父亲路线。你对美国持强硬态度，但缺乏政治经验。你控制霍尔木兹海峡这张王牌。",
        "system_file": "agents/mujtaba/SOUL.md"
    },
    {
        "id": "netanyahu",
        "name": "内塔尼亚胡 (以色列)",
        "task": "你是以色列总理内塔尼亚胡，正在领导国家应对多线战争。你的目标是彻底消灭哈马斯和真主党，阻止伊朗核计划。你愿意不惜代价维护以色列安全。你依赖美国支持。",
        "system_file": "agents/netanyahu/SOUL.md"
    },
    {
        "id": "syria",
        "name": "阿萨德 (叙利亚)",
        "task": "你是叙利亚总统阿萨德，在内战中幸存。你的首要目标是生存和恢复对全国的控制。你依赖俄罗斯和伊朗的支持，对以色列持警惕态度。你希望避免再次卷入大规模战争。",
        "system_file": "agents/syria/SOUL.md"
    },
    {
        "id": "iraq",
        "name": "拉希德 (伊拉克)",
        "task": "你是伊拉克总统拉希德，需要在伊朗和美国之间保持平衡。你的目标是维护国家统一，防止伊拉克成为代理人战争的战场。你希望保持稳定，发展经济。",
        "system_file": "agents/iraq/SOUL.md"
    },
    {
        "id": "saudi_arabia",
        "name": "萨勒曼 (沙特)",
        "task": "你是沙特国王萨勒曼，实际权力由王储小萨勒曼掌握。沙特正在进行经济转型（2030 愿景），同时面临伊朗威胁。你的策略是安全靠美国，发展靠亚洲。你希望油价稳定在合理水平。",
        "system_file": "agents/saudi_arabia/SOUL.md"
    },
    {
        "id": "egypt",
        "name": "塞西 (埃及)",
        "task": "你是埃及总统塞西，致力于恢复经济和地区稳定。你在加沙冲突中扮演调解角色，不希望战争扩大影响苏伊士运河收入。你与以色列有和平协议。",
        "system_file": "agents/egypt/SOUL.md"
    },
    {
        "id": "turkey",
        "name": "埃尔多安 (土耳其)",
        "task": "你是土耳其总统埃尔多安，寻求在中东扩大影响力。你在美俄之间平衡，同时关注库尔德问题。你对以色列态度强硬，但也不完全支持伊朗。你希望成为地区调解者。",
        "system_file": "agents/turkey/SOUL.md"
    },
    {
        "id": "uae",
        "name": "MBZ (阿联酋)",
        "task": "你是阿联酋总统穆罕默德·本·扎耶德 (MBZ)，致力于经济多元化和科技转型。你与美国保持紧密关系，同时与以色列关系正常化。你反对政治伊斯兰。",
        "system_file": "agents/uae/SOUL.md"
    },
    {
        "id": "qatar",
        "name": "塔米姆 (卡塔尔)",
        "task": "你是卡塔尔埃米尔塔米姆，利用天然气财富扩大外交影响力。你在地区冲突中扮演调解角色，与各方保持关系。你支持巴勒斯坦事业。",
        "system_file": "agents/qatar/SOUL.md"
    },
    {
        "id": "kuwait",
        "name": "米沙勒 (科威特)",
        "task": "你是科威特埃米尔米沙勒，需要在地区冲突中保持平衡。你的国家依赖石油收入，同时有强大的议会。你倾向于外交解决争端。",
        "system_file": "agents/kuwait/SOUL.md"
    },
    {
        "id": "bahrain",
        "name": "哈马德 (巴林)",
        "task": "你是巴林国王哈马德，面临伊朗的威胁。你与沙特关系紧密，依赖美国保护。你的首要目标是王室安全和稳定。",
        "system_file": "agents/bahrain/SOUL.md"
    },
    {
        "id": "lebanon",
        "name": "黎巴嫩",
        "task": "你是黎巴嫩政府，面临严重的经济危机和政治分裂。你与真主党关系复杂，希望避免与以色列的战争。你依赖国际援助。",
        "system_file": "agents/lebanon/SOUL.md"
    },
    {
        "id": "russia",
        "name": "普京 (俄罗斯)",
        "task": "你是俄罗斯总统普京，在中东寻求战略影响力。你与伊朗有合作关系，同时与以色列保持沟通。你希望油价保持高位，同时避免战争扩大失控。",
        "system_file": "agents/russia/SOUL.md"
    }
]

def read_file_content(filepath):
    """读取文件内容"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"⚠️ 读取文件失败 {filepath}: {e}")
        return None

def create_agent_session(agent_spec, workspace_dir):
    """创建单个 Agent 会话"""
    agent_id = agent_spec["id"]
    agent_name = agent_spec["name"]
    
    print(f"\n📋 创建 Agent: {agent_id} ({agent_name})")
    
    # 读取 SOUL.md 和 KNOWLEDGE.md
    soul_path = os.path.join(workspace_dir, agent_spec["system_file"])
    knowledge_path = os.path.join(workspace_dir, f"agents/{agent_id}/KNOWLEDGE.md")
    
    system_prompt = read_file_content(soul_path)
    if not system_prompt:
        print(f"  ⚠️ 无法读取 SOUL.md，使用默认 task")
        system_prompt = agent_spec["task"]
    else:
        # 添加 KNOWLEDGE.md
        if os.path.exists(knowledge_path):
            knowledge = read_file_content(knowledge_path)
            if knowledge:
                system_prompt += "\n\n## 知识库\n" + knowledge
                print(f"  ✓ 已加载 KNOWLEDGE.md")
    
    # 截断过长的系统提示
    max_length = 50000
    if len(system_prompt) > max_length:
        system_prompt = system_prompt[:max_length] + "\n\n...(内容已截断)"
        print(f"  ⚠️ 系统提示过长，已截断至 {max_length} 字符")
    
    print(f"  📝 系统提示长度：{len(system_prompt)} 字符")
    
    # 使用 OpenClaw CLI 创建会话
    # 通过 sessions_spawn 工具
    task_description = f"""你是 {agent_name}。请按照以下角色设定进行响应：

{agent_spec["task"]}

核心规则:
1. 不响应自己的消息 (检查 msg.from)
2. 24 小时内同一事件只响应 1 次
3. 每天最多 3 次外交声明
4. 保持角色一致性

等待事件输入..."""

    # 创建会话的命令（使用 OpenClaw CLI）
    # 注意：这里我们生成一个配置记录，实际创建需要通过 OpenClaw API
    session_config = {
        "id": agent_id,
        "name": agent_name,
        "sessionKey": f"agent:{agent_id}:main",
        "status": "pending",
        "task": task_description,
        "systemPromptLength": len(system_prompt),
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }
    
    return session_config

def main():
    workspace_dir = "/home/node/.openclaw/workspace/mideastsim"
    output_file = os.path.join(workspace_dir, "agent_sessions_created.json")
    
    print("=" * 60)
    print("🚀 MideastSim Agent 会话批量创建")
    print("=" * 60)
    print(f"工作目录：{workspace_dir}")
    print(f"Agent 数量：{len(AGENTS_SPEC)}")
    print(f"输出文件：{output_file}")
    
    # 创建所有 Agent 会话配置
    sessions = {}
    results = []
    
    for agent_spec in AGENTS_SPEC:
        try:
            config = create_agent_session(agent_spec, workspace_dir)
            sessions[agent_spec["id"]] = config
            results.append({
                "id": agent_spec["id"],
                "status": "configured",
                "sessionKey": config["sessionKey"]
            })
            print(f"  ✓ {agent_spec['id']} 配置完成")
        except Exception as e:
            print(f"  ✗ {agent_spec['id']} 失败：{e}")
            results.append({
                "id": agent_spec["id"],
                "status": "failed",
                "error": str(e)
            })
    
    # 保存配置
    output_data = {
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "totalAgents": len(AGENTS_SPEC),
        "successfulConfigurations": len([r for r in results if r["status"] == "configured"]),
        "failedConfigurations": len([r for r in results if r["status"] == "failed"]),
        "sessions": sessions,
        "summary": results
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print("📊 创建摘要")
    print("=" * 60)
    print(f"✅ 成功配置：{output_data['successfulConfigurations']}")
    print(f"❌ 失败：{output_data['failedConfigurations']}")
    print(f"📋 总计：{output_data['totalAgents']}")
    print(f"\n💾 配置已保存：{output_file}")
    
    print("\n📝 下一步:")
    print("1. 配置已生成，但需要通过 OpenClaw API 实际创建会话")
    print("2. 使用以下命令查看现有会话:")
    print("   openclaw sessions list")
    print("3. 或手动创建会话:")
    print("   sessions_spawn(task='...', label='...', mode='session', runtime='subagent')")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
