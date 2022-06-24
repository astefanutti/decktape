# syntax=docker/dockerfile:1.3.0-labs

FROM node:17.2.0-alpine as builder

ENV NODE_ENV production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

WORKDIR /decktape

COPY package.json npm-shrinkwrap.json ./
COPY libs libs/
COPY plugins plugins/
COPY decktape.js ./

RUN npm install

FROM alpine:3.15.0

LABEL org.opencontainers.image.source="https://github.com/astefanutti/decktape"

ARG CHROMIUM_VERSION=103.0.5060.53-r0
ENV TERM xterm-color

RUN <<EOF cat > /etc/apk/repositories
http://dl-cdn.alpinelinux.org/alpine/edge/main
http://dl-cdn.alpinelinux.org/alpine/edge/community
http://dl-cdn.alpinelinux.org/alpine/edge/testing
EOF

# Chromium, CA certificates, fonts
# https://git.alpinelinux.org/cgit/aports/log/community/chromium
RUN apk update && apk upgrade && \
    apk add --no-cache \
    ca-certificates \
    libstdc++ \
    chromium=${CHROMIUM_VERSION} \
    font-noto-emoji \
    freetype \
    harfbuzz \
    nss \
    ttf-freefont \
    wqy-zenhei && \
    # /etc/fonts/conf.d/44-wqy-zenhei.conf overrides 'monospace' matching FreeMono.ttf in /etc/fonts/conf.d/69-unifont.conf
    mv /etc/fonts/conf.d/44-wqy-zenhei.conf /etc/fonts/conf.d/74-wqy-zenhei.conf && \
    rm -rf /var/cache/apk/*

# Node.js
COPY --from=builder /usr/local/bin/node /usr/local/bin/

# DeckTape
COPY --from=builder /decktape /decktape

RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node && \
    mkdir /slides && \
    chown node:node /slides

WORKDIR /slides

USER node

# The --no-sandbox option is required, or --cap-add=SYS_ADMIN to docker run command
# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-in-docker
# https://github.com/GoogleChrome/puppeteer/issues/290
# https://github.com/jessfraz/dockerfiles/issues/65
# https://github.com/jessfraz/dockerfiles/issues/156
# https://github.com/jessfraz/dockerfiles/issues/341
ENTRYPOINT ["node", "/decktape/decktape.js", "--chrome-path", "chromium-browser", "--chrome-arg=--no-sandbox"]

CMD ["-h"]
