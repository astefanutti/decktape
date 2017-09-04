FROM node:8.4.0-slim

ENV NODE_ENV production
ENV TERM xterm-color

RUN apt-get update && \
    apt-get install -yq --no-install-recommends \
    libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
    libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    libnss3

WORKDIR /decktape

COPY package.json ./
COPY libs libs/
COPY plugins plugins/
COPY decktape.js ./

RUN chown -R node:node /decktape

# https://github.com/moby/moby/issues/20295
RUN mkdir /slides
RUN chown -R node:node /slides

USER node

RUN npm install

WORKDIR /slides

# The --no-sandbox option is required for the moment
# https://github.com/GoogleChrome/puppeteer/issues/290
ENTRYPOINT ["node", "/decktape/decktape.js", "--no-sandbox"]

CMD ["-h"]
