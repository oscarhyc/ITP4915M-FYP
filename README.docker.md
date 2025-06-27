# Docker 部署指南

本專案提供完整的 Docker 容器化解決方案，包含 Next.js 應用程式和 PostgreSQL 資料庫。

## 檔案說明

- `docker-compose.yml` - 主要的 Docker Compose 配置檔案
- `Dockerfile` - 生產環境的 Docker 映像檔
- `Dockerfile.dev` - 開發環境的 Docker 映像檔
- `.dockerignore` - Docker 建置時忽略的檔案

## 快速開始

### 1. 生產環境部署

```bash
# 建置並啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

應用程式將在 http://localhost:3002 上運行

### 2. 開發環境部署

```bash
# 使用開發環境配置啟動
docker-compose --profile dev up -d

# 或者只啟動開發版本的應用程式
docker-compose up -d postgres app-dev
```

開發版本將在 http://localhost:3003 上運行

## 服務說明

### PostgreSQL 資料庫
- **容器名稱**: smart-recipe-postgres
- **連接埠**: 5432
- **資料庫**: smart_recipe_generator
- **使用者**: recipe_user
- **密碼**: recipe_password_123

### Next.js 應用程式 (生產環境)
- **容器名稱**: smart-recipe-app
- **連接埠**: 3002
- **環境**: production

### Next.js 應用程式 (開發環境)
- **容器名稱**: smart-recipe-app-dev
- **連接埠**: 3003
- **環境**: development
- **特色**: 支援熱重載，程式碼變更即時生效

## 常用指令

### 服務管理
```bash
# 啟動所有服務
docker-compose up -d

# 停止所有服務
docker-compose down

# 重新建置並啟動
docker-compose up -d --build

# 查看服務狀態
docker-compose ps

# 查看特定服務日誌
docker-compose logs -f app
docker-compose logs -f postgres
```

### 資料庫管理
```bash
# 進入 PostgreSQL 容器
docker-compose exec postgres psql -U recipe_user -d smart_recipe_generator

# 同步資料庫結構
docker-compose exec app npx prisma db push

# 重置資料庫
docker-compose exec app npx prisma db push --force-reset
```

### 應用程式管理
```bash
# 進入應用程式容器
docker-compose exec app sh

# 查看應用程式日誌
docker-compose logs -f app

# 重新啟動應用程式
docker-compose restart app
```

## 環境變數配置

主要環境變數在 `docker-compose.yml` 中定義：

- `DATABASE_URL` - PostgreSQL 連接字串
- `LM_STUDIO_BASE_URL` - AI API 基礎 URL
- `LM_STUDIO_API_KEY` - AI API 金鑰
- `NEXTAUTH_SECRET` - NextAuth 密鑰
- `JWT_SECRET` - JWT 密鑰

## 資料持久化

- PostgreSQL 資料存儲在 Docker volume `postgres_data` 中
- 圖片和音頻檔案通過 volume 映射到主機的 `./public` 目錄

## 網路配置

所有服務都在 `recipe-network` 網路中運行，確保服務間的安全通信。

## 故障排除

### 常見問題

1. **連接埠衝突**
   ```bash
   # 檢查連接埠使用情況
   netstat -tulpn | grep :3002
   netstat -tulpn | grep :5432
   ```

2. **資料庫連接失敗**
   ```bash
   # 檢查 PostgreSQL 服務狀態
   docker-compose logs postgres
   
   # 測試資料庫連接
   docker-compose exec postgres pg_isready -U recipe_user
   ```

3. **應用程式啟動失敗**
   ```bash
   # 查看應用程式日誌
   docker-compose logs app
   
   # 重新建置映像檔
   docker-compose build --no-cache app
   ```

4. **清理所有容器和映像檔**
   ```bash
   # 停止並移除所有容器
   docker-compose down -v
   
   # 移除未使用的映像檔
   docker image prune -a
   ```

## 安全注意事項

1. **生產環境部署前請務必更改以下密鑰**：
   - `NEXTAUTH_SECRET`
   - `JWT_SECRET`
   - PostgreSQL 密碼

2. **API 金鑰管理**：
   - 不要在程式碼中硬編碼 API 金鑰
   - 使用環境變數或密鑰管理服務

3. **網路安全**：
   - 在生產環境中限制資料庫連接埠的外部訪問
   - 使用 HTTPS 進行外部通信

## 效能優化

1. **生產環境建議**：
   - 使用 `docker-compose up -d` 在背景運行
   - 定期清理未使用的映像檔和容器
   - 監控資源使用情況

2. **開發環境建議**：
   - 使用開發版本容器進行本地開發
   - 利用 volume 映射實現程式碼熱重載
