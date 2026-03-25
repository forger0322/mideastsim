-- 重置所有角色的玩家绑定
-- 使用方法：sqlite3 mideastsim.db < reset_roles.sql

UPDATE roles SET player_id = NULL WHERE player_id IS NOT NULL;

-- 验证
SELECT id, name, player_id FROM roles;
