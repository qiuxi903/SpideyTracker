==========================================================
  寻找小蜘蛛 - Docker 部署包
==========================================================

一、服务器要求
  - Linux（Ubuntu/CentOS/Debian 等）
  - 已安装 Docker 与 Docker Compose 插件
  - 服务器自带 MySQL（应用直接连接，不启动 MySQL 容器）

二、部署步骤
  1. 上传压缩包到服务器，解压:
     tar -xzf spidey-tracker-deploy.tar.gz
     cd spidey-tracker-deploy

  2. 配置 .env（数据库 + JWT + 可选 SMTP）:
     cp .env.example .env
     nano .env
     必填:
       DB_HOST=127.0.0.1      # 服务器 MySQL 地址
       DB_PORT=3306
       DB_USER=你的数据库账号
       DB_PASS=你的数据库密码
       DB_NAME=spidey_tracker # 库名（自动创建，账号需有建库权限）
       JWT_SECRET=随机字符串
     可选（发真实邮件）:
       SMTP_ENABLED=true
       SMTP_HOST=smtp.qq.com
       SMTP_PORT=465
       SMTP_USER=邮箱
       SMTP_PASS=邮箱授权码
       SMTP_FROM=寻找小蜘蛛 <邮箱>

  3. 构建并启动:
     ./install.sh    （或手动: docker compose up -d --build）

  4. 完成！浏览器访问:
     http://服务器IP:8899

三、说明
  - 应用首次启动会自动创建数据库与数据表（账号需有 CREATE 权限）
  - 上传的图片存于 docker 卷 uploads-data
  - 验证码：SMTP_ENABLED=false 时打印到容器日志
      docker compose logs -f app
  - 端口 8899：使用宿主机网络（network_mode: host），直接监听服务器 8899

四、常用命令（在部署目录内执行）
  docker compose logs -f app      # 查看应用日志
  docker compose restart app      # 重启应用
  docker compose down             # 停止（uploads 数据保留在卷中）
  docker compose up -d            # 重新启动

五、注意事项
  - MySQL 账号若无法自动建库，请手动创建:
      CREATE DATABASE spidey_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  - JWT_SECRET 在 .env 中，请妥善保管
==========================================================
