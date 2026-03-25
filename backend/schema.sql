-- MideastSim 数据库 Schema (SQLite)
-- 后续可迁移至 PostgreSQL

-- ============================================
-- 1. 角色表（国家/势力）
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,              -- ISO3 代码或自定义 ID
    name TEXT NOT NULL,               -- 国家/势力名称
    name_en TEXT,                     -- 英文名称
    faction TEXT,                     -- 所属势力联盟
    player_id TEXT,                   -- 绑定的玩家 ID（NULL 表示 AI 控制）
    is_alive INTEGER DEFAULT 1,       -- 是否存活 (1=存活，0=灭亡)
    is_active INTEGER DEFAULT 1,      -- 是否活跃 (1=活跃，0=离线)
    last_active TIMESTAMP,            -- 最后活跃时间
    
    -- 国力属性 (JSON 格式存储，便于扩展)
    attributes TEXT DEFAULT '{}',     -- JSON: {"army": 50, "navy": 30, ...}
    
    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 关系表（双边关系值）
-- ============================================
CREATE TABLE IF NOT EXISTS relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT NOT NULL,           -- 主动方 ISO3
    target_id TEXT NOT NULL,          -- 被动方 ISO3
    value REAL DEFAULT 0,             -- 关系值 (-100~100, 负=敌对，正=友好)
    trend REAL DEFAULT 0,             -- 趋势 (-10~10, 负=恶化，正=改善)
    last_changed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(actor_id, target_id)
);

-- ============================================
-- 3. 战争表
-- ============================================
CREATE TABLE IF NOT EXISTS wars (
    id TEXT PRIMARY KEY,              -- 战争 ID
    aggressor_id TEXT NOT NULL,       -- 进攻方 ISO3
    defender_id TEXT NOT NULL,        -- 防守方 ISO3
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,               -- NULL 表示进行中
    status TEXT DEFAULT 'ongoing',    -- ongoing/ceasefire/peace/annexed
    casualty_attacker INTEGER DEFAULT 0,  -- 进攻方伤亡
    casualty_defender INTEGER DEFAULT 0,  -- 防守方伤亡
    result TEXT,                      -- 战争结果描述
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. 事件历史表
-- ============================================
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,              -- 事件 ID
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location TEXT,                    -- 发生地点
    type TEXT NOT NULL,               -- 事件类型：diplomacy/military/economic/intel
    severity INTEGER DEFAULT 1,       -- 严重程度 (1-5)
    
    actor_id TEXT,                    -- 主要参与方 ISO3
    target_id TEXT,                   -- 目标方 ISO3（可选）
    
    title TEXT,                       -- 事件标题
    description TEXT NOT NULL,        -- 事件描述
    data TEXT,                        -- 附加数据 (JSON)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. 同盟表
-- ============================================
CREATE TABLE IF NOT EXISTS alliances (
    id TEXT PRIMARY KEY,              -- 同盟 ID
    name TEXT NOT NULL,               -- 同盟名称
    leader_id TEXT,                   -- 盟主 ISO3
    type TEXT DEFAULT 'mutual',       -- mutual/defense/non_aggression
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 同盟成员关系表
CREATE TABLE IF NOT EXISTS alliance_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alliance_id TEXT NOT NULL,
    member_id TEXT NOT NULL,          -- 成员 ISO3
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role TEXT DEFAULT 'member',       -- leader/member/observer
    status TEXT DEFAULT 'active',     -- active/suspended/expelled
    
    UNIQUE(alliance_id, member_id)
);

-- ============================================
-- 6. 玩家表
-- ============================================
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,              -- 玩家 ID (UUID 或 JWT subject)
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT,               --  bcrypt 加密
    jwt_secret TEXT,                  -- 玩家专属 JWT 密钥
    role_id TEXT,                     -- 当前绑定的角色 ID (ISO3)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- ============================================
-- 7. 行动日志表（审计用）
-- ============================================
CREATE TABLE IF NOT EXISTS action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actor_id TEXT NOT NULL,           -- 执行方 ISO3
    action_type TEXT NOT NULL,        -- war/sanction/alliance/peace/etc
    target_id TEXT,                   -- 目标方 ISO3
    params TEXT,                      -- 行动参数 (JSON)
    result TEXT,                      -- 执行结果 (success/failed)
    message TEXT                      -- 结果消息
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. 领导人表
-- ============================================
CREATE TABLE IF NOT EXISTS leaders (
    id TEXT PRIMARY KEY,              -- 领导人 ID
    role_id TEXT NOT NULL,            -- 所属国家 ISO3
    name TEXT NOT NULL,               -- 领导人姓名（中文）
    name_en TEXT,                     -- 领导人姓名（英文）
    title TEXT,                       -- 头衔（中文）
    title_en TEXT,                    -- 头衔（英文）
    avatar_url TEXT,                  -- 头像 URL
    latitude REAL,                    -- 纬度
    longitude REAL,                   -- 经度
    is_alive INTEGER DEFAULT 1,       -- 是否存活/在任
    color TEXT DEFAULT '#FF0000',     -- 地图标记颜色
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ============================================
-- 索引优化
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_wars_status ON wars(status);
CREATE INDEX IF NOT EXISTS idx_relations_actor ON relations(actor_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);
CREATE INDEX IF NOT EXISTS idx_roles_faction ON roles(faction);
CREATE INDEX IF NOT EXISTS idx_roles_player ON roles(player_id);
CREATE INDEX IF NOT EXISTS idx_leaders_role ON leaders(role_id);
CREATE INDEX IF NOT EXISTS idx_leaders_alive ON leaders(is_alive);

-- ============================================
-- 初始数据 - 中东主要国家
-- ============================================
INSERT OR IGNORE INTO roles (id, name, name_en, faction, attributes) VALUES
('IRN', '伊朗', 'Iran', '抵抗轴心', '{"army":75,"navy":40,"air_force":60,"nuclear":80,"economy":55,"stability":65,"diplomacy":70,"intel":75}'),
('IRQ', '伊拉克', 'Iraq', '抵抗轴心', '{"army":50,"navy":20,"air_force":35,"nuclear":0,"economy":40,"stability":45,"diplomacy":55,"intel":40}'),
('SYR', '叙利亚', 'Syria', '抵抗轴心', '{"army":45,"navy":25,"air_force":40,"nuclear":0,"economy":25,"stability":35,"diplomacy":50,"intel":55}'),
('LBN', '黎巴嫩', 'Lebanon', '抵抗轴心', '{"army":20,"navy":15,"air_force":10,"nuclear":0,"economy":30,"stability":40,"diplomacy":45,"intel":35}'),
('PSE', '巴勒斯坦', 'Palestine', '抵抗轴心', '{"army":35,"navy":5,"air_force":5,"nuclear":0,"economy":20,"stability":30,"diplomacy":60,"intel":40}'),

('ISR', '以色列', 'Israel', '美以联盟', '{"army":85,"navy":70,"air_force":90,"nuclear":90,"economy":85,"stability":70,"diplomacy":50,"intel":90}'),
('JOR', '约旦', 'Jordan', '美以联盟', '{"army":40,"navy":10,"air_force":30,"nuclear":0,"economy":45,"stability":60,"diplomacy":65,"intel":45}'),
('USA', '美国', 'United States', '美以联盟', '{"army":100,"navy":100,"air_force":100,"nuclear":100,"economy":100,"stability":75,"diplomacy":80,"intel":100}'),

('SAU', '沙特阿拉伯', 'Saudi Arabia', '温和联盟', '{"army":65,"navy":50,"air_force":60,"nuclear":0,"economy":75,"stability":60,"diplomacy":70,"intel":55}'),
('EGY', '埃及', 'Egypt', '温和联盟', '{"army":70,"navy":55,"air_force":55,"nuclear":0,"economy":50,"stability":55,"diplomacy":75,"intel":60}'),
('ARE', '阿联酋', 'UAE', '温和联盟', '{"army":50,"navy":45,"air_force":50,"nuclear":0,"economy":80,"stability":75,"diplomacy":70,"intel":60}'),
('QAT', '卡塔尔', 'Qatar', '温和联盟', '{"army":30,"navy":25,"air_force":35,"nuclear":0,"economy":70,"stability":70,"diplomacy":65,"intel":45}'),
('KWT', '科威特', 'Kuwait', '温和联盟', '{"army":35,"navy":20,"air_force":30,"nuclear":0,"economy":65,"stability":65,"diplomacy":60,"intel":40}'),
('BHR', '巴林', 'Bahrain', '温和联盟', '{"army":25,"navy":30,"air_force":20,"nuclear":0,"economy":60,"stability":60,"diplomacy":55,"intel":35}'),
('OMN', '阿曼', 'Oman', '温和联盟', '{"army":35,"navy":40,"air_force":25,"nuclear":0,"economy":55,"stability":70,"diplomacy":65,"intel":40}'),
('YEM', '也门', 'Yemen', '温和联盟', '{"army":30,"navy":15,"air_force":15,"nuclear":0,"economy":15,"stability":25,"diplomacy":40,"intel":30}'),

('TUR', '土耳其', 'Turkey', '亲穆兄会', '{"army":80,"navy":65,"air_force":70,"nuclear":0,"economy":65,"stability":55,"diplomacy":70,"intel":65}');

-- ============================================
-- 初始关系值（示例）
-- ============================================
INSERT OR IGNORE INTO relations (actor_id, target_id, value, trend) VALUES
-- 抵抗轴心内部（友好）
('IRN', 'SYR', 85, 5), ('IRN', 'IRQ', 75, 3), ('IRN', 'LBN', 80, 5),
('SYR', 'IRN', 85, 5), ('SYR', 'IRQ', 70, 2),
('IRQ', 'IRN', 75, 3), ('IRQ', 'SYR', 70, 2),

-- 美以联盟内部（友好）
('USA', 'ISR', 95, 2), ('ISR', 'USA', 95, 2), ('ISR', 'JOR', 60, 5),
('JOR', 'USA', 70, 2), ('JOR', 'ISR', 60, 5),

-- 温和联盟内部（友好）
('SAU', 'ARE', 80, 5), ('SAU', 'EGY', 70, 3), ('ARE', 'SAU', 80, 5),
('EGY', 'SAU', 70, 3),

-- 敌对关系
('IRN', 'ISR', -90, -5), ('ISR', 'IRN', -95, -3),
('IRN', 'USA', -85, -5), ('USA', 'IRN', -80, -3),
('SYR', 'ISR', -80, -2), ('ISR', 'SYR', -75, -2),
('PSE', 'ISR', -95, -5), ('ISR', 'PSE', -90, -3),

-- 中立/一般关系
('TUR', 'SYR', -30, -2), ('TUR', 'IRQ', 40, 2),
('EGY', 'ISR', 50, 5), ('ISR', 'EGY', 55, 3);
