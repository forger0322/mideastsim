// WorldMapNew.js - 使用 D3 和真实 GeoJSON 数据渲染世界地图
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './WorldMapNew.css';
import { getFaction, getChineseName, getShortName, getStability, getStatus, getStatusEn, countryToRoleId, countryNameMap, countryFlags } from '../data/countryFactions';
import { useTranslation } from '../i18n';

// 获取语言设置（从 localStorage 读取，默认英文）
const getInitialLang = () => {
  return localStorage.getItem('mideastsim_lang') || 'en';
};

// 领导人名字中英文映射（14 位一把手）
const leaderNameMap = {
  '穆杰塔巴·哈梅内伊': 'Mujtaba Khamenei',
  '阿卜杜勒·拉蒂夫·拉希德': 'Abdul Latif Rashid',
  '巴沙尔·阿萨德': 'Bashar al-Assad',
  '纳伊姆·卡西姆': 'Naim Qassem',
  '本雅明·内塔尼亚胡': 'Benjamin Netanyahu',
  '唐纳德·特朗普': 'Donald Trump',
  '萨勒曼国王': 'King Salman',
  '阿卜杜勒·法塔赫·塞西': 'Abdel Fattah el-Sisi',
  '塔米姆·本·哈马德': 'Tamim bin Hamad',
  '穆罕默德·本·扎耶德': 'Mohamed bin Zayed',
  '谢赫·米沙勒': 'Sheikh Mishal',
  '哈马德·本·伊萨': 'Hamad bin Isa',
  '雷杰普·塔伊普·埃尔多安': 'Recep Tayyip Erdoğan',
  '弗拉基米尔·普京': 'Vladimir Putin',
};

// 职位中英文映射
const positionNameMap = {
  '最高领袖': 'Supreme Leader',
  '总统': 'President',
  '总理': 'Prime Minister',
  '国王': 'King',
  '埃米尔': 'Emir',
  '真主党领袖': 'Hezbollah Leader',
  '领导人': 'Leader',
};

// 势力颜色
const FACTION_COLORS = {
  '抵抗轴心': '#8B1A1A',
  '美以联盟': '#1E4F8A',
  '温和联盟': '#B8860B',
  '亲穆兄会': '#2D5A27',
  '其他': '#8B7D6B'
};

// 势力名称中英文映射
const FACTION_NAMES = {
  '抵抗轴心': 'Resistance Axis',
  '美以联盟': 'US-Israel Alliance',
  '温和联盟': 'Moderate Alliance',
  '亲穆兄会': 'Muslim Brotherhood',
  '其他': 'Other'
};

// 领导人数据（2026 年 3 月 18 日更新 - 共 20 位）
const IMAGE_BASE = '/images/leaders';

const LEADERS = [
  // 🔴 抵抗轴心
  { id: 'mujtaba', country: 'Iran', countryCn: '伊朗', leader: '穆杰塔巴·哈梅内伊', leaderEn: 'Mujtaba Khamenei', position: '最高领袖', positionEn: 'Supreme Leader', lat: 35.68, lng: 51.38, color: '#8B1A1A', 
    image: `${IMAGE_BASE}/mujtaba.png`,
    bio: '2026 年 3 月 8 日紧急当选伊朗最高领袖，接替其父哈梅内伊。在德黑兰权力交接仪式上誓言"为遇难者复仇"，宣布进入全国紧急状态。作为革命卫队资深指挥官，他主张对美以采取强硬立场，已下令伊朗导弹部队进入最高战备状态。',
    bioEn: 'Emergency-elected Supreme Leader of Iran on March 8, 2026, succeeding his father Khamenei. Vowed "revenge for the martyrs" at the power transition ceremony in Tehran and declared national emergency. As a veteran IRGC commander, he advocates hardline stance against US and Israel, ordering Iranian missile forces to highest readiness.' },
  { id: 'rashid', country: 'Iraq', countryCn: '伊拉克', leader: '阿卜杜勒·拉蒂夫·拉希德', leaderEn: 'Abdul Latif Rashid', position: '总统', positionEn: 'President', lat: 33.31, lng: 44.36, color: '#8B1A1A',
    image: `${IMAGE_BASE}/rashid.png`,
    bio: '库尔德族政治家，2022 年当选伊拉克总统。境内面临多重挑战：北部库尔德武装、中部逊尼派、南部什叶派民兵组织冲突持续。在地区危机中呼吁各方保持克制，但国内亲伊朗民兵组织活动频繁，局势复杂。',
    bioEn: 'Kurdish politician, elected President of Iraq in 2022. Faces multiple challenges: Kurdish militias in the north, Sunni insurgents in central regions, and Shia militias in the south. Calls for restraint amid regional crisis, but pro-Iranian militias remain active domestically, creating complex situation.' },
  { id: 'assad', country: 'Syria', countryCn: '叙利亚', leader: '巴沙尔·阿萨德', leaderEn: 'Bashar al-Assad', position: '总统', positionEn: 'President', lat: 33.51, lng: 36.29, color: '#8B1A1A',
    image: `${IMAGE_BASE}/assad.png`,
    bio: '2000 年至今担任叙利亚总统，经历内战后巩固政权。允许黎巴嫩真主党从叙境内活动，为伊朗提供通往地中海的陆路通道。目前国家重建缓慢，仍受西方制裁，与俄罗斯、伊朗保持战略同盟关系。',
    bioEn: 'President of Syria since 2000, consolidated power after civil war. Allows Hezbollah operations from Syrian territory, providing Iran land corridor to Mediterranean. National reconstruction remains slow, under Western sanctions, maintains strategic alliance with Russia and Iran.' },
  { id: 'qassem', country: 'Lebanon', countryCn: '黎巴嫩', leader: '纳伊姆·卡西姆', leaderEn: 'Naim Qassem', position: '真主党领袖', positionEn: 'Hezbollah Leader', lat: 33.88, lng: 35.49, color: '#8B1A1A',
    image: `${IMAGE_BASE}/qassem.png`,
    bio: '2025 年接替纳斯鲁拉出任真主党总书记。什叶派武装组织领导人，拥有数万枚火箭弹储备。发表声明称"准备与以色列长期对抗"，得到伊朗持续支持。在黎巴嫩政坛拥有重要影响力，被美以列为恐怖组织。',
    bioEn: 'Became Hezbollah Secretary-General in 2025, succeeding Nasrallah. Leads Shia militant organization with tens of thousands of rockets. Declared "readiness for prolonged confrontation with Israel," receives continuous Iranian support. Holds significant influence in Lebanese politics, designated terrorist by US and Israel.' },
  // 🔵 美以联盟
  { id: 'netanyahu', country: 'Israel', countryCn: '以色列', leader: '本雅明·内塔尼亚胡', leaderEn: 'Benjamin Netanyahu', position: '总理', positionEn: 'Prime Minister', lat: 31.77, lng: 35.21, color: '#1E4F8A',
    image: `${IMAGE_BASE}/netanyahu.png`,
    bio: '以色列史上任期最长总理，2022 年再度执政。在纳吾鲁孜节向伊朗民众发表讲话，盼"自由之年"到来。面临国内政治压力，主张对伊朗核设施采取先发制人打击，与特朗普政府保持密切协调，推动阿拉伯国家与以色列关系正常化。',
    bioEn: 'Longest-serving PM in Israeli history, returned to power in 2022. Addressed Iranian people on Nowruz, hoping for "year of freedom." Faces domestic political pressure, advocates preemptive strikes on Iranian nuclear facilities, coordinates closely with Trump administration, promotes normalization with Arab states.' },
  { id: 'trump', country: 'United States', countryCn: '美国', leader: '唐纳德·特朗普', leaderEn: 'Donald Trump', position: '总统', positionEn: 'President', lat: 38.89, lng: -77.03, color: '#1E4F8A',
    image: `${IMAGE_BASE}/trump.png`,
    bio: '2024 年再度当选美国总统。在危机中称伊朗政权"彻底失败"，要求欧洲和海湾盟友加入护航联盟。延续"极限施压"政策，恢复对伊朗严厉制裁，授权美军在中东地区增兵，支持以色列自卫权利。',
    bioEn: 'Re-elected US President in 2024. Called Iranian regime "complete failure" during crisis, demands European and Gulf allies join escort coalition. Continues "maximum pressure" campaign, restored harsh sanctions on Iran, authorized US troop buildup in Middle East, supports Israel\'s right to self-defense.' },
  // 🟡 温和联盟
  { id: 'salman', country: 'Saudi Arabia', countryCn: '沙特阿拉伯', leader: '萨勒曼国王', leaderEn: 'King Salman', position: '国王', positionEn: 'King', lat: 24.63, lng: 46.71, color: '#B8860B',
    image: `${IMAGE_BASE}/salman.png`,
    bio: '2015 年登基的沙特国王。在伊朗导弹袭击中，沙特防空系统拦截 61 架无人机，仍有 2 名平民死亡。作为两圣地守护者，呼吁各方克制，但坚定支持温和联盟立场，与阿联酋、埃及协调应对地区威胁。',
    bioEn: 'Saudi King since 2015. During Iranian missile attack, Saudi air defense intercepted 61 drones, but 2 civilians died. As Custodian of Two Holy Mosques, calls for restraint but firmly supports Moderate Alliance, coordinates with UAE and Egypt on regional threats.' },
  { id: 'sisi', country: 'Egypt', countryCn: '埃及', leader: '阿卜杜勒·法塔赫·塞西', leaderEn: 'Abdel Fattah el-Sisi', position: '总统', positionEn: 'President', lat: 30.04, lng: 31.23, color: '#B8860B',
    image: `${IMAGE_BASE}/sisi.png`,
    bio: '2014 年政变后掌权，2024 年再度连任。与阿曼外长紧急会谈推动外交解决方案。作为阿拉伯世界人口大国领导人，主张通过对话缓解紧张，但保持强大军事力量。与沙特、阿联酋保持密切协调，反对穆兄会势力扩张。',
    bioEn: 'Seized power in 2014 coup, re-elected 2024. Urgent talks with Omani FM pushing diplomatic solution. As leader of most populous Arab nation, advocates dialogue to ease tensions but maintains strong military. Coordinates closely with Saudi and UAE, opposes Muslim Brotherhood expansion.' },
  { id: 'tamim', country: 'Qatar', countryCn: '卡塔尔', leader: '塔米姆·本·哈马德', leaderEn: 'Tamim bin Hamad', position: '埃米尔', positionEn: 'Emir', lat: 25.28, lng: 51.52, color: '#B8860B',
    image: `${IMAGE_BASE}/tamim.png`,
    bio: '2013 年继任卡塔尔埃米尔。在伊朗导弹袭击中成功拦截，仍有 16 人受伤。作为半岛电视台所有者，在国际舆论场具有影响力。与伊朗共享天然气田，在地区冲突中扮演调停者角色，与美以保持良好关系。',
    bioEn: 'Became Emir of Qatar in 2013. Successfully intercepted during Iranian missile attack, but 16 injured. As owner of Al Jazeera, influential in international media. Shares North Field gas reservoir with Iran, plays mediator role in regional conflicts, maintains good relations with US.' },
  { id: 'mbz', country: 'United Arab Emirates', countryCn: '阿联酋', leader: '穆罕默德·本·扎耶德', leaderEn: 'Mohamed bin Zayed', position: '总统', positionEn: 'President', lat: 24.45, lng: 54.37, color: '#B8860B',
    image: `${IMAGE_BASE}/mbz.png`,
    bio: '2022 年继任阿联酋总统。石油设施遭袭造成 6 人死亡，经济受冲击。作为地区强人，推动与以色列关系正常化，积极参与也门冲突。主张建立海湾集体防御体系，与沙特共同领导温和联盟应对伊朗威胁。',
    bioEn: 'Became UAE President in 2022. Oil facilities attack caused 6 deaths, economic impact. As regional strongman, promotes normalization with Israel, actively participates in Yemen conflict. Advocates Gulf collective defense system, co-leads Moderate Alliance with Saudi against Iranian threat.' },
  { id: 'meshaal', country: 'Kuwait', countryCn: '科威特', leader: '谢赫·米沙勒', leaderEn: 'Sheikh Mishal', position: '埃米尔', positionEn: 'Emir', lat: 29.37, lng: 47.97, color: '#B8860B',
    image: `${IMAGE_BASE}/meshaal.png`,
    bio: '2023 年继任科威特埃米尔。在地区冲突中遭受袭击，6 人死亡（含 2 士兵、2 平民、1 女童）。作为重要产油国，呼吁保护海湾航运安全。在伊朗与西方之间保持平衡外交，主张通过对话解决争端。',
    bioEn: 'Became Emir of Kuwait in 2023. Attacked during regional conflict, 6 deaths (2 soldiers, 2 civilians, 1 girl). As major oil producer, calls for protecting Gulf shipping security. Maintains balanced diplomacy between Iran and West, advocates dialogue to resolve disputes.' },
  { id: 'hamad', country: 'Bahrain', countryCn: '巴林', leader: '哈马德·本·伊萨', leaderEn: 'Hamad bin Isa', position: '国王', positionEn: 'King', lat: 26.21, lng: 50.58, color: '#B8860B',
    image: `${IMAGE_BASE}/hamad.png`,
    bio: '1999 年登基的巴林国王。在袭击中 2 人死亡，国家石油公司宣布遇不可抗力。国内什叶派占多数但由逊尼派王室统治，依赖沙特和阿联酋安全保护。允许美国海军第五舰队驻扎，是温和联盟重要成员。',
    bioEn: 'King of Bahrain since 1999. Two deaths in attack, national oil company declared force majeure. Shia majority ruled by Sunni royal family, relies on Saudi and UAE security protection. Hosts US Navy Fifth Fleet, important member of Moderate Alliance.' },
  // 🟢 亲穆兄会
  { id: 'erdogan', country: 'Turkey', countryCn: '土耳其', leader: '雷杰普·塔伊普·埃尔多安', leaderEn: 'Recep Tayyip Erdoğan', position: '总统', positionEn: 'President', lat: 39.92, lng: 32.85, color: '#2D5A27',
    image: `${IMAGE_BASE}/erdogan.png`,
    bio: '2003 年至今掌权，2023 年再度连任。在地区冲突中保持平衡，既与伊朗合作又与北约协调。支持穆兄会意识形态，在阿拉伯世界影响力上升。主张土耳其作为地区大国发挥调解作用，同时维护自身在黑海和中东的利益。',
    bioEn: 'In power since 2003, re-elected 2023. Maintains balance in regional conflict, cooperates with Iran while coordinating with NATO. Supports Muslim Brotherhood ideology, rising influence in Arab world. Advocates Turkey\'s mediator role as regional power, protects interests in Black Sea and Middle East.' },
  // ⚪ 其他
  { id: 'putin', country: 'Russia', countryCn: '俄罗斯', leader: '弗拉基米尔·普京', leaderEn: 'Vladimir Putin', position: '总统', positionEn: 'President', lat: 55.75, lng: 37.61, color: '#8B7D6B',
    image: `${IMAGE_BASE}/putin.png`,
    bio: '2000 年至今掌权俄罗斯。在危机中呼吁停火，表示愿意支持和解努力。与伊朗保持军事合作，向叙利亚提供空中支援。利用中东局势分散西方对乌克兰注意力，同时维护俄罗斯在地区的军事基地和能源利益。',
    bioEn: 'Ruled Russia since 2000. Calls for ceasefire in crisis, expresses willingness to support reconciliation efforts. Maintains military cooperation with Iran, provides air support to Syria. Uses Middle East situation to divert Western attention from Ukraine, protects Russian military bases and energy interests in region.' },
];

// 中东冲突相关国家（显示领导人信息）- 14 位一把手
const CONFLICT_COUNTRIES = [
  'Iran', 'Iraq', 'Syria', 'Lebanon', 'Israel', 'United States', 
  'Saudi Arabia', 'Egypt', 'Qatar', 'Kuwait', 'Bahrain', 'United Arab Emirates',
  'Turkey', 'Russia'
];

const WorldMapNew = ({ onRegionSelect, onResetRef, onLeaderSelectRef }) => {
  const { t, lang } = useTranslation();
  const svgRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const projectionRef = useRef(null);
  const [geoData, setGeoData] = useState(null);
  const [leaders, setLeaders] = useState([]);  // 从 API 获取的领导人数据
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [selectedLeader, setSelectedLeader] = useState(null);
  const [hoveredLeader, setHoveredLeader] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 从后端 API 获取领导人数据
  useEffect(() => {
    fetch('/api/leaders')
      .then(res => res.json())
      .then(data => {
        const leaders = data.leaders || [];
        console.log('👥 获取领导人数据:', leaders.length, '个');
        setLeaders(leaders);
      })
      .catch(err => {
        console.error('获取领导人数据失败:', err);
        setLeaders([]);
      });
  }, []);

  // 监听语言切换事件（lang 来自 useTranslation hook，会自动更新）
  useEffect(() => {
    const handleLangChange = (e) => {
      console.log('🌐 语言切换:', e.detail.lang);
      // lang 会通过 useTranslation hook 自动更新，无需手动设置
    };
    
    window.addEventListener('langchange', handleLangChange);
    return () => window.removeEventListener('langchange', handleLangChange);
  }, [lang]);

  // 语言变化时更新国家标签
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const mapGroup = svg.select('g.map-content');
    const pathGenerator = d3.geoPath().projection(projectionRef.current);
    
    // 更新现有标签
    mapGroup.selectAll('text.country-label')
      .attr('data-name', d => lang === 'zh' ? getShortName(d.properties.name) : d.properties.name)
      .text(d => lang === 'zh' ? getShortName(d.properties.name) : d.properties.name);
  }, [lang]);

  // 加载 GeoJSON 数据
  useEffect(() => {
    fetch('/data/geo/world.geojson')
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(data => {
        console.log('🗺️ 地图数据加载成功，features:', data.features?.length);
        setGeoData(data);
      })
      .catch(err => {
        console.error('加载地图数据失败:', err);
        fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
          .then(res => res.json())
          .then(data => {
            console.log('从 GitHub 加载成功');
            setGeoData(data);
          })
          .catch(err2 => console.error('备用加载也失败:', err2));
      });
  }, []);

  // 初始化 zoom behavior - 只运行一次
  useEffect(() => {
    if (!svgRef.current || isInitialized) return;

    const svg = d3.select(svgRef.current);
    const width = 900;
    const height = 620;

    // 创建 zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.5, 5])
      .filter(function(event) {
        // 允许滚轮和鼠标左键拖拽
        return (!event.ctrlKey || event.type === 'wheel') && (event.type === 'wheel' || (event.type === 'mousedown' && event.button === 0));
      })
      .on('zoom', function(event) {
        svg.select('g.map-content').attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoomBehavior;
    
    // 在 SVG 上应用 zoom
    svg.call(zoomBehavior);
    
    setIsInitialized(true);
    console.log('🔧 Zoom 初始化完成');
  }, [isInitialized]);

  // 导出重置函数
  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        setSelectedCountry(null);
        setHoveredCountry(null);
        setSelectedLeader(null);
        if (zoomBehaviorRef.current && svgRef.current) {
          const svg = d3.select(svgRef.current);
          svg.transition().duration(750).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
        }
      };
    }
  }, []);

  // 导出领导人定位函数
  useEffect(() => {
    if (onLeaderSelectRef) {
      onLeaderSelectRef.current = (leader) => {
        console.log('🎯 定位领导人:', leader);
        
        if (!projectionRef.current) return;
        
        const coords = projectionRef.current([leader.lng, leader.lat]);
        if (!coords) return;
        
        const [x, y] = coords;
        
        if (zoomBehaviorRef.current && svgRef.current) {
          const svg = d3.select(svgRef.current);
          const targetScale = 3;
          
          const transform = d3.zoomIdentity
            .translate((900 / 2) - x * targetScale, (620 / 2) - y * targetScale)
            .scale(targetScale);
          
          svg.transition().duration(1000).call(zoomBehaviorRef.current.transform, transform);
        }
        
        const leaderFO = d3.select(`foreignObject.leader-fo[data-id="${leader.id}"]`);
        if (!leaderFO.empty()) {
          leaderFO.select('div')
            .style('border-color', '#FFD700')
            .style('box-shadow', '0 0 20px rgba(255, 215, 0, 0.8)');
          
          setTimeout(() => {
            leaderFO.select('div')
              .style('border-color', leader.color)
              .style('box-shadow', '0 2px 8px rgba(0,0,0,0.4)');
          }, 3000);
        }
        
        setHoveredLeader(leader);
        setTooltipPos({ x: x + 20, y: y - 20 });
        
        setTimeout(() => setHoveredLeader(null), 2000);
      };
    }
  }, []);

  // 绘制地图 - 只在 geoData 变化时重绘
  useEffect(() => {
    if (!geoData || !svgRef.current) return;

    const startTime = performance.now();
    const svg = d3.select(svgRef.current);
    const width = 900;
    const height = 620;

    // 清除旧内容
    svg.selectAll('*').remove();
    
    // 添加 XHTML namespace 以支持 foreignObject
    svg.attr('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');

    // 创建投影（聚焦中东）
    projectionRef.current = d3.geoMercator()
      .center([35, 30])
      .scale(350)
      .translate([width / 2, height / 2]);
    
    const pathGenerator = d3.geoPath().projection(projectionRef.current);

    // 预计算颜色
    const featureColors = geoData.features.map(d => {
      const faction = getFaction(d.properties.name);
      return FACTION_COLORS[faction] || FACTION_COLORS['其他'];
    });

    // 创建地图组
    const mapGroup = svg.append('g').attr('class', 'map-content');

    // 绘制国家
    mapGroup.selectAll('path.country')
      .data(geoData.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', pathGenerator)
      .attr('fill', (d, i) => featureColors[i])
      .attr('fill-opacity', 0.7)
      .attr('stroke', '#3A2C1A')
      .attr('stroke-width', 0.5)
      .attr('vector-effect', 'non-scaling-stroke')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('fill-opacity', 0.9).attr('stroke-width', 2);
        setHoveredCountry(d.properties.name);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).attr('fill-opacity', 0.7).attr('stroke-width', 0.5);
        setHoveredCountry(null);
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        const countryName = d.properties.name;
        console.log('🗺️ 点击国家:', countryName);
        setSelectedCountry(countryName);
        if (onRegionSelect) {
          // 查找该国领导人
          const countryNameEn = d.properties.name;
          const countryNameCn = getChineseName(d.properties.name);
          // 使用映射表查找 role_id
          const roleId = countryToRoleId[countryNameEn];
          const leader = roleId ? leaders.find(l => l.role_id === roleId) : null;
          
          onRegionSelect({
            id: d.properties.id || d.properties.iso_a2,
            name: countryNameCn,
            nameEn: countryNameEn,
            faction: getFaction(countryNameCn),
            leader: leader ? leader.name : null,
            leaderEn: leader ? (leaderNameMap[leader.name] || leader.name_en) : null,
            leaderAvatar: leader ? leader.avatar_url : null,
          });
        }
      });

    // 添加国家标签 - 根据语言显示英文或中文
    const updateCountryLabels = () => {
      mapGroup.selectAll('text.country-label')
        .data(geoData.features)
        .join('text')
        .attr('class', 'country-label')
        .attr('data-name', d => lang === 'zh' ? getShortName(d.properties.name) : d.properties.name)
        .attr('x', d => pathGenerator.centroid(d)[0] || 0)
        .attr('y', d => pathGenerator.centroid(d)[1] || 0)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#F0E6D2')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none')
        .style('text-shadow', '1px 1px 2px rgba(0, 0, 0, 0.9), -1px -1px 2px rgba(0, 0, 0, 0.9), 1px -1px 2px rgba(0, 0, 0, 0.9), -1px 1px 2px rgba(0, 0, 0, 0.9)')
        .text(d => lang === 'zh' ? getShortName(d.properties.name) : d.properties.name);
    };
    
    updateCountryLabels();

    // 添加领导人标记（使用 foreignObject 嵌入 HTML，保持 CSS 裁剪效果）
    const leaderGroup = mapGroup.append('g').attr('class', 'leader-markers');
    
    LEADERS.forEach(leader => {
      const coords = projectionRef.current([leader.lng, leader.lat]);
      if (!coords) return;
      
      const [x, y] = coords;
      
      // foreignObject 允许在 SVG 内部嵌入 HTML
      const fo = leaderGroup.append('foreignObject')
        .attr('class', 'leader-fo')
        .attr('data-id', leader.id)
        .attr('x', x - 14)  // 中心定位 (28/2)
        .attr('y', y - 14)
        .attr('width', 28)
        .attr('height', 28)
        .style('overflow', 'visible');
      
      // 嵌入 HTML div（使用 XHTML namespace）
      const div = fo.append('xhtml:div')
        .style('width', '28px')
        .style('height', '28px')
        .style('border-radius', '50%')
        .style('border', '2px solid ' + leader.color)
        .style('background-image', `url(${leader.image})`)
        .style('background-size', 'cover')
        .style('background-position', 'center')
        .style('background-repeat', 'no-repeat')
        .style('cursor', 'pointer')
        .style('transition', 'all 0.2s ease')
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.4)');
      
      // 交互事件
      div.on('click', (event) => {
        event.stopPropagation();
        setSelectedLeader(leader);
      })
      .on('mouseenter', (event) => {
        div.style('border-color', '#FFD700')
           .style('transform', 'scale(1.2)')
           .style('box-shadow', '0 4px 16px rgba(212,175,55,0.6)');
        
        const rect = svgRef.current.getBoundingClientRect();
        setHoveredLeader(leader);
        setTooltipPos({ 
          x: event.clientX - rect.left + 15, 
          y: event.clientY - rect.top + 15 
        });
      })
      .on('mouseleave', () => {
        div.style('border-color', leader.color)
           .style('transform', null)
           .style('box-shadow', '0 2px 8px rgba(0,0,0,0.4)');
        setHoveredLeader(null);
      });
    });

    console.log(`🗺️ 地图渲染完成：${(performance.now() - startTime).toFixed(2)}ms`);
  }, [geoData, onRegionSelect]);

  return (
    <div className="world-map-new-container">
      {!geoData && (
        <div className="map-loading">
          <div className="map-loading-content">
            <div className="compass-loader">
              <div className="compass-outer"></div>
              <div className="compass-inner">🧭</div>
              <div className="compass-directions"></div>
            </div>
            <div className="loading-text">{t('loading.map')}</div>
            <div className="loading-subtext">⏳ {t('loading.waiting')} ⏳</div>
          </div>
        </div>
      )}
      
      <svg
        ref={svgRef}
        width="900"
        height="620"
        viewBox="0 0 900 620"
        className="world-map-new"
      />
      
      {/* 图例 */}
      <div className="map-legend-new">
        <div className="legend-title">{lang === 'zh' ? '📜 势力图例' : '📜 Faction Legend'}</div>
        {Object.entries(FACTION_COLORS).map(([faction, color]) => (
          <div key={faction} className="legend-item-new">
            <span className="legend-color" style={{ backgroundColor: color }} />
            <span className="legend-text">{lang === 'zh' ? faction : (FACTION_NAMES[faction] || faction)}</span>
          </div>
        ))}
      </div>
      
      {/* 领导人悬浮提示 */}
      {hoveredLeader && (
        <div className="leader-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <div className="leader-tooltip-avatar">
            <img src={hoveredLeader.image || 'https://via.placeholder.com/40x40?text=L'} alt={hoveredLeader.leader} />
          </div>
          <div className="leader-tooltip-info">
            <div className="leader-tooltip-name">{lang === 'zh' ? hoveredLeader.leader : (leaderNameMap[hoveredLeader.leader] || hoveredLeader.leaderEn || hoveredLeader.leader)}</div>
            <div className="leader-tooltip-country">
              <span className="country-flag">{countryFlags[hoveredLeader.countryCn] || '🏳️'}</span>
              {lang === 'zh' ? hoveredLeader.countryCn : hoveredLeader.country}
            </div>
          </div>
        </div>
      )}
      
      {/* 国家详情面板 - 地图中央 */}
      {selectedCountry && (() => {
        // 判断是否为冲突相关国家
        const isConflictCountry = CONFLICT_COUNTRIES.includes(selectedCountry);
        
        if (!isConflictCountry) {
          // 非冲突国家：简化显示
          return (
            <div className="country-detail-panel-modal" onClick={() => setSelectedCountry(null)}>
              <div className="country-detail-panel-content country-detail-panel-simple" onClick={(e) => e.stopPropagation()}>
                <button className="close-panel-btn" onClick={() => setSelectedCountry(null)}>×</button>
                <div className="non-active-content">
                  <div className="country-name-large">
                    <span className="country-flag">{countryFlags[countryNameMap[selectedCountry] || selectedCountry] || '🏳️'}</span>
                    {lang === 'zh' ? (countryNameMap[selectedCountry] || selectedCountry) : selectedCountry}
                  </div>
                  <div className="faction-badge other">Other</div>
                  <div className="non-active-message">🕊️ Non-Active Region</div>
                </div>
              </div>
            </div>
          );
        }
        
        // 冲突国家：显示完整信息
        return (
          <div className="country-detail-panel-modal" onClick={() => setSelectedCountry(null)}>
            <div className="country-detail-panel-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-panel-btn" onClick={() => setSelectedCountry(null)}>×</button>
              <div className="country-detail-header">
                <div className="country-name">
                  <span className="country-flag">{countryFlags[countryNameMap[selectedCountry] || selectedCountry] || '🏳️'}</span>
                  {lang === 'zh' ? (countryNameMap[selectedCountry] || selectedCountry) : selectedCountry}
                </div>
                <div className={`faction-badge ${getFaction(selectedCountry)?.toLowerCase().replace(/\s+/g, '-') || 'other'}`}>
                  {lang === 'zh' ? (getFaction(selectedCountry) || '其他') : (FACTION_NAMES[getFaction(selectedCountry)] || 'Other')}
                </div>
              </div>
              <div className="country-detail-grid">
                <div className="detail-item">
                  <span className="detail-label">{t('country.stability')}</span>
                  <span className="detail-value" style={{ color: getStability(selectedCountry) < 40 ? '#ff6b6b' : getStability(selectedCountry) < 50 ? '#ffd93d' : '#6bcb77' }}>
                    {getStability(selectedCountry)}%
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t('country.status')}</span>
                  <span className="detail-value" style={{ fontSize: '12px' }}>{lang === 'zh' ? getStatus(selectedCountry) : getStatusEn(selectedCountry)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t('country.faction')}</span>
                  <span className="detail-value faction-color">{lang === 'zh' ? (getFaction(selectedCountry) || '其他') : (FACTION_NAMES[getFaction(selectedCountry)] || 'Other')}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t('country.leader')}</span>
                  <span className="detail-value">
                    {(() => {
                      const roleId = countryToRoleId[selectedCountry];
                      const leader = roleId ? leaders.find(l => l.role_id === roleId) : null;
                      if (!leader) return t('country.noData');
                      return lang === 'zh' ? leader.name : (leaderNameMap[leader.name] || leader.name_en || leader.name);
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* 领导人详情面板 - 地图中央 */}
      {selectedLeader && (
        <div className="leader-detail-panel-modal" onClick={() => setSelectedLeader(null)}>
          <div className="leader-detail-panel-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-panel-btn" onClick={() => setSelectedLeader(null)}>×</button>
            <div className="leader-detail-header">
              <div className="leader-avatar">
                <img src={selectedLeader.image || 'https://via.placeholder.com/120x120?text=Leader'} alt={selectedLeader.leader} onError={(e) => e.target.src = 'https://via.placeholder.com/120x120?text=Leader'} />
              </div>
              <div className="leader-info">
                <h3 className="leader-name">{lang === 'zh' ? selectedLeader.leader : (leaderNameMap[selectedLeader.leader] || selectedLeader.leaderEn || selectedLeader.leader)}</h3>
                <div className="leader-country">
                  <span className="country-flag">{countryFlags[selectedLeader.countryCn] || '🏳️'}</span>
                  {lang === 'zh' ? selectedLeader.countryCn : selectedLeader.country}
                </div>
                <div className="leader-faction" style={{ backgroundColor: selectedLeader.color }}>
                  {lang === 'zh' ? (Object.entries(FACTION_COLORS).find(([_, color]) => color === selectedLeader.color)?.[0] || '其他') : (FACTION_NAMES[Object.entries(FACTION_COLORS).find(([_, color]) => color === selectedLeader.color)?.[0]] || 'Other')}
                </div>
              </div>
            </div>
            <div className="leader-detail-grid">
              <div className="detail-item">
                <span className="detail-label">{lang === 'zh' ? '职位' : 'Position'}</span>
                <span className="detail-value">{lang === 'zh' ? selectedLeader.position : (positionNameMap[selectedLeader.position] || selectedLeader.positionEn || selectedLeader.position || 'Leader')}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{lang === 'zh' ? '坐标' : 'Coordinates'}</span>
                <span className="detail-value">{selectedLeader.lat.toFixed(2)}°N, {selectedLeader.lng.toFixed(2)}°E</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{lang === 'zh' ? '势力颜色' : 'Faction Color'}</span>
                <span className="detail-value">
                  <span className="faction-color-dot" style={{ backgroundColor: selectedLeader.color }} />
                  {selectedLeader.color}
                </span>
              </div>
            </div>
            <div className="leader-bio">
              <h4>{lang === 'zh' ? '📖 简介' : '📖 Biography'}</h4>
              <p>{lang === 'zh' ? selectedLeader.bio : (selectedLeader.bioEn || selectedLeader.bio)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldMapNew;
