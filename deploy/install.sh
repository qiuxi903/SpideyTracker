#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=========================================="
echo "  寻找小蜘蛛 Docker 一键部署"
echo "=========================================="
echo ""

# 1) 检查 Docker
command -v docker >/dev/null 2>&1 || { echo "❌ 未安装 Docker，请先安装 Docker 与 compose 插件"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ 请安装 Docker Compose 插件 (docker compose)"; exit 1; }

# 2) 生成 .env（若不存在）
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ 已生成 .env"
fi

# 3) 设置数据库连接（DB_PASS 为空时，填写服务器 MySQL 密码）
if grep -qE "^DB_PASS=$" .env; then
  echo "使用服务器自带的 MySQL，请填写数据库密码："
  read -r -p "数据库密码（必填）: " dbpass
  if [ -z "$dbpass" ]; then
    echo "❌ 密码不能为空（连接的是服务器 MySQL）"
    exit 1
  fi
  sed -i "s/^DB_PASS=.*/DB_PASS=$dbpass/" .env
  echo "✓ 数据库密码已设置（DB_HOST/DB_USER/DB_NAME 请在 .env 中确认）"
fi

# 4) 生成 JWT_SECRET（为空时）
if grep -qE "^JWT_SECRET=$" .env; then
  jwt=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$jwt/" .env
  echo "✓ JWT_SECRET 已生成"
fi

# 5) 构建并启动
echo ""
echo "正在构建并启动容器（首次需下载基础镜像，请耐心等待 2-10 分钟）..."
docker compose up -d --build

# 5) 等待就绪
echo ""
echo "等待服务就绪..."
sleep 5
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8899/ 2>/dev/null | grep -q "200"; then
    break
  fi
  sleep 2
done

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo ""
echo "   访问地址: http://服务器IP:8899"
echo "   （本机: http://127.0.0.1:8899）"
echo ""
echo "   常用命令:"
echo "     查看日志: docker compose logs -f app"
echo "     重启:     docker compose restart app"
echo "     停止:     docker compose down"
echo "     升级:     重新解压后 ./install.sh"
echo "=========================================="
