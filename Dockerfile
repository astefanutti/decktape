FROM node:9-alpine as builder

ENV NODE_ENV production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

RUN apk add --no-cache --virtual .gyp python make g++

WORKDIR /decktape

COPY package.json npm-shrinkwrap.json ./
COPY libs libs/
COPY plugins plugins/
COPY decktape.js ./

# Force HummusJS build from source
# See https://github.com/galkahana/HummusJS/issues/230
RUN npm install && \
    node_modules/hummus/node_modules/.bin/node-pre-gyp clean install --build-from-source -C node_modules/hummus/ && \
    rm -rf node_modules/hummus/src && \
    rm -rf node_modules/hummus/build

FROM alpine:3.7

ENV TERM xterm-color
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Chromium
# https://git.alpinelinux.org/cgit/aports/log/community/chromium
RUN apk add --no-cache ca-certificates ttf-freefont && \
    apk add --no-cache chromium --repository http://dl-cdn.alpinelinux.org/alpine/edge/community && \
    apk add wqy-zenhei --update-cache --repository http://nl.alpinelinux.org/alpine/edge/testing --allow-untrusted && \
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
ENTRYPOINT ["node", "/decktape/decktape.js", "--no-sandbox", "--executablePath", "chromium-browser"]

CMD ["-h"]
