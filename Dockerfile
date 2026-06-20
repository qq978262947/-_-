FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

COPY package.json ./
COPY README.md LICENSE ./
COPY index.html app.js styles.css server.js robots.txt sitemap.xml ./
COPY assets ./assets
COPY engines/pikafish/README.md ./engines/pikafish/README.md
COPY engines/pikafish/pikafish.nnue ./engines/pikafish/pikafish.nnue

EXPOSE 10000

CMD ["node", "server.js"]
