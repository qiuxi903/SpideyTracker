#!/bin/sh
set -e
# 首次启动：把镜像内的初始上传文件复制到持久卷（之后用户上传写入卷）
if [ ! -f /app/spideytracker.net/uploads/.seeded ]; then
  cp -rn /seed-uploads/* /app/spideytracker.net/uploads/ 2>/dev/null || true
  touch /app/spideytracker.net/uploads/.seeded
fi
exec node server/server.js
