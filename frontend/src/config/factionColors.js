// 势力颜色配置 - 古代手绘风格
const FACTION_COLORS = {
  '抵抗轴心': {
    fillColor: '#8B1A1A', // 深红色（伊朗）- pure hex, no transparency
    borderColor: '#e6be8a', // 金色边界
    name: '抵抗轴心'
  },
  '美以联盟': {
    fillColor: '#1E4F8A', // 深蓝色（美国/以色列）- pure hex, no transparency
    borderColor: '#e6be8a', // 金色边界
    name: '美以联盟'
  },
  '温和联盟': {
    fillColor: '#B8860B', // 暗金色（沙特/海湾国家）- pure hex, no transparency
    borderColor: '#e6be8a', // 金色边界
    name: '温和联盟'
  },
  '亲穆兄会': {
    fillColor: '#2D5A27', // 墨绿色（卡塔尔/土耳其）- pure hex, no transparency
    borderColor: '#e6be8a', // 金色边界
    name: '亲穆兄会'
  },
  '中立': {
    fillColor: '#5D5D5D', // 灰色
    borderColor: '#e6be8a', // 金色边界
    name: '中立'
  },
  '未知': {
    fillColor: '#5D5D5D', // 灰色
    borderColor: '#e6be8a', // 金色边界
    name: '未知'
  }
};

// 默认国家到势力的映射
const COUNTRY_FACTION_MAP = {
  '伊朗': '抵抗轴心',
  '伊拉克': '抵抗轴心',
  '叙利亚': '抵抗轴心',
  '黎巴嫩': '抵抗轴心',
  '以色列': '美以联盟',
  '约旦': '美以联盟',
  '沙特阿拉伯': '温和联盟',
  '科威特': '温和联盟',
  '阿联酋': '温和联盟',
  '卡塔尔': '亲穆兄会',
  '土耳其': '亲穆兄会',
  '埃及': '温和联盟',
  '也门': '未知',
  '阿曼': '温和联盟',
  '巴林': '温和联盟'
};

export { FACTION_COLORS, COUNTRY_FACTION_MAP };