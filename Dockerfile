FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5178

COPY package.json ./
COPY README.md LICENSE ./
COPY index.html app.js styles.css server.js ./
COPY assets ./assets
COPY engines ./engines

EXPOSE 5178

CMD ["node", "server.js"]
