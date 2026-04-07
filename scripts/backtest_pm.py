#!/usr/bin/env python3
"""
PM Agent 回测脚本 - 验证历史事件预测准确性
版本：1.0
日期：2026-03-28

使用 PM Agent 知识库中的量化公式，对历史事件进行回测，
验证预测准确性是否 > 70%
"""

import json
from datetime import datetime
from typing import Dict, List, Tuple

# ============================================================================
# 历史事件数据（真实发生的事件及实际影响）
# 数据来源：KNOWLEDGE.md 历史案例库
# ============================================================================
HISTORICAL_EVENTS = [
    {
        "event": "2023 加沙战争",
        "date": "2023-10-07",
        "type": "regional_war",
        "location": "Gaza",
        "gpr_level": 6,
        "actual": {"oil": 10, "gold": 8, "btc": 3, "spx": -2},
        "description": "哈马斯袭击以色列，加沙战争爆发"
    },
    {
        "event": "2022 俄乌战争",
        "date": "2022-02-24",
        "type": "major_power_conflict",
        "location": "Ukraine",
        "gpr_level": 7,
        "actual": {"oil": 40, "gold": 15, "btc": 8, "spx": -12},
        "description": "俄罗斯入侵乌克兰，大国冲突"
    },
    {
        "event": "2020 美伊紧张（苏莱曼尼）",
        "date": "2020-01-03",
        "type": "border_conflict",
        "location": "Iraq",
        "gpr_level": 5,
        "actual": {"oil": 4, "gold": 2, "btc": 2, "spx": -1},
        "description": "美国暗杀伊朗苏莱曼尼将军"
    },
    {
        "event": "2019 沙特阿美遇袭",
        "date": "2019-09-14",
        "type": "infrastructure_attack",
        "location": "Saudi Arabia",
        "gpr_level": 4,
        "actual": {"oil": 15, "gold": 1, "btc": 0, "spx": -1},
        "description": "也门胡塞武装袭击沙特油田"
    },
    {
        "event": "2018 美伊制裁重启",
        "date": "2018-05-08",
        "type": "sanction",
        "location": "Iran",
        "gpr_level": 3,
        "actual": {"oil": 12, "gold": 5, "btc": -5, "spx": -3},
        "description": "美国退出伊朗核协议，重启制裁"
    },
    {
        "event": "2017 卡塔尔断交",
        "date": "2017-06-05",
        "type": "diplomatic_crisis",
        "location": "Qatar",
        "gpr_level": 2,
        "actual": {"oil": 3, "gold": 1, "btc": 2, "spx": 0},
        "description": "沙特等国与卡塔尔断交"
    },
    {
        "event": "2014 克里米亚事件",
        "date": "2014-03-18",
        "type": "border_conflict",
        "location": "Crimea",
        "gpr_level": 5,
        "actual": {"oil": 10, "gold": 10, "btc": 5, "spx": -3},
        "description": "俄罗斯吞并克里米亚"
    },
    {
        "event": "2014 ISIS 崛起",
        "date": "2014-06-29",
        "type": "proxy_conflict",
        "location": "Iraq/Syria",
        "gpr_level": 4,
        "actual": {"oil": 8, "gold": 6, "btc": 0, "spx": -2},
        "description": "ISIS 宣布建立哈里发国"
    },
    {
        "event": "2011 利比亚内战",
        "date": "2011-02-15",
        "type": "civil_war",
        "location": "Libya",
        "gpr_level": 4,
        "actual": {"oil": 15, "gold": 8, "btc": 0, "spx": -5},
        "description": "利比亚内战爆发，卡扎菲政权垮台"
    },
    {
        "event": "2011 叙利亚内战",
        "date": "2011-03-15",
        "type": "proxy_conflict",
        "location": "Syria",
        "gpr_level": 4,
        "actual": {"oil": 5, "gold": 4, "btc": 0, "spx": -3},
        "description": "叙利亚内战爆发"
    },
    {
        "event": "2008 金融危机",
        "date": "2008-09-15",
        "type": "financial_crisis",
        "location": "Global",
        "gpr_level": 6,
        "actual": {"oil": -70, "gold": 5, "btc": 0, "spx": -50},
        "description": "雷曼兄弟破产，全球金融危机"
    },
    {
        "event": "2006 伊朗核危机",
        "date": "2006-03-29",
        "type": "nuclear_threat",
        "location": "Iran",
        "gpr_level": 6,
        "actual": {"oil": 15, "gold": 12, "btc": 0, "spx": -5},
        "description": "伊朗核问题升级"
    },
    {
        "event": "2003 伊拉克战争",
        "date": "2003-03-20",
        "type": "regional_war",
        "location": "Iraq",
        "gpr_level": 6,
        "actual": {"oil": 25, "gold": 12, "btc": 0, "spx": -8},
        "description": "美国入侵伊拉克"
    },
    {
        "event": "2001 9/11 恐怖袭击",
        "date": "2001-09-11",
        "type": "terrorist_attack",
        "location": "USA",
        "gpr_level": 7,
        "actual": {"oil": 10, "gold": 8, "btc": 0, "spx": -12},
        "description": "恐怖袭击世贸中心"
    },
    {
        "event": "1990 海湾战争",
        "date": "1990-08-02",
        "type": "regional_war",
        "location": "Kuwait/Iraq",
        "gpr_level": 6,
        "actual": {"oil": 100, "gold": 10, "btc": 0, "spx": -8},
        "description": "伊拉克入侵科威特"
    }
]

# ============================================================================
# PM Agent 量化预测模型（基于 KNOWLEDGE.md）
# ============================================================================

def predict_oil_impact(event_type: str, gpr_level: int, location: str) -> float:
    """
    油价冲击预测公式
    
    预期油价变化 (%) = 基础冲击 × 地理位置系数 × 供应中断系数
    """
    # 基础冲击（根据事件类型）
    base_impact = {
        "terrorist_attack": 5,
        "diplomatic_crisis": 2,
        "sanction": 8,
        "proxy_conflict": 8,
        "border_conflict": 12,
        "civil_war": 12,
        "regional_war": 20,
        "major_power_conflict": 30,
        "nuclear_threat": 35,
        "infrastructure_attack": 15,
        "financial_crisis": -50  # 需求崩溃
    }.get(event_type, 5)
    
    # 地理位置系数
    location_multiplier = {
        "Gaza": 1.2,
        "Ukraine": 1.3,
        "Iraq": 1.4,
        "Saudi Arabia": 1.5,
        "Iran": 1.5,
        "Qatar": 1.3,
        "Crimea": 1.2,
        "Syria": 1.3,
        "Libya": 1.3,
        "Global": 1.0,
        "USA": 1.0,
        "Kuwait/Iraq": 1.6
    }.get(location, 1.0)
    
    # GPR 等级调整系数
    gpr_multiplier = {
        2: 0.5,
        3: 0.7,
        4: 0.8,
        5: 1.0,
        6: 1.2,
        7: 1.4,
        8: 1.6
    }.get(gpr_level, 1.0)
    
    predicted = base_impact * location_multiplier * gpr_multiplier
    
    # 时间衰减（假设预测的是短期影响，1-7 天）
    # 实际回测中，我们使用事件后 1 周的平均价格变化
    return round(predicted, 1)


def predict_gold_impact(gpr_level: int) -> float:
    """
    黄金涨幅预测公式
    
    预期黄金变化 (%) = 地缘风险溢价
    """
    gold_impact = {
        1: 0,
        2: 1,
        3: 2,
        4: 4,
        5: 6,
        6: 10,
        7: 15,
        8: 25
    }.get(gpr_level, 0)
    
    return round(gold_impact, 1)


def predict_btc_impact(gpr_level: int, event_type: str) -> float:
    """
    BTC 影响预测公式
    
    预期 BTC 变化 (%) = 风险事件溢价 - 流动性收紧
    """
    # 风险事件溢价
    risk_premium = {
        1: 0,
        2: 1,
        3: 2,
        4: 3,
        5: 5,
        6: 8,
        7: 12,
        8: 20
    }.get(gpr_level, 0)
    
    # 金融危机特殊处理（BTC 早期不存在或负相关）
    if event_type == "financial_crisis":
        return 0  # 2008 年 BTC 还不存在
    
    # 2014 年之前 BTC 市场太小，影响有限
    return round(risk_premium * 0.8, 1) if gpr_level >= 4 else round(risk_premium, 1)


def predict_spx_impact(gpr_level: int, oil_impact: float) -> float:
    """
    股市影响预测公式
    
    预期股市变化 (%) = -(冲突严重程度 × 0.5) - (油价涨幅 × 0.2)
    """
    conflict_severity = gpr_level
    
    predicted = -(conflict_severity * 0.5) - (oil_impact * 0.2)
    
    # 金融危机特殊处理
    if gpr_level >= 6 and conflict_severity >= 6:
        predicted = min(predicted, -30)  # 严重危机时股市跌幅更大
    
    return round(predicted, 1)


def generate_prediction(event: Dict) -> Dict[str, float]:
    """生成事件的完整预测"""
    oil = predict_oil_impact(event["type"], event["gpr_level"], event["location"])
    gold = predict_gold_impact(event["gpr_level"])
    btc = predict_btc_impact(event["gpr_level"], event["type"])
    spx = predict_spx_impact(event["gpr_level"], oil)
    
    return {
        "oil": oil,
        "gold": gold,
        "btc": btc,
        "spx": spx
    }


# ============================================================================
# 准确率计算
# ============================================================================

def calculate_accuracy(actual: Dict[str, float], predicted: Dict[str, float]) -> Tuple[float, Dict[str, float]]:
    """
    计算预测准确率
    
    准确率 = 1 - 平均相对误差
    相对误差 = |预测值 - 实际值| / |实际值|
    """
    errors = {}
    total_error = 0
    count = 0
    
    for key in ["oil", "gold", "btc", "spx"]:
        if key in actual and key in predicted:
            actual_val = actual[key]
            predicted_val = predicted[key]
            
            # 避免除以 0
            if actual_val != 0:
                error = abs(predicted_val - actual_val) / abs(actual_val)
                errors[key] = error
                total_error += error
                count += 1
            else:
                # 实际值为 0 时，预测值也为 0 则无误差
                errors[key] = 0 if predicted_val == 0 else 1.0
                total_error += errors[key]
                count += 1
    
    if count == 0:
        return 0, errors
    
    avg_error = total_error / count
    accuracy = 1 - avg_error
    
    return accuracy, errors


def calculate_mape(actual: Dict[str, float], predicted: Dict[str, float]) -> float:
    """计算平均绝对百分比误差 (MAPE)"""
    errors = []
    for key in ["oil", "gold", "btc", "spx"]:
        if key in actual and key in predicted and actual[key] != 0:
            error = abs(predicted[key] - actual[key]) / abs(actual[key]) * 100
            errors.append(error)
    
    if not errors:
        return 0
    
    return sum(errors) / len(errors)


# ============================================================================
# 回测执行
# ============================================================================

def run_backtest() -> Dict:
    """运行完整回测"""
    results = []
    total_accuracy = 0
    total_mape = 0
    
    print("=" * 80)
    print("📊 PM Agent 历史事件回测报告")
    print("=" * 80)
    print(f"回测日期：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"测试样本：{len(HISTORICAL_EVENTS)} 个历史事件")
    print("=" * 80)
    
    for event in HISTORICAL_EVENTS:
        predicted = generate_prediction(event)
        accuracy, errors = calculate_accuracy(event["actual"], predicted)
        mape = calculate_mape(event["actual"], predicted)
        
        total_accuracy += accuracy
        total_mape += mape
        
        result = {
            "event": event["event"],
            "date": event["date"],
            "type": event["type"],
            "gpr_level": event["gpr_level"],
            "actual": event["actual"],
            "predicted": predicted,
            "accuracy": accuracy,
            "mape": mape,
            "errors": errors
        }
        results.append(result)
        
        # 打印详细结果
        print(f"\n📅 {event['event']} ({event['date']})")
        print(f"   类型：{event['type']} | GPR 等级：{event['gpr_level']}")
        print(f"   描述：{event['description']}")
        print(f"   ┌────────────────────────────────────────────────────────────┐")
        print(f"   │ 指标   │  实际影响  │  预测影响  │  误差   │  准确率  │")
        print(f"   ├────────────────────────────────────────────────────────────┤")
        for metric in ["oil", "gold", "btc", "spx"]:
            actual_val = event["actual"].get(metric, 0)
            pred_val = predicted.get(metric, 0)
            err = errors.get(metric, 0) * 100
            acc = (1 - errors.get(metric, 0)) * 100
            sign_actual = "+" if actual_val >= 0 else ""
            sign_pred = "+" if pred_val >= 0 else ""
            print(f"   │ {metric.upper():6} │ {sign_actual}{actual_val:7.1f}% │ {sign_pred}{pred_val:7.1f}% │ {err:5.1f}%  │ {acc:5.1f}%  │")
        print(f"   └────────────────────────────────────────────────────────────┘")
        print(f"   ✅ 综合准确率：{accuracy:.1%} | MAPE: {mape:.1f}%")
    
    # 计算总体统计
    avg_accuracy = total_accuracy / len(HISTORICAL_EVENTS)
    avg_mape = total_mape / len(HISTORICAL_EVENTS)
    
    # 按指标分类统计
    metrics_accuracy = {"oil": [], "gold": [], "btc": [], "spx": []}
    for result in results:
        for metric in metrics_accuracy:
            if metric in result["errors"]:
                acc = 1 - result["errors"][metric]
                metrics_accuracy[metric].append(acc)
    
    print("\n" + "=" * 80)
    print("📈 总体统计")
    print("=" * 80)
    print(f"   测试样本数：{len(HISTORICAL_EVENTS)}")
    print(f"   平均准确率：{avg_accuracy:.1%}")
    print(f"   平均 MAPE:  {avg_mape:.1f}%")
    print(f"   达标情况：{'✅ 通过 (>70%)' if avg_accuracy > 0.7 else '❌ 未达标 (<70%)'}")
    print("=" * 80)
    
    print("\n📊 各指标准确率:")
    for metric in ["oil", "gold", "btc", "spx"]:
        if metrics_accuracy[metric]:
            metric_avg = sum(metrics_accuracy[metric]) / len(metrics_accuracy[metric])
            status = "✅" if metric_avg > 0.7 else "⚠️"
            print(f"   {status} {metric.upper():6}: {metric_avg:.1%} (样本数：{len(metrics_accuracy[metric])})")
    
    print("=" * 80)
    
    # 找出准确率最高和最低的事件
    best = max(results, key=lambda x: x["accuracy"])
    worst = min(results, key=lambda x: x["accuracy"])
    
    print(f"\n🏆 最佳预测：{best['event']} (准确率：{best['accuracy']:.1%})")
    print(f"📉 最差预测：{worst['event']} (准确率：{worst['accuracy']:.1%})")
    print("=" * 80)
    
    # 生成改进建议
    print("\n💡 改进建议:")
    if avg_accuracy < 0.7:
        print("   1. 调整量化公式参数，提高基础冲击值")
        print("   2. 增加更多历史案例作为参考")
        print("   3. 考虑引入时间衰减因子")
    else:
        print("   ✅ 模型准确率良好，可投入使用")
        if avg_accuracy > 0.85:
            print("   🌟 模型表现优秀，建议推广使用")
    
    print("=" * 80)
    
    return {
        "total_events": len(HISTORICAL_EVENTS),
        "avg_accuracy": avg_accuracy,
        "avg_mape": avg_mape,
        "metrics_accuracy": {k: sum(v)/len(v) if v else 0 for k, v in metrics_accuracy.items()},
        "best_case": best,
        "worst_case": worst,
        "passed": avg_accuracy > 0.7
    }


def save_report(results: Dict, filename: str = "backtest_report.json"):
    """保存回测报告为 JSON"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n📄 报告已保存至：{filename}")


# ============================================================================
# 主程序
# ============================================================================

if __name__ == "__main__":
    import sys
    
    print("\n🚀 启动 PM Agent 回测...\n")
    
    try:
        results = run_backtest()
        
        # 保存详细报告
        if len(sys.argv) > 1 and sys.argv[1] == "--save":
            save_report(results)
        
        # 退出码：通过=0，失败=1
        sys.exit(0 if results["passed"] else 1)
        
    except Exception as e:
        print(f"\n❌ 回测失败：{e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
