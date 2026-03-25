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

	_, err = db.Exec("DELETE FROM leaders WHERE role_id='jordan';")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("✅ 已删除约旦领导人")
}
