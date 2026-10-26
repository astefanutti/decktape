# syntax=docker/dockerfile:1

FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS builder

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_CACHE_DIR=/opt/puppeteer

RUN apt-get update && \
    apt-get install -y --no-install-recommends unzip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /decktape

COPY package.json package-lock.json ./

# Install only the Chrome version selected by the locked Puppeteer dependency.
# The default install also downloads chrome-headless-shell, which DeckTape does not use.
RUN npm ci --omit=dev && \
    npx --no-install puppeteer browsers install chrome

FROM debian:bookworm-slim@sha256:7ff6ba31527b9e336162fa061746c366c4b2032f4d2cff2078bea43f78efe3f8

LABEL org.opencontainers.image.source="https://github.com/astefanutti/decktape"

ENV NODE_ENV=production \
    PUPPETEER_CACHE_DIR=/opt/puppeteer \
    TERM=xterm-color

# Node.js
COPY --from=builder /usr/local/bin/node /usr/local/bin/

# Production dependencies and Chrome, without npm or the build tools.
COPY --from=builder /decktape /decktape
COPY --from=builder /opt/puppeteer /opt/puppeteer

RUN apt-get update && \
    echo 'APT::Install-Recommends "false";' > /etc/apt/apt.conf.d/99no-recommends && \
    /decktape/node_modules/.bin/puppeteer browsers install chrome --install-deps && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        fonts-freefont-ttf \
        fonts-noto-color-emoji \
        fonts-wqy-zenhei && \
    # Preserve FreeMono as the monospace fallback ahead of WenQuanYi.
    mv /etc/fonts/conf.d/64-wqy-zenhei.conf /etc/fonts/conf.d/74-wqy-zenhei.conf && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY libs /decktape/libs/
COPY plugins /decktape/plugins/
COPY decktape.js /decktape/

RUN groupadd -g 1000 node && \
    useradd -u 1000 -g node -m -s /bin/sh node && \
    mkdir /slides && \
    chown node:node /slides && \
    # Chrome requires a writable home directory, also when the container runs with
    # an arbitrary UID, e.g. docker run --user to match the mounted volume owner.
    chmod 1777 /home/node

# Set explicitly, so that it does not depend on the /etc/passwd entry of the running UID.
ENV HOME=/home/node

WORKDIR /slides

USER node

# The --no-sandbox option is required, or --cap-add=SYS_ADMIN to docker run command
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md
ENTRYPOINT ["node", "/decktape/decktape.js", "--chrome-arg=--no-sandbox", "--chrome-arg=--disable-gpu"]

CMD ["-h"]
