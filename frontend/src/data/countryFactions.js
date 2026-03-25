// 国家 - 势力映射表 (2026 年 3 月更新)
// 用于将 GeoJSON 中的国家名映射到游戏势力

export const countryFactions = {
  // 抵抗轴心 🔴
  'Iran': '抵抗轴心',
  'Iraq': '抵抗轴心',
  'Syria': '抵抗轴心',
  'Lebanon': '抵抗轴心',
  'Palestine': '抵抗轴心',
  'Yemen': '抵抗轴心',
  
  // 美以联盟 🔵
  'Israel': '美以联盟',
  'Jordan': '美以联盟',
  'United States of America': '美以联盟',
  'United States': '美以联盟',
  
  // 温和联盟 🟡
  'Saudi Arabia': '温和联盟',
  'Egypt': '温和联盟',
  'Oman': '温和联盟',
  'Kuwait': '温和联盟',
  'Qatar': '温和联盟',
  'United Arab Emirates': '温和联盟',
  'Bahrain': '温和联盟',
  
  // 亲穆兄会 🟢
  'Turkey': '亲穆兄会',
  
  // 其他中东/北非国家 ⚪
  'Libya': '其他',
  'Tunisia': '其他',
  'Algeria': '其他',
  'Morocco': '其他',
  'Sudan': '其他',
  
  // 其他 ⚪
  'Russia': '其他',
  'France': '其他',
  'Germany': '其他',
  'United Kingdom': '其他',
  'China': '其他',
  
  // 默认
  'default': '其他'
};

// 国家名中英文映射（长名用缩写）
export const countryNameMap = {
  // 中东冲突国家（全称）
  'Iran': '伊朗',
  'Iraq': '伊拉克',
  'Syria': '叙利亚',
  'Lebanon': '黎巴嫩',
  'Israel': '以色列',
  'Jordan': '约旦',
  'Saudi Arabia': '沙特',
  'Egypt': '埃及',
  'Yemen': '也门',
  'Oman': '阿曼',
  'Kuwait': '科威特',
  'Qatar': '卡塔尔',
  'United Arab Emirates': '阿联酋',
  'Bahrain': '巴林',
  'Turkey': '土耳其',
  'Palestine': '巴勒斯坦',
  // 其他中东/北非国家
  'Libya': '利比亚',
  'Tunisia': '突尼斯',
  'Algeria': '阿尔及利亚',
  'Morocco': '摩洛哥',
  'Sudan': '苏丹',
  // 中亚国家
  'Kazakhstan': '哈萨克斯坦',
  'Uzbekistan': '乌兹别克斯坦',
  'Turkmenistan': '土库曼斯坦',
  'Tajikistan': '塔吉克斯坦',
  'Kyrgyzstan': '吉尔吉斯斯坦',
  // 大国（缩写）
  'United States of America': '美国',
  'United States': '美国',
  'Russia': '俄罗斯',
  'France': '法国',
  'Germany': '德国',
  'United Kingdom': '英国',
  'China': '中国',
  // 亚洲国家
  'Japan': '日本',
  'South Korea': '韩国',
  'North Korea': '朝鲜',
  'India': '印度',
  'Pakistan': '巴基斯坦',
  'Afghanistan': '阿富汗',
  'Thailand': '泰国',
  'Vietnam': '越南',
  'Malaysia': '马来西亚',
  'Singapore': '新加坡',
  'Indonesia': '印度尼西亚',
  'Philippines': '菲律宾',
  'Myanmar': '缅甸',
  'Cambodia': '柬埔寨',
  'Laos': '老挝',
  'Mongolia': '蒙古',
  // 欧洲国家
  'Italy': '意大利',
  'Spain': '西班牙',
  'Portugal': '葡萄牙',
  'Netherlands': '荷兰',
  'Belgium': '比利时',
  'Switzerland': '瑞士',
  'Austria': '奥地利',
  'Poland': '波兰',
  'Czech Republic': '捷克',
  'Greece': '希腊',
  'Sweden': '瑞典',
  'Norway': '挪威',
  'Denmark': '丹麦',
  'Finland': '芬兰',
  'Ireland': '爱尔兰',
  'Ukraine': '乌克兰',
  'Belarus': '白俄罗斯',
  // 美洲国家
  'Canada': '加拿大',
  'Brazil': '巴西',
  'Argentina': '阿根廷',
  'Mexico': '墨西哥',
  'Colombia': '哥伦比亚',
  'Chile': '智利',
  'Peru': '秘鲁',
  'Venezuela': '委内瑞拉',
  // 大洋洲
  'Australia': '澳大利亚',
  'New Zealand': '新西兰',
  // 非洲国家
  'South Africa': '南非',
  'Nigeria': '尼日利亚',
  'Kenya': '肯尼亚',
  'Ethiopia': '埃塞俄比亚',
  'Egypt': '埃及',
  'Libya': '利比亚',
  'Algeria': '阿尔及利亚',
  'Morocco': '摩洛哥',
  'Tunisia': '突尼斯',
};

// GeoJSON 国家名到 role_id 的映射（用于匹配领导人 API）
export const countryToRoleId = {
  'Iran': 'iran',
  'Iraq': 'iraq',
  'Syria': 'syria',
  'Lebanon': 'lebanon',
  'Israel': 'israel',
  'Jordan': 'jordan',
  'Saudi Arabia': 'saudi_arabia',
  'Egypt': 'egypt',
  'Yemen': 'yemen',
  'Oman': 'oman',
  'Kuwait': 'kuwait',
  'Qatar': 'qatar',
  'United Arab Emirates': 'uae',
  'Bahrain': 'bahrain',
  'Turkey': 'turkey',
  'Palestine': 'palestine',
  // 其他中东/北非国家
  'Libya': 'libya',
  'Tunisia': 'tunisia',
  'Algeria': 'algeria',
  'Morocco': 'morocco',
  'Sudan': 'sudan',
  // 中亚国家
  'Kazakhstan': 'kazakhstan',
  'Uzbekistan': 'uzbekistan',
  'Turkmenistan': 'turkmenistan',
  'Tajikistan': 'tajikistan',
  'Kyrgyzstan': 'kyrgyzstan',
  // 大国
  'United States of America': 'usa',
  'United States': 'usa',
  'Russia': 'russia',
  'France': 'france',
  'Germany': 'germany',
  'United Kingdom': 'uk',
  'China': 'china',
};

// 国家名缩写映射（用于标签显示）
export const countryNameShortMap = {
  'Saudi Arabia': '沙特',
  'United Arab Emirates': '阿联酋',
  'United States of America': '美国',
  'United States': '美国',
  'United Kingdom': '英国',
  'South Korea': '韩国',
  'North Korea': '朝鲜',
  'South Africa': '南非',
  'Central African Republic': '中非',
  'Democratic Republic of the Congo': '刚果 (金)',
  'Republic of the Congo': '刚果 (布)',
  'Bosnia and Herzegovina': '波黑',
  'Trinidad and Tobago': '特立尼达',
  'Antigua and Barbuda': '安提瓜',
  'Saint Vincent and the Grenadines': '圣文森特',
  'Saint Kitts and Nevis': '圣基茨',
  'Sao Tome and Principe': '圣多美',
};

// 国家稳定度数据 (2026 年 3 月 18 日)
export const countryStability = {
  // 抵抗轴心
  'Iran': 42,
  'Iraq': 38,
  'Syria': 35,
  'Lebanon': 28,
  'Palestine': 30,
  'Yemen': 40,
  // 美以联盟
  'Israel': 55,
  'Jordan': 45,
  'United States of America': 60,
  'United States': 60,
  // 温和联盟
  'Saudi Arabia': 48,
  'Egypt': 52,
  'Oman': 50,
  'Kuwait': 42,
  'Qatar': 47,
  'United Arab Emirates': 44,
  'Bahrain': 38,
  // 亲穆兄会
  'Turkey': 55,
  // 其他
  'Russia': 65,
  'France': 70,
  'Germany': 72,
  'United Kingdom': 68,
  'China': 75,
};

// 国家状态数据 (2026 年 3 月 18 日)
export const countryStatus = {
  // 抵抗轴心
  'Iran': '⚠️ 战争状态（最高领袖新立）',
  'Iraq': '⚠️ 境内多派冲突',
  'Syria': '⚠️ 真主党活动区',
  'Lebanon': '⚠️ 南部交战区',
  'Palestine': '⚠️ 哈马斯呼吁克制',
  'Yemen': '⚠️ 胡塞武装支持伊朗',
  // 美以联盟
  'Israel': '⚠️ 战争状态（多线作战）',
  'Jordan': '⚠️ 拦截导弹碎片',
  'United States of America': '⚠️ 8 名军人死亡',
  'United States': '⚠️ 8 名军人死亡',
  // 温和联盟
  'Saudi Arabia': '⚠️ 拦截 61 架无人机',
  'Egypt': '⚠️ 外交斡旋中',
  'Oman': '⚠️ 1 名船员死亡',
  'Kuwait': '⚠️ 6 人死亡',
  'Qatar': '⚠️ 拦截导弹袭击',
  'United Arab Emirates': '⚠️ 石油设施遭袭',
  'Bahrain': '⚠️ 2 人死亡',
  // 亲穆兄会
  'Turkey': '⚠️ 冲突中保持谨慎',
  // 其他
  'Russia': '⚠️ 呼吁停火',
  'France': '🕊️ 外交斡旋',
  'Germany': '🕊️ 反对北约介入',
  'United Kingdom': '🤝 与盟友合作',
  'China': '🕊️ 呼吁和平',
};

// 国家状态数据（英文）
export const countryStatusEn = {
  // Resistance Axis
  'Iran': '⚠️ War (New Supreme Leader)',
  'Iraq': '⚠️ Multi-faction conflict',
  'Syria': '⚠️ Hezbollah activity zone',
  'Lebanon': '⚠️ Southern combat zone',
  'Palestine': '⚠️ Hamas calls for restraint',
  'Yemen': '⚠️ Houthis support Iran',
  // US-Israel Alliance
  'Israel': '⚠️ War (Multi-front)',
  'Jordan': '⚠️ Intercepting missile debris',
  'United States of America': '⚠️ 8 soldiers killed',
  'United States': '⚠️ 8 soldiers killed',
  // Moderate Alliance
  'Saudi Arabia': '⚠️ Intercepted 61 drones',
  'Egypt': '⚠️ Diplomatic mediation',
  'Oman': '⚠️ 1 crew member killed',
  'Kuwait': '⚠️ 6 deaths',
  'Qatar': '⚠️ Intercepting missile attacks',
  'United Arab Emirates': '⚠️ Oil facilities attacked',
  'Bahrain': '⚠️ 2 deaths',
  // Muslim Brotherhood
  'Turkey': '⚠️ Cautious amid conflict',
  // Others
  'Russia': '⚠️ Calls for ceasefire',
  'France': '🕊️ Diplomatic mediation',
  'Germany': '🕊️ Opposes NATO intervention',
  'United Kingdom': '🤝 Cooperating with allies',
  'China': '🕊️ Calls for peace',
};

// 获取国家势力
export const getFaction = (countryName) => {
  return countryFactions[countryName] || countryFactions['default'];
};

// 获取国家中文名
export const getChineseName = (countryName) => {
  return countryNameMap[countryName] || countryName;
};

// 获取国家缩写名（用于地图标签）
export const getShortName = (countryName) => {
  // 先查缩写映射
  if (countryNameShortMap[countryName]) {
    return countryNameShortMap[countryName];
  }
  // 再查普通映射
  if (countryNameMap[countryName]) {
    return countryNameMap[countryName];
  }
  // 默认返回原名
  return countryName;
};

// 获取国家稳定度
export const getStability = (countryName) => {
  return countryStability[countryName] || 65;  // 非冲突国家默认较高稳定度
};

// 获取国家状态
export const getStatus = (countryName) => {
  if (countryStatus[countryName]) {
    return countryStatus[countryName];
  }
  // 非中东冲突国家显示中立状态
  return '🕊️ 非活跃区域';
};

// 获取国家状态（英文）
export const getStatusEn = (countryName) => {
  if (countryStatusEn[countryName]) {
    return countryStatusEn[countryName];
  }
  // 非中东冲突国家显示中立状态
  return '🕊️ Non-Active Region';
};

// 国家国旗映射表（完整版本）
export const countryFlags = {
  // 中东冲突国家
  '伊朗': '🇮🇷',
  '伊拉克': '🇮🇶',
  '叙利亚': '🇸🇾',
  '黎巴嫩': '🇱🇧',
  '以色列': '🇮🇱',
  '约旦': '🇯🇴',
  '沙特': '🇸🇦',
  '沙特阿拉伯': '🇸🇦',
  '埃及': '🇪🇬',
  '也门': '🇾🇪',
  '阿曼': '🇴🇲',
  '科威特': '🇰🇼',
  '卡塔尔': '🇶🇦',
  '阿联酋': '🇦🇪',
  '巴林': '🇧🇭',
  '土耳其': '🇹🇷',
  '巴勒斯坦': '🇵🇸',
  '利比亚': '🇱🇾',
  '突尼斯': '🇹🇳',
  '阿尔及利亚': '🇩🇿',
  '摩洛哥': '🇲🇦',
  '苏丹': '🇸🇩',
  
  // 大国
  '美国': '🇺🇸',
  '俄罗斯': '🇷🇺',
  '中国': '🇨🇳',
  '英国': '🇬🇧',
  '法国': '🇫🇷',
  '德国': '🇩🇪',
  
  // 亚洲国家
  '日本': '🇯🇵',
  '韩国': '🇰🇷',
  '朝鲜': '🇰🇵',
  '印度': '🇮🇳',
  '巴基斯坦': '🇵🇰',
  '孟加拉国': '🇧🇩',
  '阿富汗': '🇦🇫',
  '尼泊尔': '🇳🇵',
  '斯里兰卡': '🇱🇰',
  '缅甸': '🇲🇲',
  '泰国': '🇹🇭',
  '越南': '🇻🇳',
  '老挝': '🇱🇦',
  '柬埔寨': '🇰🇭',
  '马来西亚': '🇲🇾',
  '新加坡': '🇸🇬',
  '印度尼西亚': '🇮🇩',
  '菲律宾': '🇵🇭',
  '文莱': '🇧🇳',
  '蒙古': '🇲🇳',
  '哈萨克斯坦': '🇰🇿',
  '乌兹别克斯坦': '🇺🇿',
  '土库曼斯坦': '🇹🇲',
  '塔吉克斯坦': '🇹🇯',
  '吉尔吉斯斯坦': '🇰🇬',
  '格鲁吉亚': '🇬🇪',
  '亚美尼亚': '🇦🇲',
  '阿塞拜疆': '🇦🇿',
  
  // 欧洲国家
  '意大利': '🇮🇹',
  '西班牙': '🇪🇸',
  '葡萄牙': '🇵🇹',
  '荷兰': '🇳🇱',
  '比利时': '🇧🇪',
  '卢森堡': '🇱🇺',
  '瑞士': '🇨🇭',
  '奥地利': '🇦🇹',
  '波兰': '🇵🇱',
  '捷克': '🇨🇿',
  '斯洛伐克': '🇸🇰',
  '匈牙利': '🇭🇺',
  '罗马尼亚': '🇷🇴',
  '保加利亚': '🇧🇬',
  '希腊': '🇬🇷',
  '瑞典': '🇸🇪',
  '挪威': '🇳🇴',
  '丹麦': '🇩🇰',
  '芬兰': '🇫🇮',
  '冰岛': '🇮🇸',
  '爱尔兰': '🇮🇪',
  '乌克兰': '🇺🇦',
  '白俄罗斯': '🇧🇾',
  '塞尔维亚': '🇷🇸',
  '克罗地亚': '🇭🇷',
  '波斯尼亚和黑塞哥维那': '🇧🇦',
  '阿尔巴尼亚': '🇦🇱',
  '北马其顿': '🇲🇰',
  '斯洛文尼亚': '🇸🇮',
  '爱沙尼亚': '🇪🇪',
  '拉脱维亚': '🇱🇻',
  '立陶宛': '🇱🇹',
  
  // 非洲国家
  '南非': '🇿🇦',
  '尼日利亚': '🇳🇬',
  '肯尼亚': '🇰🇪',
  '埃塞俄比亚': '🇪🇹',
  '加纳': '🇬🇭',
  '坦桑尼亚': '🇹🇿',
  '乌干达': '🇺🇬',
  '卢旺达': '🇷🇼',
  '津巴布韦': '🇿🇼',
  '安哥拉': '🇦🇴',
  '莫桑比克': '🇲🇿',
  '赞比亚': '🇿🇲',
  '博茨瓦纳': '🇧🇼',
  '纳米比亚': '🇳🇦',
  '塞内加尔': '🇸🇳',
  '马里': '🇲🇱',
  '布基纳法索': '🇧🇫',
  '尼日尔': '🇳🇪',
  '乍得': '🇹🇩',
  '喀麦隆': '🇨🇲',
  '刚果': '🇨🇬',
  '刚果民主共和国': '🇨🇩',
  '加蓬': '🇬🇦',
  '赤道几内亚': '🇬🇶',
  '科特迪瓦': '🇨🇮',
  '几内亚': '🇬🇳',
  '塞拉利昂': '🇸🇱',
  '利比里亚': '🇱🇷',
  '毛里塔尼亚': '🇲🇷',
  '厄立特里亚': '🇪🇷',
  '吉布提': '🇩🇯',
  '索马里': '🇸🇴',
  '南苏丹': '🇸🇸',
  '中非共和国': '🇨🇫',
  
  // 美洲国家
  '加拿大': '🇨🇦',
  '墨西哥': '🇲🇽',
  '危地马拉': '🇬🇹',
  '伯利兹': '🇧🇿',
  '萨尔瓦多': '🇸🇻',
  '洪都拉斯': '🇭🇳',
  '尼加拉瓜': '🇳🇮',
  '哥斯达黎加': '🇨🇷',
  '巴拿马': '🇵🇦',
  '古巴': '🇨🇺',
  '海地': '🇭🇹',
  '多米尼加': '🇩🇴',
  '牙买加': '🇯🇲',
  '特立尼达和多巴哥': '🇹🇹',
  '哥伦比亚': '🇨🇴',
  '委内瑞拉': '🇻🇪',
  '圭亚那': '🇬🇾',
  '苏里南': '🇸🇷',
  '厄瓜多尔': '🇪🇨',
  '秘鲁': '🇵🇪',
  '玻利维亚': '🇧🇴',
  '巴拉圭': '🇵🇾',
  '乌拉圭': '🇺🇾',
  '智利': '🇨🇱',
  '阿根廷': '🇦🇷',
  '巴西': '🇧🇷',
  
  // 大洋洲国家
  '澳大利亚': '🇦🇺',
  '新西兰': '🇳🇿',
  '巴布亚新几内亚': '🇵🇬',
  '斐济': '🇫🇯',
  '所罗门群岛': '🇸🇧',
  '瓦努阿图': '🇻🇺',
  '萨摩亚': '🇼🇸',
  '基里巴斯': '🇰🇮',
  '汤加': '🇹🇴',
  
  // 其他
  '不丹': '🇧🇹',
  '马尔代夫': '🇲🇻',
  '塞浦路斯': '🇨🇾',
  '马耳他': '🇲🇹',
  '摩纳哥': '🇲🇨',
  '安道尔': '🇦🇩',
  '圣马力诺': '🇸🇲',
  '梵蒂冈': '🇻🇦',
  '列支敦士登': '🇱🇮',
};
