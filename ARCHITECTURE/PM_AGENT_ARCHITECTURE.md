# PM Agent 架构

## 时间
2026-03-27 12:13 UTC (初始)
2026-03-27 12:25 UTC (更新：同步接收回复)

## 架构演进

### 1. 初始架构 (已废弃)
- OpenClaw Cron 定时任务每 10 分钟扫描未分析事件
- ❌ 问题：冗余、外部依赖、连续错误 77 次

### 2. 后端实时触发 + 回调 API (已废弃)
- 后端在事件创建时调用 PM Agent
- PM Agent 分析完成后调用回调 API 返回结果
- ❌ 问题：多余的一次 HTTP 调用，增加复杂度

### 3. 后端实时触发 + 同步接收回复 (当前)
- 后端在事件创建时调用 PM Agent
- **同步等待 PM Agent 回复（90 秒超时）**
- 从回复消息中直接解析 JSON 分析结果
- ✅ 优势：简化架构、减少 HTTP 调用、结果立即可用

## 当前架构

```
事件创建 → 后端异步调用 PM Agent (sendToAgentAndWait)
                ↓
         等待回复（90 秒超时）
                ↓
         解析回复中的 JSON 结果 (parsePMAnalysisReply)
                ↓
         calculatePriceChanges() → 更新价格
                ↓
         db.UpdateEventData() → 存入数据库
```

## 核心函数

### backend/forward.go
```go
// 发送消息并等待回复
func sendToAgentAndWait(agentID, message string, timeout time.Duration) (string, error)
```

### backend/main.go
```go
// 调用 PM Agent 并解析回复
func analyzeEventViaPMAgent(req PMAnalyzeRequest) *PMAnalyzeResponse

// 解析 PM Agent 回复中的 JSON
func parsePMAnalysisReply(reply string) *PMAnalyzeResponse
```

## PM Agent 消息格式

### 请求
```
📊 事件分析请求

**事件 ID**: xxx
**类型**: military
**地点**: Tehran
**标题**: ...
**描述**: ...

请直接在回复中返回 JSON 格式的分析结果。
```

### 回复 (JSON)
```json
{
  "oil": {"direction": "up", "min_change": 8, "max_change": 15, "value": 11.5, "reason": "..."},
  "gold": {"direction": "up", "min_change": 3, "max_change": 5, "value": 4, "reason": "..."},
  "btc": {...},
  "eth": {...},
  "spx": {...},
  "hsi": {...},
  "ftse": {...},
  "summary": "🚨 中东局势推高油价和避险资产"
}
```

## 错误处理

1. **发送/接收失败** → 降级使用本地分析 `analyzeEventImpact()`
2. **JSON 解析失败** → 降级使用本地分析
3. **超时（90 秒）** → 返回错误，降级使用本地分析

## 后续改进

1. **失败重试**：如果 PM Agent 分析失败，后端应该有重试机制
2. **监控日志**：记录分析成功/失败率
3. **缓存机制**：相同类型事件可以考虑缓存分析结果
4. **异步优化**：如果 90 秒超时影响性能，可考虑真正的异步 + 轮询

## 文件清单
- `backend/main.go` - PM Agent 调用和解析逻辑
- `backend/forward.go` - sendToAgentAndWait 函数
- `backend/database.go` - 事件数据更新
