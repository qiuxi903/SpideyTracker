# 寻找小蜘蛛 - Docker 镜像
FROM node:20-alpine

WORKDIR /app

# 依赖在容器内安装（不同平台各自编译，避免跨平台 node_modules 问题）
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# 应用代码
COPY server ./server
COPY spideytracker.net ./spideytracker.net

# 重建 images 符号链接（打包时的绝对路径链接在 Linux 无效）
RUN rm -rf spideytracker.net/images && ln -s img/images spideytracker.net/images

# 初始上传文件备份（首次启动复制到持久卷）
RUN mkdir -p /seed-uploads && (cp -rn spideytracker.net/uploads/* /seed-uploads/ 2>/dev/null || true)

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8899
ENTRYPOINT ["/entrypoint.sh"]
