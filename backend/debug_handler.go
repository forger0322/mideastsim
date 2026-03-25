package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"encoding/json"
)

func init() {
	http.HandleFunc("/api/debug/player123", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		
		// 查询玩家 123
		var playerID, roleID sql.NullString
		err := db.db.QueryRow("SELECT id, role_id FROM players WHERE username='123'").Scan(&playerID, &roleID)
		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{"error": err.Error()})
			return
		}
		
		result := map[string]interface{}{
			"player_id": playerID.String,
			"role_id": roleID.String,
		}
		
		// 查询角色
		var id, name string
		var isActive int
		var playerIDDB sql.NullString
		err = db.db.QueryRow("SELECT id, name, is_active, player_id FROM roles WHERE id=?", roleID.String).Scan(&id, &name, &isActive, &playerIDDB)
		if err != nil {
			result["role_error"] = err.Error()
		} else {
			result["role"] = map[string]interface{}{
				"id": id,
				"name": name,
				"is_active": isActive,
				"player_id": playerIDDB.String,
			}
		}
		
		json.NewEncoder(w).Encode(result)
	})
	
	// 修复 API
	http.HandleFunc("/api/debug/fix-role", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		
		// 激活 ARE 角色
		result, err := db.db.Exec("UPDATE roles SET is_active=1, player_id='457eae9a-e15f-465f-8bb8-2ec6ac995689' WHERE id='ARE'")
		if err != nil {
			http.Error(w, fmt.Sprintf("Error: %v", err), 500)
			return
		}
		
		rows, _ := result.RowsAffected()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "rows": rows})
		logger.Printf("[DEBUG] 修复了 ARE 角色")
	})
}
