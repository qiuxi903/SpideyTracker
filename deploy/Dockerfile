# 寻找小蜘蛛 - Docker 镜像
FROM node:20-alpine

WORKDIR /app

# 依赖（纯 JS 模块，直接复制，服务器免联网安装）
COPY package.json package-lock.json ./
COPY node_modules ./node_modules

# 应用代码
COPY server ./server
COPY spideytracker.net ./spideytracker.net

# 重建 images 符号链接（打包时的绝对路径链接在 Linux 无效）
RUN rm -rf spideytracker.net/images && ln -s img/images spideytracker.net/images

# 初始上传文件备份（首次启动复制到持久卷）
RUN mkdir -p /seed-uploads && (cp -rn spideytracker.net/uploads/* /seed-uploads/ 2>/dev/null || true)

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8899
ENTRYPOINT ["/entrypoint.sh"]
