//go:build ignore
package main
import (
	"database/sql"
	"fmt"
	_ "modernc.org/sqlite"
)
func main() {
	db, _ := sql.Open("sqlite", "./mideastsim.db")
	defer db.Close()
	rows, _ := db.Query("SELECT id, username, created_at, last_login FROM players")
	defer rows.Close()
	for rows.Next() {
		var id, username string
		var createdAt, lastLogin sql.NullTime
		rows.Scan(&id, &username, &createdAt, &lastLogin)
		fmt.Printf("ID: %s, Username: %s, Created: %v, LastLogin: %v\n", id, username, createdAt.Valid, lastLogin.Valid)
	}
}
