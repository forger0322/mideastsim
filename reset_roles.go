package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "./mideastsim.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 重置所有角色的 player_id
	result, err := db.Exec("UPDATE roles SET player_id = NULL")
	if err != nil {
		log.Fatal(err)
	}

	rows, _ := result.RowsAffected()
	fmt.Printf("✅ 已重置 %d 个角色的绑定\n", rows)

	// 验证
	rows, err = db.Query("SELECT id, name, player_id FROM roles")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("\n当前角色状态:")
	for rows.Next() {
		var id, name string
		var playerID sql.NullString
		rows.Scan(&id, &name, &playerID)
		status := "未绑定"
		if playerID.Valid {
			status = fmt.Sprintf("已绑定：%s", playerID.String)
		}
		fmt.Printf("  %s (%s): %s\n", id, name, status)
	}
}
