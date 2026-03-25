//go:build ignore

package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

func main() {
	db, err := sql.Open("sqlite", "./data/mideastsim.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	leaders := []struct {
		id, roleID, name, nameEn, title, titleEn, avatarURL, color string
		lat, lng                                                   float64
	}{
		// 🔴 抵抗轴心
		{"ldr_iran", "iran", "穆杰塔巴·哈梅内伊", "Mujtaba Khamenei", "最高领袖", "Supreme Leader", "/img/mujtaba.png", "#8B1A1A", 35.68, 51.38},
		{"ldr_iraq", "iraq", "阿卜杜勒·拉蒂夫·拉希德", "Abdul Latif Rashid", "总统", "President", "/img/rashid.png", "#8B1A1A", 33.31, 44.36},
		{"ldr_syria", "syria", "巴沙尔·阿萨德", "Bashar al-Assad", "总统", "President", "/img/assad.png", "#8B1A1A", 33.51, 36.29},
		{"ldr_lebanon", "lebanon", "纳伊姆·卡西姆", "Naim Qassem", "真主党领袖", "Hezbollah Leader", "/img/qassem.png", "#8B1A1A", 33.88, 35.49},
		// 🔵 美以联盟
		{"ldr_israel", "israel", "本雅明·内塔尼亚胡", "Benjamin Netanyahu", "总理", "Prime Minister", "/img/netanyahu.png", "#1E4F8A", 31.77, 35.21},
		{"ldr_usa", "usa", "唐纳德·特朗普", "Donald Trump", "总统", "President", "/img/trump.png", "#1E4F8A", 38.89, -77.03},
		// 🟡 温和联盟
		{"ldr_saudi", "saudi_arabia", "萨勒曼国王", "King Salman", "国王", "King", "/img/salman.png", "#B8860B", 24.63, 46.71},
		{"ldr_egypt", "egypt", "阿卜杜勒·法塔赫·塞西", "Abdel Fattah el-Sisi", "总统", "President", "/img/sisi.png", "#B8860B", 30.04, 31.23},
		{"ldr_qatar", "qatar", "塔米姆·本·哈马德", "Tamim bin Hamad", "埃米尔", "Emir", "/img/tamim.png", "#B8860B", 25.28, 51.52},
		{"ldr_uae", "uae", "穆罕默德·本·扎耶德", "Mohamed bin Zayed", "总统", "President", "/img/mbz.png", "#B8860B", 24.45, 54.37},
		{"ldr_kuwait", "kuwait", "谢赫·米沙勒", "Sheikh Mishal", "埃米尔", "Emir", "/img/meshaal.png", "#B8860B", 29.37, 47.97},
		{"ldr_bahrain", "bahrain", "哈马德·本·伊萨", "Hamad bin Isa", "国王", "King", "/img/hamad.png", "#B8860B", 26.21, 50.58},
		// 🟢 亲穆兄会
		{"ldr_turkey", "turkey", "雷杰普·塔伊普·埃尔多安", "Recep Tayyip Erdoğan", "总统", "President", "/img/erdogan.png", "#2D5A27", 39.92, 32.85},
		// ⚪ 其他
		{"ldr_russia", "russia", "弗拉基米尔·普京", "Vladimir Putin", "总统", "President", "/img/putin.png", "#8B7D6B", 55.75, 37.61},
	}

	for _, l := range leaders {
		_, err := db.Exec(`
			INSERT INTO leaders (id, role_id, name, name_en, title, title_en, avatar_url, latitude, longitude, is_alive, color)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
			ON CONFLICT(id) DO UPDATE SET
				name = excluded.name,
				name_en = excluded.name_en,
				title = excluded.title,
				title_en = excluded.title_en,
				avatar_url = excluded.avatar_url,
				latitude = excluded.latitude,
				longitude = excluded.longitude,
				color = excluded.color,
				updated_at = CURRENT_TIMESTAMP
		`, l.id, l.roleID, l.name, l.nameEn, l.title, l.titleEn, l.avatarURL, l.lat, l.lng, l.color)

		if err != nil {
			log.Printf("⚠️ 更新领导人 %s 失败：%v", l.name, err)
		} else {
			fmt.Printf("✅ 更新：%s (%s)\n", l.name, l.roleID)
		}
	}

	fmt.Printf("\n✅ 共更新 %d 位领导人\n", len(leaders))
}
