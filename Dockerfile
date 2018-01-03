FROM node:9-alpine

ENV NODE_ENV production
ENV TERM xterm-color

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# https://git.alpinelinux.org/cgit/aports/log/community/chromium
RUN apk add --no-cache ca-certificates ttf-freefont && \
    apk add --no-cache chromium --repository http://dl-cdn.alpinelinux.org/alpine/edge/community && \
    rm -rf /var/cache/apk/*

WORKDIR /decktape

COPY package.json ./
COPY libs libs/
COPY plugins plugins/
COPY decktape.js ./

RUN apk add --no-cache --virtual .gyp python make g++ && \
    npm install --production && \
    apk del .gyp && \
    rm -rf node_modules/hummus/src && \
    rm -rf node_modules/hummus/build && \
    rm -rf /root/.node-gyp && \
    rm -rf /root/.npm && \
    rm -rf /var/cache/apk/* && \
    chown -R node:node /decktape

# https://github.com/moby/moby/issues/20295
RUN mkdir /slides && \
    chown -R node:node /slides

USER node

WORKDIR /slides

# The --no-sandbox option is required for the moment
# https://github.com/GoogleChrome/puppeteer/issues/290
ENTRYPOINT ["node", "/decktape/decktape.js", "--no-sandbox", "--executablePath", "chromium-browser"]

CMD ["-h"]
