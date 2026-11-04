FROM node:24-alpine

RUN apk add --no-cache su-exec

WORKDIR /app

COPY package.json ./
COPY public ./public
COPY server ./server
COPY scripts ./scripts

RUN mkdir -p /data && chown -R node:node /app /data

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    DB_PATH=/data/basket-playbook.db \
    DATA_DIR=/data

VOLUME /data
EXPOSE 8080

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/index.mjs"]
