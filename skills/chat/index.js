const fetch = require('node-fetch');

const CHAT_API_BASE = process.env.CHAT_API_BASE || 'http://localhost:8081/api/chat';

/**
 * 聊天室通信能力
 * 让 Agent 能够在公共频道发言、私密频道交流、创建专属频道
 */
module.exports = {
  name: 'chat',
  description: '聊天室通信能力 - 公开发言、私密对话、创建频道',

  actions: {
    /**
     * 在世界频道公开发言
     * @param {Object} params - 参数
     * @param {string} params.content - 发言内容
     * @param {string} params.type - 消息类型: diplomacy|announcement|response|initiative
     * @param {Object} context - 上下文
     * @param {string} context.agentId - Agent ID
     */
    speak: async (params, context) => {
      const { content, type = 'diplomacy' } = params;
      const from = context.agentId;
      
      if (!content || content.trim().length === 0) {
        return { success: false, error: '发言内容不能为空' };
      }

      try {
        const response = await fetch(`${CHAT_API_BASE}/public`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            from, 
            content: content.trim(),
            type,
            timestamp: new Date().toISOString()
          })
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `发送失败: ${error}` };
        }

        return { 
          success: true, 
          message: '发言已发送到世界频道',
          data: { from, content, type }
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * 在私密频道发言
     * @param {Object} params - 参数
     * @param {string} params.channel - 频道名称/ID
     * @param {string} params.content - 发言内容
     * @param {string[]} params.to - 接收者列表（可选）
     * @param {Object} context - 上下文
     */
    whisper: async (params, context) => {
      const { channel, content, to = [] } = params;
      const from = context.agentId;

      if (!channel || !content) {
        return { success: false, error: '频道名称和发言内容不能为空' };
      }

      try {
        const response = await fetch(`${CHAT_API_BASE}/private`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            channel,
            content: content.trim(),
            to,
            timestamp: new Date().toISOString()
          })
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `发送失败: ${error}` };
        }

        return {
          success: true,
          message: `私密消息已发送到 [${channel}]`,
          data: { from, channel, content, to }
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * 创建私密聊天频道
     * @param {Object} params - 参数
     * @param {string} params.channelName - 频道名称
     * @param {string[]} params.members - 成员列表
     * @param {Object} context - 上下文
     */
    createChannel: async (params, context) => {
      const { channelName, members = [] } = params;
      const creator = context.agentId;

      if (!channelName) {
        return { success: false, error: '频道名称不能为空' };
      }

      try {
        const response = await fetch(`${CHAT_API_BASE}/channel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator,
            channelName,
            members: [...new Set([creator, ...members])], // 确保创建者在成员列表中
            createdAt: new Date().toISOString()
          })
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `创建频道失败: ${error}` };
        }

        const result = await response.json();
        return {
          success: true,
          message: `私密频道 [${channelName}] 创建成功`,
          data: { channelName, creator, members, channelId: result.channelId }
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * 获取最近的世界频道消息
     * @param {Object} params - 参数
     * @param {number} params.limit - 消息数量限制
     * @param {Object} context - 上下文
     */
    getRecentPublic: async (params, context) => {
      const { limit = 20 } = params;
      const agentId = context.agentId;

      try {
        const response = await fetch(
          `${CHAT_API_BASE}/recent?agent=${agentId}&limit=${limit}&type=public`
        );

        if (!response.ok) {
          return { success: false, error: '获取消息失败' };
        }

        const messages = await response.json();
        return {
          success: true,
          message: `获取到 ${messages.length} 条消息`,
          data: messages
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * 获取私密频道消息
     * @param {Object} params - 参数
     * @param {string} params.channel - 频道名称
     * @param {number} params.limit - 消息数量限制
     * @param {Object} context - 上下文
     */
    getChannelMessages: async (params, context) => {
      const { channel, limit = 50 } = params;
      const agentId = context.agentId;

      if (!channel) {
        return { success: false, error: '频道名称不能为空' };
      }

      try {
        const response = await fetch(
          `${CHAT_API_BASE}/channel/${channel}/messages?agent=${agentId}&limit=${limit}`
        );

        if (!response.ok) {
          return { success: false, error: '获取频道消息失败' };
        }

        const messages = await response.json();
        return {
          success: true,
          message: `获取到 ${messages.length} 条频道消息`,
          data: messages
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * 分析聊天内容对决策的影响
     * @param {Object} params - 参数
     * @param {number} params.lookback - 回顾消息数量
     * @param {Object} context - 上下文
     */
    analyzeInfluence: async (params, context) => {
      const { lookback = 20 } = params;
      const agentId = context.agentId;

      try {
        // 获取最近消息
        const response = await fetch(
          `${CHAT_API_BASE}/recent?agent=${agentId}&limit=${lookback}`
        );
        
        if (!response.ok) {
          return { success: false, error: '获取消息失败' };
        }

        const messages = await response.json();
        
        // 分析影响力
        const influence = {
          warSupport: 0,      // 战争支持度 (-100 to 100)
          peaceSupport: 0,    // 和平支持度 (-100 to 100)
          allyTrust: 0,       // 盟友信任度 (-100 to 100)
          enemyThreat: 0,     // 敌国威胁感 (-100 to 100)
          keyMessages: []     // 关键消息
        };

        messages.forEach(msg => {
          const content = msg.content.toLowerCase();
          const from = msg.from;

          // 关键词分析
          const warKeywords = ['战争', '打击', '攻击', '制裁', '强硬', '军事', 'force', 'attack', 'strike'];
          const peaceKeywords = ['和平', '对话', '谈判', '妥协', '和解', '停火', 'peace', 'talk', 'negotiate'];
          const threatKeywords = ['威胁', '危险', '敌对', '消灭', '摧毁', 'threat', 'destroy'];
          const allyKeywords = ['支持', '合作', '盟友', '朋友', 'support', 'ally', 'cooperate'];

          const hasWar = warKeywords.some(k => content.includes(k));
          const hasPeace = peaceKeywords.some(k => content.includes(k));
          const hasThreat = threatKeywords.some(k => content.includes(k));
          const hasAlly = allyKeywords.some(k => content.includes(k));

          // 根据消息来源判断影响
          if (hasWar) {
            influence.warSupport += 5;
            influence.keyMessages.push({ type: 'war', from, content: msg.content });
          }
          if (hasPeace) {
            influence.peaceSupport += 5;
            influence.keyMessages.push({ type: 'peace', from, content: msg.content });
          }
          if (hasThreat) {
            influence.enemyThreat += 10;
          }
          if (hasAlly) {
            influence.allyTrust += 5;
          }
        });

        // 限制范围
        influence.warSupport = Math.max(-100, Math.min(100, influence.warSupport));
        influence.peaceSupport = Math.max(-100, Math.min(100, influence.peaceSupport));
        influence.allyTrust = Math.max(-100, Math.min(100, influence.allyTrust));
        influence.enemyThreat = Math.max(-100, Math.min(100, influence.enemyThreat));

        return {
          success: true,
          message: `分析了 ${messages.length} 条消息的影响`,
          data: influence
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  }
};
