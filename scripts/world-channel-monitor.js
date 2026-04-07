// World Channel Auto-Monitor
// 自动监听世界频道并通知相关 Agent

const WORLD_CHANNEL_URL = 'http://localhost:8081/api/chat/messages';
const AGENT_SESSIONS = {
  trump: 'agent:trump:main',
  mujtaba: 'agent:mujtaba:main',
  netanyahu: 'agent:netanyahu:main',
  putin: 'agent:russia:main',
  salman: 'agent:saudi_arabia:main',
  erdogan: 'agent:turkey:main',
  tamim: 'agent:qatar:main',
  assad: 'agent:syria:main',
  rashid: 'agent:iraq:main',
  mbz: 'agent:uae:main',
  kuwait: 'agent:kuwait:main',
  bahrain: 'agent:bahrain:main',
  lebanon: 'agent:lebanon:main',
  jordan: 'agent:jordan:main',
  oman: 'agent:oman:main'
};

let lastMessageCount = 0;
let lastMessages = [];

async function fetchMessages() {
  try {
    const response = await fetch(`${WORLD_CHANNEL_URL}?limit=20`);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    return data.messages || [];
  } catch (err) {
    console.error('Error fetching messages:', err);
    return [];
  }
}

function getNewMessages(current, previous) {
  if (previous.length === 0) return current.slice(-5); // First run, get last 5
  
  const previousIds = new Set(previous.map(m => m.id));
  return current.filter(m => !previousIds.has(m.id));
}

function formatMessageForAgent(msg) {
  const timestamp = new Date(msg.timestamp).toLocaleTimeString();
  return `[${timestamp}] ${msg.sender_id}: ${msg.content}`;
}

function shouldNotifyAgent(agentId, message) {
  // Don't notify if message is from self
  if (message.sender_id === agentId) return false;
  
  // Don't notify for system messages
  if (message.sender_id === 'system') return false;
  
  return true;
}

async function notifyAgent(agentId, sessionKey, newMessages) {
  const relevantMessages = newMessages.filter(m => shouldNotifyAgent(agentId, m));
  if (relevantMessages.length === 0) return;
  
  const formattedMessages = relevantMessages.map(formatMessageForAgent).join('\n\n');
  
  const prompt = `📨 **New messages in World Channel:**

${formattedMessages}

---

**Your task:**
1. Read and analyze the new messages
2. Consider if you need to respond based on:
   - Is your country directly mentioned or affected?
   - Is there a threat to your interests or allies?
   - Do you have something important to add?
   - Would silence be seen as weakness?
3. Decide: RESPOND or STAY SILENT
4. If responding, craft an appropriate statement in ENGLISH
5. Use your personality and national interests

**Remember:**
- Don't respond to every message (avoid spam)
- Prioritize quality over quantity
- Consider timing and strategic value
- Stay in character as ${agentId.toUpperCase()}

Send your response to the world channel only if you have something meaningful to say.`;

  try {
    const response = await fetch('http://localhost:8080/api/sessions/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionKey: sessionKey,
        message: prompt,
        timeoutSeconds: 30
      })
    });
    
    if (response.ok) {
      console.log(`✅ Notified ${agentId}`);
    } else {
      console.log(`⚠️ Failed to notify ${agentId}: ${response.status}`);
    }
  } catch (err) {
    console.error(`Error notifying ${agentId}:`, err);
  }
}

async function checkAndNotify() {
  console.log('🔍 Checking world channel...');
  
  const messages = await fetchMessages();
  
  if (messages.length > lastMessageCount) {
    const newMessages = getNewMessages(messages, lastMessages);
    
    if (newMessages.length > 0) {
      console.log(`📨 ${newMessages.length} new message(s) detected`);
      
      // Notify all agents about new messages
      for (const [agentId, sessionKey] of Object.entries(AGENT_SESSIONS)) {
        await notifyAgent(agentId, sessionKey, newMessages);
        // Small delay to avoid overwhelming
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    lastMessageCount = messages.length;
    lastMessages = messages;
  } else {
    console.log('✓ No new messages');
  }
}

// Run immediately and then every 30 seconds
checkAndNotify();
setInterval(checkAndNotify, 30000);

console.log('🌍 World Channel Auto-Monitor started');
console.log('⏱️  Checking every 30 seconds...');
