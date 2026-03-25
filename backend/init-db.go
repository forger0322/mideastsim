// +build ignore

// 数据库初始化脚本
// 用法：go run init-db.go
package main

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

func main() {
	// 获取脚本所在目录
	execPath, _ := os.Executable()
	baseDir := filepath.Dir(execPath)
	
	// 如果是 go run，使用当前工作目录
	if strings.Contains(execPath, "go-build") {
		baseDir, _ = os.Getwd()
	}

	dbPath := filepath.Join(baseDir, "mideastsim.db")
	schemaPath := filepath.Join(baseDir, "schema.sql")

	fmt.Println("🗄️  初始化 MideastSim 数据库...")
	fmt.Printf("📍 数据库路径：%s\n", dbPath)

	// 检查数据库是否已存在
	if _, err := os.Stat(dbPath); err == nil {
		fmt.Println("⚠️  数据库已存在，是否删除重建？(y/N)")
		
		var response string
		fmt.Scanln(&response)
		if response == "y" || response == "Y" {
			os.Remove(dbPath)
			fmt.Println("✅ 旧数据库已删除")
		} else {
			fmt.Println("ℹ️  跳过数据库创建")
			return
		}
	}

	// 读取 schema
	schema, err := ioutil.ReadFile(schemaPath)
	if err != nil {
		log.Fatalf("❌ 读取 schema.sql 失败：%v", err)
	}

	// 创建数据库
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("❌ 创建数据库失败：%v", err)
	}
	defer db.Close()

	// 执行 schema
	statements := strings.Split(string(schema), ";")
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			log.Printf("⚠️  执行语句警告：%v", err)
		}
	}

	fmt.Println("✅ 数据库创建成功！")

	// 验证数据
	var count int
	db.QueryRow("SELECT COUNT(*) FROM roles").Scan(&count)
	fmt.Printf("   国家数量：%d\n", count)

	db.QueryRow("SELECT COUNT(*) FROM relations").Scan(&count)
	fmt.Printf("   关系记录：%d\n", count)

	db.QueryRow("SELECT COUNT(*) FROM alliances").Scan(&count)
	fmt.Printf("   同盟数量：%d\n", count)

	fmt.Println("\n🎉 数据库初始化完成！")
}
