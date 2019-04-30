FROM node:11-alpine as builder

ENV NODE_ENV production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN apk add --no-cache python make g++

WORKDIR /decktape

COPY package.json npm-shrinkwrap.json ./
COPY libs libs/
COPY plugins plugins/
COPY decktape.js ./

# Force HummusJS build from source
# See https://github.com/galkahana/HummusJS/issues/230
RUN npm install --build-from-source=hummus && \
    rm -rf node_modules/hummus/src && \
    rm -rf node_modules/hummus/build

FROM alpine:3.9

ENV TERM xterm-color
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Chromium, CA certificates, fonts
# https://git.alpinelinux.org/cgit/aports/log/community/chromium
RUN apk update && apk upgrade && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories && \
    apk add --no-cache \
    ca-certificates \
    chromium@edge \
    font-noto-emoji@edge \
    freetype@edge \
    harfbuzz@edge \
    nss@edge \
    ttf-freefont@edge \
    wqy-zenhei@edge && \
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
