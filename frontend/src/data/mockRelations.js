// 模拟外交关系数据 - 基于 2026 年真实地缘政治关系
// 关系值范围：-100 (死敌) 到 +100 (盟友)

export const mockRelations = [
  // 伊朗 (IRN) 的关系
  { actor_id: 'IRN', target_id: 'IRQ', value: 65, trend: 2.3 },  // 伊朗 - 伊拉克：友好（什叶派联盟）
  { actor_id: 'IRN', target_id: 'SYR', value: 85, trend: 0.5 },  // 伊朗 - 叙利亚：同盟（阿萨德政权）
  { actor_id: 'IRN', target_id: 'LBN', value: 70, trend: 1.2 },  // 伊朗 - 黎巴嫩（真主党）
  { actor_id: 'IRN', target_id: 'PSE', value: 60, trend: 3.1 },  // 伊朗 - 巴勒斯坦（支持哈马斯）
  { actor_id: 'IRN', target_id: 'YEM', value: 75, trend: -0.8 }, // 伊朗 - 也门（胡塞武装）
  { actor_id: 'IRN', target_id: 'USA', value: -85, trend: -1.5 }, // 伊朗 - 美国：敌对
  { actor_id: 'IRN', target_id: 'ISR', value: -95, trend: -2.1 }, // 伊朗 - 以色列：死敌
  { actor_id: 'IRN', target_id: 'SAU', value: -45, trend: 5.2 },  // 伊朗 - 沙特：紧张但缓和（中国斡旋）
  { actor_id: 'IRN', target_id: 'ARE', value: -30, trend: 3.8 },  // 伊朗 - 阿联酋：紧张但缓和
  { actor_id: 'IRN', target_id: 'TUR', value: 15, trend: -1.2 },  // 伊朗 - 土耳其：复杂（竞争与合作）
  { actor_id: 'IRN', target_id: 'EGY', value: -20, trend: 0.5 },  // 伊朗 - 埃及：紧张
  { actor_id: 'IRN', target_id: 'JOR', value: -35, trend: 0.2 },  // 伊朗 - 约旦：紧张
  { actor_id: 'IRN', target_id: 'KWT', value: -15, trend: 1.5 },  // 伊朗 - 科威特：谨慎
  { actor_id: 'IRN', target_id: 'BHR', value: -55, trend: -0.5 }, // 伊朗 - 巴林：敌对（逊尼派）
  { actor_id: 'IRN', target_id: 'QAT', value: 25, trend: 2.0 },   // 伊朗 - 卡塔尔：友好（共享气田）
  { actor_id: 'IRN', target_id: 'OMN', value: 40, trend: 0.8 },   // 伊朗 - 阿曼：友好（中立调停者）

  // 伊拉克 (IRQ) 的关系
  { actor_id: 'IRQ', target_id: 'SYR', value: 35, trend: 1.0 },   // 伊拉克 - 叙利亚：友好
  { actor_id: 'IRQ', target_id: 'IRN', value: 60, trend: 1.8 },   // 伊拉克 - 伊朗：友好
  { actor_id: 'IRQ', target_id: 'USA', value: 20, trend: -2.5 },  // 伊拉克 - 美国：复杂（驻军问题）
  { actor_id: 'IRQ', target_id: 'ISR', value: -70, trend: -1.0 }, // 伊拉克 - 以色列：敌对
  { actor_id: 'IRQ', target_id: 'SAU', value: 25, trend: 3.2 },   // 伊拉克 - 沙特：缓和
  { actor_id: 'IRQ', target_id: 'TUR', value: -10, trend: -1.8 }, // 伊拉克 - 土耳其：紧张（库尔德问题）
  { actor_id: 'IRQ', target_id: 'KWT', value: 45, trend: 1.5 },   // 伊拉克 - 科威特：友好
  { actor_id: 'IRQ', target_id: 'ARE', value: 30, trend: 2.0 },   // 伊拉克 - 阿联酋：友好
  { actor_id: 'IRQ', target_id: 'EGY', value: 35, trend: 0.5 },   // 伊拉克 - 埃及：友好
  { actor_id: 'IRQ', target_id: 'JOR', value: 50, trend: 1.2 },   // 伊拉克 - 约旦：友好
  { actor_id: 'IRQ', target_id: 'PSE', value: 55, trend: 0.8 },   // 伊拉克 - 巴勒斯坦：友好
  { actor_id: 'IRQ', target_id: 'LBN', value: 40, trend: 0.3 },   // 伊拉克 - 黎巴嫩：友好
  { actor_id: 'IRQ', target_id: 'YEM', value: 10, trend: 0.0 },   // 伊拉克 - 也门：中立
  { actor_id: 'IRQ', target_id: 'BHR', value: 15, trend: 0.5 },   // 伊拉克 - 巴林：谨慎
  { actor_id: 'IRQ', target_id: 'QAT', value: 35, trend: 1.0 },   // 伊拉克 - 卡塔尔：友好
  { actor_id: 'IRQ', target_id: 'OMN', value: 45, trend: 0.5 },   // 伊拉克 - 阿曼：友好

  // 叙利亚 (SYR) 的关系
  { actor_id: 'SYR', target_id: 'IRN', value: 90, trend: 0.3 },   // 叙利亚 - 伊朗：同盟
  { actor_id: 'SYR', target_id: 'RUS', value: 85, trend: 0.5 },   // 叙利亚 - 俄罗斯：同盟
  { actor_id: 'SYR', target_id: 'USA', value: -80, trend: -0.5 }, // 叙利亚 - 美国：敌对
  { actor_id: 'SYR', target_id: 'ISR', value: -90, trend: -1.5 }, // 叙利亚 - 以色列：敌对
  { actor_id: 'SYR', target_id: 'TUR', value: -60, trend: 2.0 },  // 叙利亚 - 土耳其：敌对（缓和中）
  { actor_id: 'SYR', target_id: 'SAU', value: -25, trend: 4.5 },  // 叙利亚 - 沙特：缓和（复交）
  { actor_id: 'SYR', target_id: 'ARE', value: -20, trend: 3.8 },  // 叙利亚 - 阿联酋：缓和（复交）
  { actor_id: 'SYR', target_id: 'EGY', value: 10, trend: 2.5 },   // 叙利亚 - 埃及：缓和
  { actor_id: 'SYR', target_id: 'JOR', value: 5, trend: 1.5 },    // 叙利亚 - 约旦：缓和
  { actor_id: 'SYR', target_id: 'LBN', value: 50, trend: -0.5 },  // 叙利亚 - 黎巴嫩：复杂
  { actor_id: 'SYR', target_id: 'IRQ', value: 40, trend: 0.8 },   // 叙利亚 - 伊拉克：友好
  { actor_id: 'SYR', target_id: 'KWT', value: -10, trend: 2.0 },  // 叙利亚 - 科威特：谨慎
  { actor_id: 'SYR', target_id: 'QAT', value: -15, trend: 1.5 },  // 叙利亚 - 卡塔尔：紧张
  { actor_id: 'SYR', target_id: 'BHR', value: -30, trend: 1.0 },  // 叙利亚 - 巴林：紧张
  { actor_id: 'SYR', target_id: 'OMN', value: 20, trend: 0.5 },   // 叙利亚 - 阿曼：友好
  { actor_id: 'SYR', target_id: 'PSE', value: 45, trend: 0.3 },   // 叙利亚 - 巴勒斯坦：友好

  // 以色列 (ISR) 的关系
  { actor_id: 'ISR', target_id: 'USA', value: 85, trend: -0.5 },  // 以色列 - 美国：同盟（略有波动）
  { actor_id: 'ISR', target_id: 'IRN', value: -95, trend: -3.0 }, // 以色列 - 伊朗：死敌
  { actor_id: 'ISR', target_id: 'SYR', value: -90, trend: -2.0 }, // 以色列 - 叙利亚：敌对
  { actor_id: 'ISR', target_id: 'PSE', value: -75, trend: -1.5 }, // 以色列 - 巴勒斯坦：敌对
  { actor_id: 'ISR', target_id: 'LBN', value: -70, trend: -1.0 }, // 以色列 - 黎巴嫩（真主党）
  { actor_id: 'ISR', target_id: 'SAU', value: 35, trend: 5.0 },   // 以色列 - 沙特：秘密合作（正常化谈判）
  { actor_id: 'ISR', target_id: 'ARE', value: 65, trend: 0.5 },   // 以色列 - 阿联酋：友好（亚伯拉罕协议）
  { actor_id: 'ISR', target_id: 'EGY', value: 55, trend: 0.3 },   // 以色列 - 埃及：和平条约
  { actor_id: 'ISR', target_id: 'JOR', value: 60, trend: 0.2 },   // 以色列 - 约旦：和平条约
  { actor_id: 'ISR', target_id: 'TUR', value: -40, trend: 1.5 },  // 以色列 - 土耳其：紧张（缓和中）
  { actor_id: 'ISR', target_id: 'QAT', value: -30, trend: -0.5 }, // 以色列 - 卡塔尔：紧张
  { actor_id: 'ISR', target_id: 'BHR', value: 50, trend: 0.3 },   // 以色列 - 巴林：友好（亚伯拉罕协议）
  { actor_id: 'ISR', target_id: 'OMN', value: 25, trend: 0.8 },   // 以色列 - 阿曼：谨慎友好
  { actor_id: 'ISR', target_id: 'KWT', value: -20, trend: 0.5 },  // 以色列 - 科威特：紧张
  { actor_id: 'ISR', target_id: 'IRQ', value: -70, trend: -0.5 }, // 以色列 - 伊拉克：敌对
  { actor_id: 'ISR', target_id: 'YEM', value: -60, trend: -1.0 }, // 以色列 - 也门（胡塞）

  // 美国 (USA) 的关系
  { actor_id: 'USA', target_id: 'ISR', value: 85, trend: -0.3 },  // 美国 - 以色列：同盟
  { actor_id: 'USA', target_id: 'SAU', value: 50, trend: -1.5 },  // 美国 - 沙特：复杂（石油/人权）
  { actor_id: 'USA', target_id: 'ARE', value: 70, trend: 0.5 },   // 美国 - 阿联酋：友好
  { actor_id: 'USA', target_id: 'EGY', value: 45, trend: -0.5 },  // 美国 - 埃及：复杂
  { actor_id: 'USA', target_id: 'JOR', value: 75, trend: 0.3 },   // 美国 - 约旦：友好
  { actor_id: 'USA', target_id: 'KWT', value: 65, trend: 0.2 },   // 美国 - 科威特：友好
  { actor_id: 'USA', target_id: 'BHR', value: 60, trend: 0.0 },   // 美国 - 巴林：友好（第五舰队）
  { actor_id: 'USA', target_id: 'QAT', value: 55, trend: 0.5 },   // 美国 - 卡塔尔：友好（军事基地）
  { actor_id: 'USA', target_id: 'OMN', value: 40, trend: 0.8 },   // 美国 - 阿曼：友好
  { actor_id: 'USA', target_id: 'IRN', value: -85, trend: -1.0 }, // 美国 - 伊朗：敌对
  { actor_id: 'USA', target_id: 'SYR', value: -80, trend: -0.5 }, // 美国 - 叙利亚：敌对
  { actor_id: 'USA', target_id: 'IRQ', value: 20, trend: -2.0 },  // 美国 - 伊拉克：复杂
  { actor_id: 'USA', target_id: 'TUR', value: 25, trend: -1.5 },  // 美国 - 土耳其：北约但紧张
  { actor_id: 'USA', target_id: 'PSE', value: -30, trend: -1.0 }, // 美国 - 巴勒斯坦：紧张
  { actor_id: 'USA', target_id: 'LBN', value: -20, trend: 0.0 },  // 美国 - 黎巴嫩：紧张
  { actor_id: 'USA', target_id: 'YEM', value: -50, trend: -0.5 }, // 美国 - 也门（胡塞）

  // 沙特 (SAU) 的关系
  { actor_id: 'SAU', target_id: 'USA', value: 50, trend: -1.0 },  // 沙特 - 美国：复杂
  { actor_id: 'SAU', target_id: 'ARE', value: 70, trend: 0.5 },   // 沙特 - 阿联酋：友好
  { actor_id: 'SAU', target_id: 'EGY', value: 65, trend: 0.3 },   // 沙特 - 埃及：友好
  { actor_id: 'SAU', target_id: 'JOR', value: 60, trend: 0.2 },   // 沙特 - 约旦：友好
  { actor_id: 'SAU', target_id: 'KWT', value: 55, trend: 0.5 },   // 沙特 - 科威特：友好
  { actor_id: 'SAU', target_id: 'BHR', value: 75, trend: 0.0 },   // 沙特 - 巴林：紧密（逊尼派）
  { actor_id: 'SAU', target_id: 'QAT', value: 45, trend: 8.0 },   // 沙特 - 卡塔尔：缓和（断交危机后）
  { actor_id: 'SAU', target_id: 'OMN', value: 50, trend: 0.5 },   // 沙特 - 阿曼：友好
  { actor_id: 'SAU', target_id: 'IRN', value: -45, trend: 4.5 },  // 沙特 - 伊朗：缓和
  { actor_id: 'SAU', target_id: 'TUR', value: -15, trend: 2.5 },  // 沙特 - 土耳其：缓和
  { actor_id: 'SAU', target_id: 'ISR', value: 35, trend: 4.0 },   // 沙特 - 以色列：秘密合作
  { actor_id: 'SAU', target_id: 'SYR', value: -25, trend: 3.5 },  // 沙特 - 叙利亚：缓和
  { actor_id: 'SAU', target_id: 'IRQ', value: 25, trend: 2.5 },   // 沙特 - 伊拉克：缓和
  { actor_id: 'SAU', target_id: 'LBN', value: -10, trend: 1.0 },  // 沙特 - 黎巴嫩：紧张
  { actor_id: 'SAU', target_id: 'PSE', value: 40, trend: 0.5 },   // 沙特 - 巴勒斯坦：友好
  { actor_id: 'SAU', target_id: 'YEM', value: -60, trend: -0.5 }, // 沙特 - 也门（胡塞）：战争

  // 阿联酋 (ARE) 的关系
  { actor_id: 'ARE', target_id: 'SAU', value: 70, trend: 0.3 },   // 阿联酋 - 沙特：友好
  { actor_id: 'ARE', target_id: 'USA', value: 70, trend: 0.5 },   // 阿联酋 - 美国：友好
  { actor_id: 'ARE', target_id: 'ISR', value: 65, trend: 0.5 },   // 阿联酋 - 以色列：友好
  { actor_id: 'ARE', target_id: 'EGY', value: 60, trend: 0.3 },   // 阿联酋 - 埃及：友好
  { actor_id: 'ARE', target_id: 'JOR', value: 55, trend: 0.2 },   // 阿联酋 - 约旦：友好
  { actor_id: 'ARE', target_id: 'BHR', value: 70, trend: 0.0 },   // 阿联酋 - 巴林：友好
  { actor_id: 'ARE', target_id: 'KWT', value: 50, trend: 0.5 },   // 阿联酋 - 科威特：友好
  { actor_id: 'ARE', target_id: 'QAT', value: 40, trend: 6.0 },   // 阿联酋 - 卡塔尔：缓和
  { actor_id: 'ARE', target_id: 'OMN', value: 55, trend: 0.5 },   // 阿联酋 - 阿曼：友好
  { actor_id: 'ARE', target_id: 'IRN', value: -30, trend: 3.0 },  // 阿联酋 - 伊朗：缓和
  { actor_id: 'ARE', target_id: 'TUR', value: 10, trend: 3.5 },   // 阿联酋 - 土耳其：缓和
  { actor_id: 'ARE', target_id: 'SYR', value: -20, trend: 3.0 },  // 阿联酋 - 叙利亚：缓和
  { actor_id: 'ARE', target_id: 'IRQ', value: 30, trend: 1.5 },   // 阿联酋 - 伊拉克：友好
  { actor_id: 'ARE', target_id: 'LBN', value: 5, trend: 0.5 },    // 阿联酋 - 黎巴嫩：谨慎
  { actor_id: 'ARE', target_id: 'PSE', value: 35, trend: 0.0 },   // 阿联酋 - 巴勒斯坦：复杂
  { actor_id: 'ARE', target_id: 'YEM', value: -50, trend: -1.0 }, // 阿联酋 - 也门：复杂

  // 土耳其 (TUR) 的关系
  { actor_id: 'TUR', target_id: 'QAT', value: 70, trend: 0.5 },   // 土耳其 - 卡塔尔：友好（穆兄会）
  { actor_id: 'TUR', target_id: 'IRN', value: 15, trend: -1.0 },  // 土耳其 - 伊朗：复杂
  { actor_id: 'TUR', target_id: 'USA', value: 25, trend: -1.5 },  // 土耳其 - 美国：北约但紧张
  { actor_id: 'TUR', target_id: 'ISR', value: -40, trend: 1.5 },  // 土耳其 - 以色列：紧张
  { actor_id: 'TUR', target_id: 'SAU', value: -15, trend: 2.5 },  // 土耳其 - 沙特：缓和
  { actor_id: 'TUR', target_id: 'ARE', value: 10, trend: 3.0 },   // 土耳其 - 阿联酋：缓和
  { actor_id: 'TUR', target_id: 'EGY', value: -30, trend: 4.0 },  // 土耳其 - 埃及：缓和（穆兄会问题）
  { actor_id: 'TUR', target_id: 'SYR', value: -60, trend: 1.5 },  // 土耳其 - 叙利亚：敌对（缓和中）
  { actor_id: 'TUR', target_id: 'IRQ', value: -10, trend: -1.5 }, // 土耳其 - 伊拉克：紧张（库尔德）
  { actor_id: 'TUR', target_id: 'LBN', value: 20, trend: 0.5 },   // 土耳其 - 黎巴嫩：友好
  { actor_id: 'TUR', target_id: 'JOR', value: 30, trend: 0.3 },   // 土耳其 - 约旦：友好
  { actor_id: 'TUR', target_id: 'KWT', value: 35, trend: 0.5 },   // 土耳其 - 科威特：友好
  { actor_id: 'TUR', target_id: 'BHR', value: -10, trend: 0.5 },  // 土耳其 - 巴林：紧张
  { actor_id: 'TUR', target_id: 'OMN', value: 35, trend: 0.5 },   // 土耳其 - 阿曼：友好
  { actor_id: 'TUR', target_id: 'PSE', value: 55, trend: 0.5 },   // 土耳其 - 巴勒斯坦：友好
  { actor_id: 'TUR', target_id: 'YEM', value: 10, trend: 0.0 },   // 土耳其 - 也门：中立

  // 埃及 (EGY) 的关系
  { actor_id: 'EGY', target_id: 'SAU', value: 65, trend: 0.3 },   // 埃及 - 沙特：友好
  { actor_id: 'EGY', target_id: 'ARE', value: 60, trend: 0.3 },   // 埃及 - 阿联酋：友好
  { actor_id: 'EGY', target_id: 'USA', value: 45, trend: -0.5 },  // 埃及 - 美国：复杂
  { actor_id: 'EGY', target_id: 'ISR', value: 55, trend: 0.3 },   // 埃及 - 以色列：和平条约
  { actor_id: 'EGY', target_id: 'JOR', value: 55, trend: 0.3 },   // 埃及 - 约旦：友好
  { actor_id: 'EGY', target_id: 'KWT', value: 50, trend: 0.3 },   // 埃及 - 科威特：友好
  { actor_id: 'EGY', target_id: 'BHR', value: 55, trend: 0.0 },   // 埃及 - 巴林：友好
  { actor_id: 'EGY', target_id: 'QAT', value: 25, trend: 5.0 },   // 埃及 - 卡塔尔：缓和
  { actor_id: 'EGY', target_id: 'OMN', value: 45, trend: 0.5 },   // 埃及 - 阿曼：友好
  { actor_id: 'EGY', target_id: 'IRN', value: -20, trend: 0.5 },  // 埃及 - 伊朗：紧张
  { actor_id: 'EGY', target_id: 'TUR', value: -30, trend: 3.5 },  // 埃及 - 土耳其：缓和
  { actor_id: 'EGY', target_id: 'SYR', value: 10, trend: 2.0 },   // 埃及 - 叙利亚：缓和
  { actor_id: 'EGY', target_id: 'IRQ', value: 35, trend: 0.5 },   // 埃及 - 伊拉克：友好
  { actor_id: 'EGY', target_id: 'LBN', value: 25, trend: 0.3 },   // 埃及 - 黎巴嫩：友好
  { actor_id: 'EGY', target_id: 'PSE', value: 50, trend: 0.0 },   // 埃及 - 巴勒斯坦：友好（调解者）
  { actor_id: 'EGY', target_id: 'YEM', value: -20, trend: 0.5 },  // 埃及 - 也门：复杂

  // 约旦 (JOR) 的关系
  { actor_id: 'JOR', target_id: 'USA', value: 75, trend: 0.3 },   // 约旦 - 美国：友好
  { actor_id: 'JOR', target_id: 'ISR', value: 60, trend: 0.2 },   // 约旦 - 以色列：和平条约
  { actor_id: 'JOR', target_id: 'SAU', value: 60, trend: 0.3 },   // 约旦 - 沙特：友好
  { actor_id: 'JOR', target_id: 'ARE', value: 55, trend: 0.3 },   // 约旦 - 阿联酋：友好
  { actor_id: 'JOR', target_id: 'EGY', value: 55, trend: 0.3 },   // 约旦 - 埃及：友好
  { actor_id: 'JOR', target_id: 'KWT', value: 50, trend: 0.3 },   // 约旦 - 科威特：友好
  { actor_id: 'JOR', target_id: 'BHR', value: 50, trend: 0.0 },   // 约旦 - 巴林：友好
  { actor_id: 'JOR', target_id: 'QAT', value: 40, trend: 2.0 },   // 约旦 - 卡塔尔：友好
  { actor_id: 'JOR', target_id: 'OMN', value: 45, trend: 0.5 },   // 约旦 - 阿曼：友好
  { actor_id: 'JOR', target_id: 'IRN', value: -35, trend: 0.2 },  // 约旦 - 伊朗：紧张
  { actor_id: 'JOR', target_id: 'SYR', value: 5, trend: 1.5 },    // 约旦 - 叙利亚：缓和
  { actor_id: 'JOR', target_id: 'IRQ', value: 50, trend: 1.0 },   // 约旦 - 伊拉克：友好
  { actor_id: 'JOR', target_id: 'TUR', value: 30, trend: 0.5 },   // 约旦 - 土耳其：友好
  { actor_id: 'JOR', target_id: 'LBN', value: 35, trend: 0.3 },   // 约旦 - 黎巴嫩：友好
  { actor_id: 'JOR', target_id: 'PSE', value: 70, trend: 0.0 },   // 约旦 - 巴勒斯坦：特殊关系
  { actor_id: 'JOR', target_id: 'YEM', value: 10, trend: 0.0 },   // 约旦 - 也门：中立

  // 黎巴嫩 (LBN) 的关系
  { actor_id: 'LBN', target_id: 'SYR', value: 50, trend: -0.5 },  // 黎巴嫩 - 叙利亚：复杂
  { actor_id: 'LBN', target_id: 'IRN', value: 70, trend: 1.0 },   // 黎巴嫩 - 伊朗（真主党）
  { actor_id: 'LBN', target_id: 'SAU', value: -10, trend: 1.0 },  // 黎巴嫩 - 沙特：紧张
  { actor_id: 'LBN', target_id: 'ARE', value: 5, trend: 0.5 },    // 黎巴嫩 - 阿联酋：谨慎
  { actor_id: 'LBN', target_id: 'QAT', value: 30, trend: 0.5 },   // 黎巴嫩 - 卡塔尔：友好
  { actor_id: 'LBN', target_id: 'KWT', value: 15, trend: 0.3 },   // 黎巴嫩 - 科威特：谨慎
  { actor_id: 'LBN', target_id: 'EGY', value: 25, trend: 0.3 },   // 黎巴嫩 - 埃及：友好
  { actor_id: 'LBN', target_id: 'JOR', value: 35, trend: 0.3 },   // 黎巴嫩 - 约旦：友好
  { actor_id: 'LBN', target_id: 'IRQ', value: 40, trend: 0.3 },   // 黎巴嫩 - 伊拉克：友好
  { actor_id: 'LBN', target_id: 'TUR', value: 20, trend: 0.5 },   // 黎巴嫩 - 土耳其：友好
  { actor_id: 'LBN', target_id: 'ISR', value: -70, trend: -1.0 }, // 黎巴嫩 - 以色列：敌对
  { actor_id: 'LBN', target_id: 'USA', value: -20, trend: 0.0 },  // 黎巴嫩 - 美国：紧张
  { actor_id: 'LBN', target_id: 'PSE', value: 60, trend: 0.5 },   // 黎巴嫩 - 巴勒斯坦：友好
  { actor_id: 'LBN', target_id: 'YEM', value: 15, trend: 0.0 },   // 黎巴嫩 - 也门：中立
  { actor_id: 'LBN', target_id: 'BHR', value: -15, trend: 0.3 },  // 黎巴嫩 - 巴林：紧张
  { actor_id: 'LBN', target_id: 'OMN', value: 25, trend: 0.5 },   // 黎巴嫩 - 阿曼：友好

  // 巴勒斯坦 (PSE) 的关系
  { actor_id: 'PSE', target_id: 'IRN', value: 60, trend: 2.5 },   // 巴勒斯坦 - 伊朗
  { actor_id: 'PSE', target_id: 'TUR', value: 55, trend: 0.5 },   // 巴勒斯坦 - 土耳其
  { actor_id: 'PSE', target_id: 'QAT', value: 50, trend: 0.5 },   // 巴勒斯坦 - 卡塔尔
  { actor_id: 'PSE', target_id: 'SAU', value: 40, trend: 0.5 },   // 巴勒斯坦 - 沙特
  { actor_id: 'PSE', target_id: 'EGY', value: 50, trend: 0.0 },   // 巴勒斯坦 - 埃及
  { actor_id: 'PSE', target_id: 'JOR', value: 70, trend: 0.0 },   // 巴勒斯坦 - 约旦
  { actor_id: 'PSE', target_id: 'LBN', value: 60, trend: 0.5 },   // 巴勒斯坦 - 黎巴嫩
  { actor_id: 'PSE', target_id: 'SYR', value: 45, trend: 0.3 },   // 巴勒斯坦 - 叙利亚
  { actor_id: 'PSE', target_id: 'IRQ', value: 55, trend: 0.5 },   // 巴勒斯坦 - 伊拉克
  { actor_id: 'PSE', target_id: 'KWT', value: 35, trend: 0.3 },   // 巴勒斯坦 - 科威特
  { actor_id: 'PSE', target_id: 'ARE', value: 35, trend: 0.0 },   // 巴勒斯坦 - 阿联酋
  { actor_id: 'PSE', target_id: 'ISR', value: -75, trend: -1.5 }, // 巴勒斯坦 - 以色列：敌对
  { actor_id: 'PSE', target_id: 'USA', value: -30, trend: -1.0 }, // 巴勒斯坦 - 美国：紧张
  { actor_id: 'PSE', target_id: 'YEM', value: 40, trend: 0.5 },   // 巴勒斯坦 - 也门
  { actor_id: 'PSE', target_id: 'BHR', value: 20, trend: 0.3 },   // 巴勒斯坦 - 巴林
  { actor_id: 'PSE', target_id: 'OMN', value: 35, trend: 0.5 },   // 巴勒斯坦 - 阿曼

  // 也门 (YEM) 的关系
  { actor_id: 'YEM', target_id: 'IRN', value: 75, trend: -0.5 },  // 也门（胡塞） - 伊朗
  { actor_id: 'YEM', target_id: 'SAU', value: -60, trend: -0.5 }, // 也门 - 沙特：战争
  { actor_id: 'YEM', target_id: 'ARE', value: -50, trend: -1.0 }, // 也门 - 阿联酋
  { actor_id: 'YEM', target_id: 'USA', value: -50, trend: -0.5 }, // 也门 - 美国
  { actor_id: 'YEM', target_id: 'ISR', value: -60, trend: -1.0 }, // 也门 - 以色列
  { actor_id: 'YEM', target_id: 'EGY', value: -20, trend: 0.5 },  // 也门 - 埃及
  { actor_id: 'YEM', target_id: 'TUR', value: 10, trend: 0.0 },   // 也门 - 土耳其
  { actor_id: 'YEM', target_id: 'QAT', value: 30, trend: 0.5 },   // 也门 - 卡塔尔
  { actor_id: 'YEM', target_id: 'KWT', value: 5, trend: 0.3 },    // 也门 - 科威特
  { actor_id: 'YEM', target_id: 'BHR', value: -30, trend: 0.0 },  // 也门 - 巴林
  { actor_id: 'YEM', target_id: 'OMN', value: 40, trend: 1.5 },   // 也门 - 阿曼：调解者
  { actor_id: 'YEM', target_id: 'IRQ', value: 10, trend: 0.0 },   // 也门 - 伊拉克
  { actor_id: 'YEM', target_id: 'SYR', value: 20, trend: 0.0 },   // 也门 - 叙利亚
  { actor_id: 'YEM', target_id: 'LBN', value: 15, trend: 0.0 },   // 也门 - 黎巴嫩
  { actor_id: 'YEM', target_id: 'JOR', value: 10, trend: 0.0 },   // 也门 - 约旦
  { actor_id: 'YEM', target_id: 'PSE', value: 40, trend: 0.5 },   // 也门 - 巴勒斯坦

  // 科威特 (KWT) 的关系
  { actor_id: 'KWT', target_id: 'SAU', value: 55, trend: 0.5 },   // 科威特 - 沙特
  { actor_id: 'KWT', target_id: 'ARE', value: 50, trend: 0.5 },   // 科威特 - 阿联酋
  { actor_id: 'KWT', target_id: 'USA', value: 65, trend: 0.2 },   // 科威特 - 美国
  { actor_id: 'KWT', target_id: 'EGY', value: 50, trend: 0.3 },   // 科威特 - 埃及
  { actor_id: 'KWT', target_id: 'JOR', value: 50, trend: 0.3 },   // 科威特 - 约旦
  { actor_id: 'KWT', target_id: 'BHR', value: 60, trend: 0.0 },   // 科威特 - 巴林
  { actor_id: 'KWT', target_id: 'QAT', value: 45, trend: 4.0 },   // 科威特 - 卡塔尔：缓和
  { actor_id: 'KWT', target_id: 'OMN', value: 50, trend: 0.5 },   // 科威特 - 阿曼
  { actor_id: 'KWT', target_id: 'IRN', value: -15, trend: 1.5 },  // 科威特 - 伊朗：谨慎
  { actor_id: 'KWT', target_id: 'TUR', value: 35, trend: 0.5 },   // 科威特 - 土耳其
  { actor_id: 'KWT', target_id: 'IRQ', value: 45, trend: 1.0 },   // 科威特 - 伊拉克
  { actor_id: 'KWT', target_id: 'SYR', value: -10, trend: 1.5 },  // 科威特 - 叙利亚
  { actor_id: 'KWT', target_id: 'LBN', value: 15, trend: 0.3 },   // 科威特 - 黎巴嫩
  { actor_id: 'KWT', target_id: 'PSE', value: 35, trend: 0.3 },   // 科威特 - 巴勒斯坦
  { actor_id: 'KWT', target_id: 'YEM', value: 5, trend: 0.3 },    // 科威特 - 也门
  { actor_id: 'KWT', target_id: 'ISR', value: -20, trend: 0.5 },  // 科威特 - 以色列

  // 巴林 (BHR) 的关系
  { actor_id: 'BHR', target_id: 'SAU', value: 75, trend: 0.0 },   // 巴林 - 沙特
  { actor_id: 'BHR', target_id: 'ARE', value: 70, trend: 0.0 },   // 巴林 - 阿联酋
  { actor_id: 'BHR', target_id: 'USA', value: 60, trend: 0.0 },   // 巴林 - 美国
  { actor_id: 'BHR', target_id: 'ISR', value: 50, trend: 0.3 },   // 巴林 - 以色列（亚伯拉罕协议）
  { actor_id: 'BHR', target_id: 'EGY', value: 55, trend: 0.0 },   // 巴林 - 埃及
  { actor_id: 'BHR', target_id: 'JOR', value: 50, trend: 0.0 },   // 巴林 - 约旦
  { actor_id: 'BHR', target_id: 'KWT', value: 60, trend: 0.0 },   // 巴林 - 科威特
  { actor_id: 'BHR', target_id: 'QAT', value: 35, trend: 5.0 },   // 巴林 - 卡塔尔：缓和
  { actor_id: 'BHR', target_id: 'OMN', value: 45, trend: 0.5 },   // 巴林 - 阿曼
  { actor_id: 'BHR', target_id: 'IRN', value: -55, trend: -0.5 }, // 巴林 - 伊朗：敌对
  { actor_id: 'BHR', target_id: 'TUR', value: -10, trend: 0.5 },  // 巴林 - 土耳其
  { actor_id: 'BHR', target_id: 'IRQ', value: 15, trend: 0.5 },   // 巴林 - 伊拉克
  { actor_id: 'BHR', target_id: 'SYR', value: -30, trend: 1.0 },  // 巴林 - 叙利亚
  { actor_id: 'BHR', target_id: 'LBN', value: -15, trend: 0.3 },  // 巴林 - 黎巴嫩
  { actor_id: 'BHR', target_id: 'PSE', value: 20, trend: 0.3 },   // 巴林 - 巴勒斯坦
  { actor_id: 'BHR', target_id: 'YEM', value: -30, trend: 0.0 },  // 巴林 - 也门

  // 卡塔尔 (QAT) 的关系
  { actor_id: 'QAT', target_id: 'TUR', value: 70, trend: 0.5 },   // 卡塔尔 - 土耳其
  { actor_id: 'QAT', target_id: 'IRN', value: 25, trend: 1.5 },   // 卡塔尔 - 伊朗（共享气田）
  { actor_id: 'QAT', target_id: 'USA', value: 55, trend: 0.5 },   // 卡塔尔 - 美国
  { actor_id: 'QAT', target_id: 'SAU', value: 45, trend: 7.0 },   // 卡塔尔 - 沙特：缓和
  { actor_id: 'QAT', target_id: 'ARE', value: 40, trend: 5.0 },   // 卡塔尔 - 阿联酋：缓和
  { actor_id: 'QAT', target_id: 'EGY', value: 25, trend: 4.0 },   // 卡塔尔 - 埃及：缓和
  { actor_id: 'QAT', target_id: 'BHR', value: 35, trend: 5.0 },   // 卡塔尔 - 巴林：缓和
  { actor_id: 'QAT', target_id: 'KWT', value: 45, trend: 3.0 },   // 卡塔尔 - 科威特：缓和
  { actor_id: 'QAT', target_id: 'OMN', value: 50, trend: 0.5 },   // 卡塔尔 - 阿曼
  { actor_id: 'QAT', target_id: 'JOR', value: 40, trend: 1.0 },   // 卡塔尔 - 约旦
  { actor_id: 'QAT', target_id: 'IRQ', value: 35, trend: 0.5 },   // 卡塔尔 - 伊拉克
  { actor_id: 'QAT', target_id: 'LBN', value: 30, trend: 0.5 },   // 卡塔尔 - 黎巴嫩
  { actor_id: 'QAT', target_id: 'PSE', value: 50, trend: 0.5 },   // 卡塔尔 - 巴勒斯坦
  { actor_id: 'QAT', target_id: 'YEM', value: 30, trend: 0.5 },   // 卡塔尔 - 也门
  { actor_id: 'QAT', target_id: 'SYR', value: -15, trend: 1.5 },  // 卡塔尔 - 叙利亚
  { actor_id: 'QAT', target_id: 'ISR', value: -30, trend: -0.5 }, // 卡塔尔 - 以色列

  // 阿曼 (OMN) 的关系 - 中立调停者
  { actor_id: 'OMN', target_id: 'IRN', value: 40, trend: 0.8 },   // 阿曼 - 伊朗：友好（调停者）
  { actor_id: 'OMN', target_id: 'SAU', value: 50, trend: 0.5 },   // 阿曼 - 沙特：友好
  { actor_id: 'OMN', target_id: 'ARE', value: 55, trend: 0.5 },   // 阿曼 - 阿联酋：友好
  { actor_id: 'OMN', target_id: 'USA', value: 40, trend: 0.8 },   // 阿曼 - 美国：友好
  { actor_id: 'OMN', target_id: 'QAT', value: 50, trend: 0.5 },   // 阿曼 - 卡塔尔：友好
  { actor_id: 'OMN', target_id: 'KWT', value: 50, trend: 0.5 },   // 阿曼 - 科威特：友好
  { actor_id: 'OMN', target_id: 'BHR', value: 45, trend: 0.5 },   // 阿曼 - 巴林：友好
  { actor_id: 'OMN', target_id: 'EGY', value: 45, trend: 0.5 },   // 阿曼 - 埃及：友好
  { actor_id: 'OMN', target_id: 'JOR', value: 45, trend: 0.5 },   // 阿曼 - 约旦：友好
  { actor_id: 'OMN', target_id: 'TUR', value: 35, trend: 0.5 },   // 阿曼 - 土耳其：友好
  { actor_id: 'OMN', target_id: 'IRQ', value: 45, trend: 0.5 },   // 阿曼 - 伊拉克：友好
  { actor_id: 'OMN', target_id: 'SYR', value: 20, trend: 0.5 },   // 阿曼 - 叙利亚：友好
  { actor_id: 'OMN', target_id: 'LBN', value: 25, trend: 0.5 },   // 阿曼 - 黎巴嫩：友好
  { actor_id: 'OMN', target_id: 'PSE', value: 35, trend: 0.5 },   // 阿曼 - 巴勒斯坦：友好
  { actor_id: 'OMN', target_id: 'YEM', value: 40, trend: 1.5 },   // 阿曼 - 也门：调停者
  { actor_id: 'OMN', target_id: 'ISR', value: 25, trend: 0.8 },   // 阿曼 - 以色列：谨慎
];

// 模拟双边事件数据
export const mockEvents = [
  // 伊朗 - 以色列
  {
    id: 'evt_irn_isr_1',
    actor: 'IRN',
    target: 'ISR',
    type: 'military',
    type_zh: '军事',
    title: 'Iranian Missile Strike on Israeli Positions',
    title_zh: '伊朗导弹袭击以色列阵地',
    description: 'Iran launched ballistic missiles targeting Israeli military installations in the Golan Heights.',
    description_zh: '伊朗发射弹道导弹 targeting 以色列在戈兰高地的军事设施。',
    severity: 'critical',
    timestamp: '2026-03-25T14:30:00Z',
  },
  {
    id: 'evt_irn_isr_2',
    actor: 'ISR',
    target: 'IRN',
    type: 'military',
    type_zh: '军事',
    title: 'Israeli Airstrikes on Iranian Nuclear Facilities',
    title_zh: '以色列空袭伊朗核设施',
    description: 'Israeli Air Force conducted precision strikes on suspected nuclear enrichment sites near Natanz.',
    description_zh: '以色列空军对纳坦兹附近疑似核浓缩设施进行精确打击。',
    severity: 'critical',
    timestamp: '2026-03-22T03:15:00Z',
  },
  
  // 沙特 - 伊朗
  {
    id: 'evt_sau_irn_1',
    actor: 'SAU',
    target: 'IRN',
    type: 'diplomacy',
    type_zh: '外交',
    title: 'Saudi-Iranian Trade Delegation Meeting',
    title_zh: '沙特 - 伊朗贸易代表团会晤',
    description: 'Following China-brokered normalization, both nations discuss reopening trade corridors.',
    description_zh: '在中国斡旋关系正常化后，两国讨论重新开放贸易通道。',
    severity: 'low',
    timestamp: '2026-03-26T10:00:00Z',
  },
  
  // 以色列 - 巴勒斯坦
  {
    id: 'evt_isr_pse_1',
    actor: 'ISR',
    target: 'PSE',
    type: 'military',
    type_zh: '军事',
    title: 'IDF Raid in West Bank',
    title_zh: '以军在约旦河西岸的突袭',
    description: 'Israeli Defense Forces conducted overnight raids in Jenin refugee camp, arresting 12 suspects.',
    description_zh: '以色列国防军在杰宁难民营进行夜间突袭，逮捕 12 名嫌疑人。',
    severity: 'high',
    timestamp: '2026-03-27T02:00:00Z',
  },
  {
    id: 'evt_pse_isr_1',
    actor: 'PSE',
    target: 'ISR',
    type: 'military',
    type_zh: '军事',
    title: 'Rocket Fire from Gaza',
    title_zh: '加沙火箭弹袭击',
    description: 'Hamas militants fired 15 rockets toward southern Israel, Iron Dome intercepted 12.',
    description_zh: '哈马斯武装分子向以色列南部发射 15 枚火箭弹，铁穹拦截 12 枚。',
    severity: 'high',
    timestamp: '2026-03-24T20:45:00Z',
  },
  
  // 美国 - 伊朗
  {
    id: 'evt_usa_irn_1',
    actor: 'USA',
    target: 'IRN',
    type: 'economic',
    type_zh: '经济',
    title: 'US Imposes New Sanctions on Iran',
    title_zh: '美国对伊朗实施新制裁',
    description: 'Treasury Department announces sanctions on Iranian oil smuggling network.',
    description_zh: '财政部宣布制裁伊朗石油走私网络。',
    severity: 'high',
    timestamp: '2026-03-23T16:00:00Z',
  },
  
  // 土耳其 - 叙利亚
  {
    id: 'evt_tur_syr_1',
    actor: 'TUR',
    target: 'SYR',
    type: 'military',
    type_zh: '军事',
    title: 'Turkish Drone Strike in Northern Syria',
    title_zh: '土耳其无人机袭击叙利亚北部',
    description: 'Turkish Armed Forces targeted Kurdish militia positions near the border.',
    description_zh: '土耳其武装部队打击边境附近的库尔德武装阵地。',
    severity: 'high',
    timestamp: '2026-03-26T22:30:00Z',
  },
  
  // 沙特 - 也门
  {
    id: 'evt_sau_yem_1',
    actor: 'SAU',
    target: 'YEM',
    type: 'military',
    type_zh: '军事',
    title: 'Saudi-Led Coalition Airstrikes in Yemen',
    title_zh: '沙特联军空袭也门',
    description: 'Coalition forces targeted Houthi weapons depots in Sanaa.',
    description_zh: '联军部队打击萨那的胡塞武器库。',
    severity: 'high',
    timestamp: '2026-03-25T08:00:00Z',
  },
  
  // 埃及 - 巴勒斯坦（调解）
  {
    id: 'egt_pse_1',
    actor: 'EGY',
    target: 'PSE',
    type: 'diplomacy',
    type_zh: '外交',
    title: 'Egypt Mediates Ceasefire Talks',
    title_zh: '埃及斡旋停火谈判',
    description: 'Egyptian intelligence hosts Hamas and PA representatives in Cairo for ceasefire negotiations.',
    description_zh: '埃及情报部门在开罗接待哈马斯和巴解组织代表进行停火谈判。',
    severity: 'low',
    timestamp: '2026-03-27T11:00:00Z',
  },
  
  // 卡塔尔 - 塔利班（调解者角色）
  {
    id: 'qat_usa_1',
    actor: 'QAT',
    target: 'USA',
    type: 'diplomacy',
    type_zh: '外交',
    title: 'Qatar Hosts US-Taliban Talks',
    title_zh: '卡塔尔主办美国 - 塔利班会谈',
    description: 'Doha continues to serve as key mediation venue for regional negotiations.',
    description_zh: '多哈继续担任区域谈判的关键调解场所。',
    severity: 'low',
    timestamp: '2026-03-21T14:00:00Z',
  },
  
  // 阿联酋 - 以色列
  {
    id: 'are_isr_1',
    actor: 'ARE',
    target: 'ISR',
    type: 'economic',
    type_zh: '经济',
    title: 'UAE-Israel Trade Agreement Expansion',
    title_zh: '阿联酋 - 以色列贸易协议扩大',
    description: 'Both nations announce new technology cooperation framework worth $2 billion.',
    description_zh: '两国宣布价值 20 亿美元的新技术合作框架。',
    severity: 'low',
    timestamp: '2026-03-20T09:00:00Z',
  },
  
  // 伊拉克 - 美国
  {
    id: 'irq_usa_1',
    actor: 'IRQ',
    target: 'USA',
    type: 'diplomacy',
    type_zh: '外交',
    title: 'Iraq Demands US Troop Withdrawal Timeline',
    title_zh: '伊拉克要求美军撤军时间表',
    description: 'Iraqi Parliament calls for concrete timeline for remaining US forces departure.',
    description_zh: '伊拉克议会要求剩余美军撤离的具体时间表。',
    severity: 'medium',
    timestamp: '2026-03-24T12:00:00Z',
  },
  
  // 叙利亚 - 俄罗斯
  {
    id: 'syr_rus_1',
    actor: 'SYR',
    target: 'RUS',
    type: 'military',
    type_zh: '军事',
    title: 'Russia Expands Tartus Naval Base',
    title_zh: '俄罗斯扩建塔尔图斯海军基地',
    description: 'Moscow announces $500M investment in Syrian Mediterranean naval facility.',
    description_zh: '莫斯科宣布投资 5 亿美元扩建叙利亚地中海海军设施。',
    severity: 'medium',
    timestamp: '2026-03-19T15:00:00Z',
  },
];
