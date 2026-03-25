//go:build ignore

package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

func main() {
	db, err := sql.Open("sqlite", "./mideastsim.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 查询 players 表结构
	rows, err := db.Query("PRAGMA table_info(players)")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("players 表结构:")
	for rows.Next() {
		var cid int
		var name, typ string
		var notnull int
		var dfltValue sql.NullString
		var pk int
		rows.Scan(&cid, &name, &typ, &notnull, &dfltValue, &pk)
		fmt.Printf("  %s %s (notnull=%d, pk=%d)\n", name, typ, notnull, pk)
	}

	// 查询玩家数据
	rows2, _ := db.Query("SELECT * FROM players LIMIT 1")
	if rows2 != nil {
		defer rows2.Close()
		cols, _ := rows2.Columns()
		fmt.Println("\n玩家数据列:", cols)
	}
}
