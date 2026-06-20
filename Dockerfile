FROM debian:bookworm-slim AS pikafish-downloader

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl file p7zip-full \
  && rm -rf /var/lib/apt/lists/*

ARG PIKAFISH_RELEASE=Pikafish-2026-01-02
ARG PIKAFISH_ARCHIVE=Pikafish.2026-01-02.7z

RUN mkdir -p /tmp/pikafish-release \
  && curl -fL --retry 3 --connect-timeout 20 \
    "https://github.com/official-pikafish/Pikafish/releases/download/${PIKAFISH_RELEASE}/${PIKAFISH_ARCHIVE}" \
    -o /tmp/pikafish.7z \
  && 7z x -y -o/tmp/pikafish-release /tmp/pikafish.7z >/dev/null \
  && find /tmp/pikafish-release -type f -iname 'pikafish*' -exec sh -c 'for candidate do file "$candidate" | grep -q "ELF 64-bit.*x86-64" && printf "%s\n" "$candidate"; done' sh {} + > /tmp/pikafish-candidates \
  && test -s /tmp/pikafish-candidates \
  && { awk 'tolower($0) !~ /(avx|bmi|vnni|sse|popcnt|modern|zen|skylake|apple|arm|aarch|windows|mac|android)/ { print; found=1; exit } END { exit found ? 0 : 1 }' /tmp/pikafish-candidates > /tmp/pikafish-selected \
    || head -n 1 /tmp/pikafish-candidates > /tmp/pikafish-selected; } \
  && cp "$(cat /tmp/pikafish-selected)" /tmp/pikafish \
  && chmod +x /tmp/pikafish \
  && file /tmp/pikafish

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
COPY --from=pikafish-downloader /tmp/pikafish ./engines/pikafish/pikafish

RUN chmod +x ./engines/pikafish/pikafish

EXPOSE 10000

CMD ["node", "server.js"]
