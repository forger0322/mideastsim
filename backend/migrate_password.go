// +build ignore

package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
)

func main() {
	db, err := sql.Open("sqlite", "mideastsim.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 添加 password_hash 列（如果不存在）
	_, err = db.Exec(`ALTER TABLE players ADD COLUMN password_hash TEXT`)
	if err != nil {
		fmt.Printf("列可能已存在或错误：%v\n", err)
	} else {
		fmt.Println("✅ 成功添加 password_hash 列")
	}
}
