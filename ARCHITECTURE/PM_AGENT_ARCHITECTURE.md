# PM Agent 架构调整

## 时间
2026-03-27 12:13 UTC

## 问题
PM Agent 经济分析任务由 OpenClaw Cron 管理（每 10 分钟执行一次），存在以下问题：

1. **冗余触发**：后端已在事件创建时实时调用 PM Agent，Cron 任务会重复分析
2. **职责分离**：PM Agent 是后端的服务，应该由后端统一管理
3. **错误处理**：Cron 任务连续错误 77 次（Channel required）
4. **外部依赖**：依赖 OpenClaw Gateway 的可用性

## 解决方案

### 删除 OpenClaw Cron 任务
```bash
cron remove --jobId d74d268c-2b02-4554-b61a-fc4d7ac5a64a
```

### 保留后端实时触发
位置：`backend/main.go:317-339`

```go
// 创建事件时，异步调用 PM Agent 分析经济影响
go func() {
    req := PMAnalyzeRequest{
        EventID:     event.ID,
        EventType:   event.Type,
        Location:    event.Location,
        Title:       event.Title,
        Description: event.Description,
    }
    
    analysis := analyzeEventViaPMAgent(req)
    if analysis != nil {
        calculatePriceChanges(analysis)
        eventData := make(map[string]interface{})
        eventData["pm_analysis"] = analysis
        db.UpdateEventData(event.ID, eventData)
    }
}()
```

## 新架构

```
事件创建 → 后端异步调用 PM Agent → 分析完成 → 更新事件数据
                ↓
         (可选) 失败重试逻辑
```

## 后续改进

1. **失败重试**：如果 PM Agent 分析失败，后端应该有重试机制
2. **超时控制**：设置合理的超时时间，避免阻塞
3. **监控日志**：记录分析成功/失败率
4. **缓存机制**：相同类型事件可以考虑缓存分析结果

## 文件清单
- `backend/main.go` - PM Agent 调用逻辑
- `backend/forward.go` - PM Agent 消息转发
- `backend/database.go` - 事件数据更新
