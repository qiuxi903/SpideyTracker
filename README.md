# 寻找小蜘蛛 (SpideyTracker)

蜘蛛侠目击追踪网站（**粉丝自制·非官方**参考站点）。

交互式地图上汇集全球蜘蛛侠目击情报，支持用户注册、发布目击（含照片上传）、收藏、社区动态分享。

## 功能

- 🗺️ 交互式地图（高德地图适配）：目击点位渲染、雷达感应、点位弹窗跟随
- 👤 用户系统：邮箱验证码注册、登录（JWT + httpOnly Cookie）
- 📍 发布目击：地图选点、传闻/已确认类型、最多 6 张照片
- ⭐ 收藏与「我的记录」管理
- 💬 社区面板：目击动态时间线、发布入口
- 📜 活动日志、关于/免责声明页面

## 技术栈

- **后端**：Node.js + Express + MySQL 8
- **前端**：原生 JS + 高德地图（AMap 适配层）
- **部署**：Docker + Docker Compose（MySQL + App 双容器）

## 本地运行

```bash
# 1. 准备 MySQL 8，创建 .env（参考模板）
# 2. 安装依赖并启动
npm install
node server/server.js
# 访问 http://127.0.0.1:8899
```

> 邮箱验证码在本地开发时打印到服务器控制台。

## Docker 部署

```bash
tar -xzf spidey-tracker-deploy.tar.gz
cd spidey-tracker-deploy
./install.sh   # 自动构建 MySQL + App 容器
# 访问 http://服务器IP:8899
```

## 目录结构

```
server/          # Express 后端（API、认证、上传）
spideytracker.net/  # 前端站点（页面、脚本、样式）
deploy/          # Docker 部署配置与导出工具
```

## 免责声明

本站为蜘蛛侠影迷自制镜像站点，仅供学习与娱乐，与 Marvel、Sony Pictures 及其关联公司无任何隶属或赞助关系。所有素材版权归各自权利人所有。
