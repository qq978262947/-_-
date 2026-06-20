FROM debian:bookworm-slim AS pikafish-downloader

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl file p7zip-full git build-essential make \
  && rm -rf /var/lib/apt/lists/*

ARG PIKAFISH_RELEASE=Pikafish-2026-01-02
ARG PIKAFISH_ARCHIVE=Pikafish.2026-01-02.7z

RUN set -eux; \
  mkdir -p /tmp/pikafish-release; \
  if curl -fL --retry 3 --connect-timeout 20 \
    "https://github.com/official-pikafish/Pikafish/releases/download/${PIKAFISH_RELEASE}/${PIKAFISH_ARCHIVE}" \
    -o /tmp/pikafish.7z \
    && 7z x -y -o/tmp/pikafish-release /tmp/pikafish.7z >/dev/null; then \
      find /tmp/pikafish-release -type f -exec sh -c 'for candidate do file "$candidate" | grep -qi "ELF 64-bit.*x86-64.*executable" && printf "%s\n" "$candidate"; done; true' sh {} + > /tmp/pikafish-candidates || true; \
      echo "Prebuilt Pikafish candidates: $(wc -l < /tmp/pikafish-candidates)"; \
      if test -s /tmp/pikafish-candidates; then \
        grep -Eiv '(avx|bmi|vnni|sse|popcnt|modern|zen|skylake|apple|arm|aarch|windows|mac|android)' /tmp/pikafish-candidates > /tmp/pikafish-generic || true; \
        if test -s /tmp/pikafish-generic; then head -n 1 /tmp/pikafish-generic > /tmp/pikafish-selected; else head -n 1 /tmp/pikafish-candidates > /tmp/pikafish-selected; fi; \
        echo "Selected prebuilt Pikafish: $(cat /tmp/pikafish-selected)"; \
        cp "$(cat /tmp/pikafish-selected)" /tmp/pikafish; \
      fi; \
  fi; \
  if ! test -x /tmp/pikafish; then \
    echo "Prebuilt Linux x86-64 Pikafish not found; falling back to source build."; \
    git clone --depth 1 https://github.com/official-pikafish/Pikafish.git /tmp/pikafish-src; \
    make -C /tmp/pikafish-src/src build ARCH=x86-64 COMP=gcc -j"$(nproc)"; \
    cp /tmp/pikafish-src/src/pikafish /tmp/pikafish; \
  fi; \
  chmod +x /tmp/pikafish; \
  file /tmp/pikafish

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
