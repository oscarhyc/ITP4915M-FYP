# AWS RDS 遷移總結

## 已完成的配置更改

### 1. 更新 .env 檔案
- ✅ 將 DATABASE_URL 從本地 Docker PostgreSQL 更改為 AWS RDS
- ✅ 新的連接字串：`postgresql://postgres:recipe_password_123@database-itp4915m-fyp.cwo5udgju8t2.us-east-1.rds.amazonaws.com:5432/smart_recipe_generator?schema=public`

### 2. 更新 docker-compose.yml 檔案
- ✅ 移除了 PostgreSQL 服務容器
- ✅ 更新了應用程式容器的 DATABASE_URL 環境變數
- ✅ 移除了對 postgres 服務的依賴
- ✅ 移除了不再需要的 postgres_data volume

### 3. AWS RDS 連接資訊
- **主機**: database-itp4915m-fyp.cwo5udgju8t2.us-east-1.rds.amazonaws.com
- **用戶名**: postgres
- **密碼**: recipe_password_123
- **資料庫**: smart_recipe_generator
- **端口**: 5432

## 下一步需要完成的任務

### 1. 驗證 AWS RDS 連接
- 確保 AWS RDS 實例正在運行
- 確保安全群組允許從您的 IP 地址連接到端口 5432
- 測試網路連接

### 2. 創建資料庫和表格
```bash
# 如果連接成功，運行以下命令：
npx prisma generate
npx prisma db push
```

### 3. 測試應用程式
```bash
# 啟動應用程式
npm run dev
# 或使用 Docker
docker-compose up app
```

## 可能的問題和解決方案

### 1. 連接超時
- 檢查 AWS RDS 安全群組設定
- 確保您的 IP 地址被允許連接
- 檢查 VPC 和子網路配置

### 2. 認證失敗
- 確認用戶名和密碼正確
- 檢查 AWS RDS 實例的主用戶設定

### 3. 資料庫不存在
- 可能需要先創建 `smart_recipe_generator` 資料庫
- 使用 AWS RDS 控制台或 psql 客戶端創建

## 測試腳本
已創建以下測試腳本來驗證連接：
- `test-aws-rds-connection.js` - 使用 Prisma 測試
- `simple-rds-test.js` - 使用原生 pg 客戶端測試
- `test-db-exists.js` - 檢查並創建資料庫

## 回滾計劃
如果需要回滾到 Docker PostgreSQL：
1. 恢復 .env 中的原始 DATABASE_URL
2. 恢復 docker-compose.yml 中的 PostgreSQL 服務
3. 重新啟動 Docker 容器
