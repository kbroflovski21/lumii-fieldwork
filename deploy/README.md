# 部署文件

## fieldwork.db

预置的 SQLite 数据库，包含：
- 3 个默认用户账号（admin/operator/supervisor）
- 4 个服务人员
- 8 个智能工牌
- 3 个服务对象
- 6 条服务排期
- 3 条服务记录

首次部署时复制到 `data/` 目录：
```bash
cp deploy/fieldwork.db data/fieldwork.db
```

**重要：** 生产环境部署后立即修改默认密码。
