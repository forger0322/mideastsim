package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

// Database 数据库包装器
type Database struct {
	db *sql.DB
	mu sync.RWMutex
}

// NewDatabase 创建数据库连接
func NewDatabase(dbPath string) (*Database, error) {
	// SQLite 连接参数：WAL 模式 + busy_timeout
	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_busy_timeout=5000&_txlock=immediate")
	if err != nil {
		return nil, err
	}

	// 测试连接
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// SQLite 不适合高并发，设置较小的连接池
	db.SetMaxOpenConns(1)  // 单写入者
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0) // 不回收连接

	// 设置 PRAGMA
	_, err = db.Exec(`
		PRAGMA journal_mode=WAL;
		PRAGMA busy_timeout=5000;
		PRAGMA synchronous=NORMAL;
		PRAGMA cache_size=-64000;
	`)
	if err != nil {
		log.Printf("⚠️ 设置 PRAGMA 失败：%v", err)
	}

	log.Printf("✅ 数据库连接成功：%s (WAL 模式)", dbPath)

	return &Database{
		db: db,
	}, nil
}

// Close 关闭数据库连接
func (d *Database) Close() error {
	return d.db.Close()
}

// InitSchema 初始化数据库表结构
func (d *Database) InitSchema() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	schema := `
	CREATE TABLE IF NOT EXISTS leaders (
		id TEXT PRIMARY KEY,
		role_id TEXT NOT NULL,
		name TEXT NOT NULL,
		name_en TEXT,
		title TEXT,
		title_en TEXT,
		avatar_url TEXT,
		latitude REAL,
		longitude REAL,
		is_alive INTEGER DEFAULT 1,
		color TEXT DEFAULT '#FF0000',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (role_id) REFERENCES roles(id)
	);
	CREATE INDEX IF NOT EXISTS idx_leaders_role ON leaders(role_id);
	CREATE INDEX IF NOT EXISTS idx_leaders_alive ON leaders(is_alive);
	`

	statements := strings.Split(schema, ";")
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := d.db.Exec(stmt); err != nil {
			log.Printf("⚠️ 执行 schema 语句警告：%v", err)
		}
	}

	log.Println("✅ 数据库表结构初始化完成")
	return nil
}

// MigrateAddChineseFields 添加中文字段的迁移
func (d *Database) MigrateAddChineseFields() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	migrations := []string{
		// events 表添加中文字段
		"ALTER TABLE events ADD COLUMN location_zh TEXT",
		"ALTER TABLE events ADD COLUMN title_zh TEXT",
		"ALTER TABLE events ADD COLUMN description_zh TEXT",
		// leaders 表添加国家字段
		"ALTER TABLE leaders ADD COLUMN country TEXT",
		"ALTER TABLE leaders ADD COLUMN country_en TEXT",
	}

	for _, migration := range migrations {
		_, err := d.db.Exec(migration)
		if err != nil {
			// 忽略列已存在的错误
			if !strings.Contains(err.Error(), "duplicate column") {
				log.Printf("⚠️ 迁移警告：%v", err)
			}
		}
	}

	// 更新 leaders 表的 country 字段
	countryUpdates := []struct {
		roleID, country, countryEn string
	}{
		{"iran", "伊朗", "Iran"},
		{"iraq", "伊拉克", "Iraq"},
		{"syria", "叙利亚", "Syria"},
		{"lebanon", "黎巴嫩", "Lebanon"},
		{"israel", "以色列", "Israel"},
		{"usa", "美国", "United States"},
		{"saudi_arabia", "沙特阿拉伯", "Saudi Arabia"},
		{"egypt", "埃及", "Egypt"},
		{"qatar", "卡塔尔", "Qatar"},
		{"uae", "阿联酋", "UAE"},
		{"kuwait", "科威特", "Kuwait"},
		{"bahrain", "巴林", "Bahrain"},
		{"turkey", "土耳其", "Turkey"},
		{"russia", "俄罗斯", "Russia"},
	}

	for _, u := range countryUpdates {
		_, err := d.db.Exec(`UPDATE leaders SET country = ?, country_en = ? WHERE role_id = ?`, u.country, u.countryEn, u.roleID)
		if err != nil {
			log.Printf("⚠️ 更新 %s 国家字段失败：%v", u.roleID, err)
		}
	}

	log.Println("✅ 数据库迁移完成（添加中文字段）")
	return nil
}

// ============================================
// 角色（国家）相关操作
// ============================================

// Role 角色/国家
type Role struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	NameEn       string         `json:"name_en,omitempty"`
	Faction      string         `json:"faction,omitempty"`
	PlayerID     sql.NullString `json:"player_id,omitempty"`
	Leader       interface{}    `json:"leader,omitempty"`
	IsAlive      bool           `json:"is_alive"`
	IsActive     bool           `json:"is_active"`
	LastActive   sql.NullTime   `json:"last_active,omitempty"`
	Attributes   Attributes     `json:"attributes"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

// Attributes 国力属性
type Attributes struct {
	Army       int `json:"army"`
	Navy       int `json:"navy"`
	AirForce   int `json:"air_force"`
	Nuclear    int `json:"nuclear"`
	Economy    int `json:"economy"`
	Stability  int `json:"stability"`
	Diplomacy  int `json:"diplomacy"`
	Intel      int `json:"intel"`
}

// GetAllRoles 获取所有角色
func (d *Database) GetAllRoles() ([]Role, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(`
		SELECT id, name, name_en, faction, player_id, is_alive, is_active, 
		       last_active, attributes, created_at, updated_at
		FROM roles ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var r Role
		var attrJSON string
		err := rows.Scan(
			&r.ID, &r.Name, &r.NameEn, &r.Faction, &r.PlayerID,
			&r.IsAlive, &r.IsActive, &r.LastActive, &attrJSON,
			&r.CreatedAt, &r.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// 解析属性 JSON
		if attrJSON != "" {
			json.Unmarshal([]byte(attrJSON), &r.Attributes)
		}

		roles = append(roles, r)
	}

	return roles, rows.Err()
}

// GetRoleByID 根据 ID 获取角色
func (d *Database) GetRoleByID(id string) (*Role, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var r Role
	var attrJSON string
	err := d.db.QueryRow(`
		SELECT id, name, name_en, faction, player_id, is_alive, is_active,
		       last_active, attributes, created_at, updated_at
		FROM roles WHERE id = ?
	`, id).Scan(
		&r.ID, &r.Name, &r.NameEn, &r.Faction, &r.PlayerID,
		&r.IsAlive, &r.IsActive, &r.LastActive, &attrJSON,
		&r.CreatedAt, &r.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if attrJSON != "" {
		json.Unmarshal([]byte(attrJSON), &r.Attributes)
	}

	return &r, nil
}

// UpdateRoleAttributes 更新角色属性
func (d *Database) UpdateRoleAttributes(id string, attrs Attributes) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	attrJSON, err := json.Marshal(attrs)
	if err != nil {
		return err
	}

	_, err = d.db.Exec(`
		UPDATE roles SET attributes = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, string(attrJSON), id)

	return err
}

// SetRolePlayer 绑定玩家到角色
func (d *Database) SetRolePlayer(id, playerID string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		UPDATE roles SET player_id = ?, is_active = 1, last_active = CURRENT_TIMESTAMP
		WHERE id = ?
	`, playerID, id)

	return err
}

// ReleaseRole 释放角色（玩家离线）
func (d *Database) ReleaseRole(id string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		UPDATE roles SET player_id = NULL, is_active = 0
		WHERE id = ?
	`, id)

	return err
}

// ReleaseRoleByPlayer 根据玩家 ID 释放角色
func (d *Database) ReleaseRoleByPlayer(playerID string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		UPDATE roles SET player_id = NULL, is_active = 0
		WHERE player_id = ?
	`, playerID)

	return err
}

// AssignRoleToPlayer 分配角色给玩家
func (d *Database) AssignRoleToPlayer(roleID, playerID string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		UPDATE roles SET player_id = ?, is_active = 1, last_active = ?
		WHERE id = ?
	`, playerID, time.Now(), roleID)

	return err
}

// ============================================
// 关系相关操作
// ============================================

// Relation 双边关系
type Relation struct {
	ID          int64     `json:"id"`
	ActorID     string    `json:"actor_id"`
	TargetID    string    `json:"target_id"`
	Value       float64   `json:"value"`
	Trend       float64   `json:"trend"`
	LastChanged time.Time `json:"last_changed"`
}

// GetRelation 获取双边关系
func (d *Database) GetRelation(actorID, targetID string) (*Relation, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var r Relation
	err := d.db.QueryRow(`
		SELECT id, actor_id, target_id, value, trend, last_changed
		FROM relations WHERE actor_id = ? AND target_id = ?
	`, actorID, targetID).Scan(
		&r.ID, &r.ActorID, &r.TargetID, &r.Value, &r.Trend, &r.LastChanged,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &r, nil
}

// UpdateRelation 更新关系值
func (d *Database) UpdateRelation(actorID, targetID string, value, trend float64) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		INSERT INTO relations (actor_id, target_id, value, trend, last_changed)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(actor_id, target_id) DO UPDATE SET
			value = excluded.value,
			trend = excluded.trend,
			last_changed = CURRENT_TIMESTAMP
	`, actorID, targetID, value, trend)

	return err
}

// GetAllRelations 获取所有关系
func (d *Database) GetAllRelations() ([]Relation, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(`
		SELECT id, actor_id, target_id, value, trend, last_changed
		FROM relations ORDER BY actor_id, target_id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var relations []Relation
	for rows.Next() {
		var r Relation
		err := rows.Scan(&r.ID, &r.ActorID, &r.TargetID, &r.Value, &r.Trend, &r.LastChanged)
		if err != nil {
			return nil, err
		}
		relations = append(relations, r)
	}

	return relations, rows.Err()
}

// ============================================
// 事件相关操作
// ============================================

// Event 事件
type Event struct {
	ID            string         `json:"id"`
	Timestamp     time.Time      `json:"timestamp"`
	Location      string         `json:"location,omitempty"`
	LocationZh    string         `json:"location_zh,omitempty"`
	Type          string         `json:"type"`
	Severity      int            `json:"severity,omitempty"`
	ActorID       string         `json:"actor_id,omitempty"`
	ActorName     string         `json:"actor_name,omitempty"`
	TargetID      string         `json:"target_id,omitempty"`
	TargetName    string         `json:"target_name,omitempty"`
	Title         string         `json:"title,omitempty"`
	TitleZh       string         `json:"title_zh,omitempty"`
	Description   string         `json:"description"`
	DescriptionZh string         `json:"description_zh,omitempty"`
	Data          map[string]interface{} `json:"data,omitempty"`
}

// CreateEvent 创建事件
func (d *Database) CreateEvent(event *Event) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	dataJSON := ""
	if event.Data != nil {
		b, _ := json.Marshal(event.Data)
		dataJSON = string(b)
	}

	_, err := d.db.Exec(`
		INSERT INTO events (id, timestamp, location, location_zh, type, severity, actor_id, target_id, title, title_zh, description, description_zh, data)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, event.ID, event.Timestamp, event.Location, event.LocationZh, event.Type, event.Severity,
		event.ActorID, event.TargetID, event.Title, event.TitleZh, event.Description, event.DescriptionZh, dataJSON)

	return err
}

// GetRecentEvents 获取最近事件
func (d *Database) GetRecentEvents(limit int) ([]Event, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(`
		SELECT id, timestamp, location, location_zh, type, severity, actor_id, target_id, title, title_zh, description, description_zh, data
		FROM events ORDER BY timestamp DESC LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		var location, locationZh, targetID, titleZh, descriptionZh, dataStr sql.NullString
		err := rows.Scan(
			&e.ID, &e.Timestamp, &location, &locationZh, &e.Type, &e.Severity,
			&e.ActorID, &targetID, &e.Title, &titleZh, &e.Description, &descriptionZh, &dataStr,
		)
		if err != nil {
			return nil, err
		}
		if location.Valid {
			e.Location = location.String
		}
		if locationZh.Valid {
			e.LocationZh = locationZh.String
		}
		if targetID.Valid {
			e.TargetID = targetID.String
		}
		if titleZh.Valid {
			e.TitleZh = titleZh.String
		}
		if descriptionZh.Valid {
			e.DescriptionZh = descriptionZh.String
		}
		if dataStr.Valid && dataStr.String != "" {
			json.Unmarshal([]byte(dataStr.String), &e.Data)
		}
		events = append(events, e)
	}

	return events, rows.Err()
}

// ============================================
// 战争相关操作
// ============================================

// War 战争
type War struct {
	ID               string     `json:"id"`
	AggressorID      string     `json:"aggressor_id"`
	DefenderID       string     `json:"defender_id"`
	StartTime        time.Time  `json:"start_time"`
	EndTime          *time.Time `json:"end_time,omitempty"`
	Status           string     `json:"status"`
	CasualtyAttacker int        `json:"casualty_attacker"`
	CasualtyDefender int        `json:"casualty_defender"`
	Result           string     `json:"result,omitempty"`
}

// AgressorID 拼写错误兼容（旧代码使用）
func (w *War) AgressorID() string {
	return w.AggressorID
}

// CreateWar 创建战争
func (d *Database) CreateWar(war *War) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		INSERT INTO wars (id, aggressor_id, defender_id, status)
		VALUES (?, ?, ?, ?)
	`, war.ID, war.AggressorID, war.DefenderID, war.Status)

	return err
}

// GetActiveWars 获取进行中的战争
func (d *Database) GetActiveWars() ([]War, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(`
		SELECT id, aggressor_id, defender_id, start_time, end_time, status,
		       casualty_attacker, casualty_defender, result
		FROM wars WHERE status = 'ongoing'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var wars []War
	for rows.Next() {
		var w War
		var endTime sql.NullTime
		var result sql.NullString
		err := rows.Scan(
			&w.ID, &w.AggressorID, &w.DefenderID, &w.StartTime, &endTime,
			&w.Status, &w.CasualtyAttacker, &w.CasualtyDefender, &result,
		)
		if err != nil {
			return nil, err
		}
		if endTime.Valid {
			w.EndTime = &endTime.Time
		}
		if result.Valid {
			w.Result = result.String
		}
		wars = append(wars, w)
	}

	return wars, rows.Err()
}

// ============================================
// 行动日志相关操作
// ============================================

// ActionLog 行动日志
type ActionLog struct {
	ID         int64     `json:"id"`
	Timestamp  time.Time `json:"timestamp"`
	ActorID    string    `json:"actor_id"`
	ActionType string    `json:"action_type"`
	TargetID   string    `json:"target_id,omitempty"`
	Params     string    `json:"params,omitempty"`
	Result     string    `json:"result"`
	Message    string    `json:"message,omitempty"`
}

// LogAction 记录行动
func (d *Database) LogAction(actorID, actionType, targetID, params, result, message string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		INSERT INTO action_logs (actor_id, action_type, target_id, params, result, message)
		VALUES (?, ?, ?, ?, ?, ?)
	`, actorID, actionType, targetID, params, result, message)

	return err
}

// GetPlayerRole 根据玩家 ID 获取角色 ID（三字码）
func (d *Database) GetPlayerRole(playerID string) (string, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var roleID string
	err := d.db.QueryRow(`
		SELECT id FROM roles
		WHERE player_id = ? AND is_active = 1
	`, playerID).Scan(&roleID)
	
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return roleID, nil
}

// GetRoleByPlayerID 根据玩家 ID 获取角色
func (d *Database) GetRoleByPlayerID(playerID string) (*Role, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var r Role
	var attrJSON string
	var lastActive sql.NullTime

	err := d.db.QueryRow(`
		SELECT id, name, name_en, faction, player_id, is_alive, is_active,
		       last_active, attributes, created_at, updated_at
		FROM roles
		WHERE player_id = ?
	`, playerID).Scan(
		&r.ID, &r.Name, &r.NameEn, &r.Faction, &r.PlayerID,
		&r.IsAlive, &r.IsActive, &lastActive, &attrJSON,
		&r.CreatedAt, &r.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal([]byte(attrJSON), &r.Attributes); err != nil {
		return nil, err
	}

	return &r, nil
}

// UpdateRoleAttribute 更新单个角色属性
func (d *Database) UpdateRoleAttribute(roleID, attribute string, value int) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	// 先获取当前属性
	var attrJSON string
	err := d.db.QueryRow(`SELECT attributes FROM roles WHERE id = ?`, roleID).Scan(&attrJSON)
	if err != nil {
		return err
	}

	var attrs Attributes
	if err := json.Unmarshal([]byte(attrJSON), &attrs); err != nil {
		return err
	}

	// 更新指定属性
	switch attribute {
	case "army":
		attrs.Army = value
	case "navy":
		attrs.Navy = value
	case "air_force":
		attrs.AirForce = value
	case "nuclear":
		attrs.Nuclear = value
	case "economy":
		attrs.Economy = value
	case "stability":
		attrs.Stability = value
	case "diplomacy":
		attrs.Diplomacy = value
	case "intel":
		attrs.Intel = value
	}

	// 序列化回 JSON
	newAttrJSON, err := json.Marshal(attrs)
	if err != nil {
		return err
	}

	// 更新数据库
	_, err = d.db.Exec(`
		UPDATE roles SET attributes = ?, updated_at = ?
		WHERE id = ?
	`, newAttrJSON, time.Now(), roleID)

	return err
}

// InsertEvent 插入事件
func (d *Database) InsertEvent(event Event) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	dataJSON := "{}"
	if event.Data != nil {
		if data, err := json.Marshal(event.Data); err == nil {
			dataJSON = string(data)
		}
	}

	_, err := d.db.Exec(`
		INSERT INTO events (id, timestamp, location, type, severity, actor_id, target_id, title, description, data)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, event.ID, event.Timestamp, event.Location, event.Type, event.Severity, event.ActorID, event.TargetID, event.Title, event.Description, dataJSON)

	return err
}

// ============================================
// 领导人相关操作
// ============================================

// Leader 领导人
type Leader struct {
	ID          string         `json:"id"`
	RoleID      string         `json:"role_id"`
	Name        string         `json:"name"`
	NameEn      string         `json:"name_en"`
	Country     string         `json:"country"`
	CountryEn   string         `json:"country_en"`
	Title       string         `json:"title"`
	TitleEn     string         `json:"title_en"`
	AvatarURL   string         `json:"avatar_url"`
	Latitude    float64        `json:"latitude"`
	Longitude   float64        `json:"longitude"`
	IsAlive     bool           `json:"is_alive"`
	Color       string         `json:"color"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// GetAllLeaders 获取所有领导人
func (d *Database) GetAllLeaders() ([]Leader, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(`
		SELECT id, role_id, name, name_en, title, title_en, avatar_url,
		       latitude, longitude, is_alive, color, created_at, updated_at
		FROM leaders ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leaders []Leader
	for rows.Next() {
		var l Leader
		err := rows.Scan(
			&l.ID, &l.RoleID, &l.Name, &l.NameEn, &l.Title, &l.TitleEn,
			&l.AvatarURL, &l.Latitude, &l.Longitude, &l.IsAlive, &l.Color,
			&l.CreatedAt, &l.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		leaders = append(leaders, l)
	}

	return leaders, rows.Err()
}

// GetLeaderByRoleID 根据国家 ID 获取领导人
func (d *Database) GetLeaderByRoleID(roleID string) (*Leader, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var l Leader
	err := d.db.QueryRow(`
		SELECT id, role_id, name, name_en, title, title_en, avatar_url,
		       latitude, longitude, is_alive, color, created_at, updated_at
		FROM leaders WHERE role_id = ? AND is_alive = 1
	`, roleID).Scan(
		&l.ID, &l.RoleID, &l.Name, &l.NameEn, &l.Title, &l.TitleEn,
		&l.AvatarURL, &l.Latitude, &l.Longitude, &l.IsAlive, &l.Color,
		&l.CreatedAt, &l.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &l, nil
}

// InitDefaultLeaders 初始化默认领导人数据
func (d *Database) InitDefaultLeaders() error {
	d.mu.Lock()
	defer d.mu.Unlock()


	// 先删除所有现有领导人
	_, err := d.db.Exec("DELETE FROM leaders;")
	if err != nil {
		log.Printf("⚠️ 删除旧领导人数据失败：%v", err)
	}
	leaders := []struct {
		id, roleID, name, nameEn, country, countryEn, title, titleEn, avatarURL, color string
		lat, lng float64
	}{
		// 🔴 抵抗轴心
		{"ldr_iran", "iran", "穆杰塔巴·哈梅内伊", "Mujtaba Khamenei", "伊朗", "Iran", "最高领袖", "Supreme Leader", "/img/mujtaba.png", "#8B1A1A", 35.68, 51.38},
		{"ldr_iraq", "iraq", "阿卜杜勒·拉蒂夫·拉希德", "Abdul Latif Rashid", "伊拉克", "Iraq", "总统", "President", "/img/rashid.png", "#8B1A1A", 33.31, 44.36},
		{"ldr_syria", "syria", "巴沙尔·阿萨德", "Bashar al-Assad", "叙利亚", "Syria", "总统", "President", "/img/assad.png", "#8B1A1A", 33.51, 36.29},
		{"ldr_lebanon", "lebanon", "纳伊姆·卡西姆", "Naim Qassem", "黎巴嫩", "Lebanon", "真主党领袖", "Hezbollah Leader", "/img/qassem.png", "#8B1A1A", 33.88, 35.49},
		// 🔵 美以联盟
		{"ldr_israel", "israel", "本雅明·内塔尼亚胡", "Benjamin Netanyahu", "以色列", "Israel", "总理", "Prime Minister", "/img/netanyahu.png", "#1E4F8A", 31.77, 35.21},
		{"ldr_usa", "usa", "唐纳德·特朗普", "Donald Trump", "美国", "United States", "总统", "President", "/img/trump.png", "#1E4F8A", 38.89, -77.03},
		// 🟡 温和联盟
		{"ldr_saudi", "saudi_arabia", "萨勒曼国王", "King Salman", "沙特阿拉伯", "Saudi Arabia", "国王", "King", "/img/salman.png", "#B8860B", 24.63, 46.71},
		{"ldr_egypt", "egypt", "阿卜杜勒·法塔赫·塞西", "Abdel Fattah el-Sisi", "埃及", "Egypt", "总统", "President", "/img/sisi.png", "#B8860B", 30.04, 31.23},
		{"ldr_qatar", "qatar", "塔米姆·本·哈马德", "Tamim bin Hamad", "卡塔尔", "Qatar", "埃米尔", "Emir", "/img/tamim.png", "#B8860B", 25.28, 51.52},
		{"ldr_uae", "uae", "穆罕默德·本·扎耶德", "Mohamed bin Zayed", "阿联酋", "UAE", "总统", "President", "/img/mbz.png", "#B8860B", 24.45, 54.37},
		{"ldr_kuwait", "kuwait", "谢赫·米沙勒", "Sheikh Mishal", "科威特", "Kuwait", "埃米尔", "Emir", "/img/meshaal.png", "#B8860B", 29.37, 47.97},
		{"ldr_bahrain", "bahrain", "哈马德·本·伊萨", "Hamad bin Isa", "巴林", "Bahrain", "国王", "King", "/img/hamad.png", "#B8860B", 26.21, 50.58},
		// 🟢 亲穆兄会
		{"ldr_turkey", "turkey", "雷杰普·塔伊普·埃尔多安", "Recep Tayyip Erdoğan", "土耳其", "Turkey", "总统", "President", "/img/erdogan.png", "#2D5A27", 39.92, 32.85},
		// ⚪ 其他
		{"ldr_russia", "russia", "弗拉基米尔·普京", "Vladimir Putin", "俄罗斯", "Russia", "总统", "President", "/img/putin.png", "#8B7D6B", 55.75, 37.61},
	}
	for _, l := range leaders {
		_, err := d.db.Exec(`
			INSERT INTO leaders (id, role_id, name, name_en, country, country_en, title, title_en, avatar_url, latitude, longitude, is_alive, color)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
			ON CONFLICT(id) DO UPDATE SET
				name = excluded.name,
				name_en = excluded.name_en,
				country = excluded.country,
				country_en = excluded.country_en,
				title = excluded.title,
				title_en = excluded.title_en,
				avatar_url = excluded.avatar_url,
				latitude = excluded.latitude,
				longitude = excluded.longitude,
				color = excluded.color,
				updated_at = CURRENT_TIMESTAMP
		`, l.id, l.roleID, l.name, l.nameEn, l.country, l.countryEn, l.title, l.titleEn, l.avatarURL, l.lat, l.lng, l.color)
		
		if err != nil {
			log.Printf("⚠️ 初始化领导人 %s 失败：%v", l.name, err)
		}
	}

	log.Printf("✅ 初始化 %d 个领导人数据", len(leaders))
	return nil
}
