==========================================================
  寻找小蜘蛛 - Docker 部署包
==========================================================

一、服务器要求
  - Linux（Ubuntu/CentOS/Debian 等）
  - 已安装 Docker 与 Docker Compose 插件
    安装参考: https://docs.docker.com/engine/install/
    Ubuntu: sudo apt install docker.io docker-compose-v2

二、部署步骤（3 条命令）
  1. 上传压缩包到服务器，解压:
     tar -xzf spidey-tracker-deploy.tar.gz
     cd spidey-tracker-deploy

  2. 执行一键安装（会提示设置数据库密码，也可留空自动生成）:
     ./install.sh
     （若提示权限不足: chmod +x install.sh && ./install.sh）

  3. 完成！浏览器访问:
     http://服务器IP:8899

三、数据说明
  - 已包含你现有数据（1 个用户、目击记录、收藏、上传图片）
  - MySQL 数据存于 docker 卷 mysql-data，图片存于 uploads-data
  - 升级/迁移: 停止后备份卷即可（docker compose down，卷保留）

四、常用命令（在部署目录内执行）
  docker compose logs -f app      # 查看应用日志
  docker compose restart app      # 重启应用
  docker compose down             # 停止（数据保留在卷中）
  docker compose up -d            # 重新启动

五、注意事项
  - 端口 8899 如需修改，编辑 docker-compose.yml 的 ports
  - 验证码目前打印到容器日志（docker compose logs -f app 查看）
  - 如需真实邮箱验证码：设置 SMTP_ENABLED=true 并配置 SMTP（见 .env）
  - JWT_SECRET 在 .env 中，请妥善保管，泄露后请更换并让用户重新登录
==========================================================
