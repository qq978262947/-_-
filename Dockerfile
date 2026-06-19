FROM debian:bookworm-slim AS pikafish-builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git build-essential make \
  && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/official-pikafish/Pikafish.git /tmp/pikafish \
  && make -C /tmp/pikafish/src build ARCH=x86-64 COMP=gcc -j"$(nproc)" \
  && strip /tmp/pikafish/src/pikafish

FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5178

COPY package.json ./
COPY README.md LICENSE ./
COPY index.html app.js styles.css server.js ./
COPY assets ./assets
COPY engines/pikafish/README.md ./engines/pikafish/README.md
COPY engines/pikafish/pikafish.nnue ./engines/pikafish/pikafish.nnue
COPY --from=pikafish-builder /tmp/pikafish/src/pikafish ./engines/pikafish/pikafish

RUN chmod +x ./engines/pikafish/pikafish

EXPOSE 5178

CMD ["node", "server.js"]
