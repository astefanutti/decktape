FROM node:8 as builder

ENV NODE_ENV production

WORKDIR /decktape

COPY package.json npm-shrinkwrap.json ./
COPY libs libs/
COPY plugins plugins/
COPY decktape.js ./

RUN npm install

RUN apt-get update
RUN apt-get install -yq gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

FROM gcr.io/distroless/nodejs

ENV TERM xterm-color

# DeckTape
COPY --from=builder /decktape /decktape

# Chromium
COPY --from=builder \
    /usr/lib/x86_64-linux-gnu/libX11.so.6 \
    /usr/lib/x86_64-linux-gnu/libX11-xcb.so.1 \
    /usr/lib/x86_64-linux-gnu/libxcb.so.1 \
    /usr/lib/x86_64-linux-gnu/libXcomposite.so.1 \
    /usr/lib/x86_64-linux-gnu/libXcursor.so.1 \
    /usr/lib/x86_64-linux-gnu/libXdamage.so.1 \
    /usr/lib/x86_64-linux-gnu/libXext.so.6 \
    /usr/lib/x86_64-linux-gnu/libXfixes.so.3 \
    /usr/lib/x86_64-linux-gnu/libXi.so.6 \
    /usr/lib/x86_64-linux-gnu/libXrender.so.1 \
    /usr/lib/x86_64-linux-gnu/libXtst.so.6 \
    /usr/lib/x86_64-linux-gnu/libgobject-2.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libnss3.so \
    /usr/lib/x86_64-linux-gnu/libnssutil3.so \
    /usr/lib/x86_64-linux-gnu/libsmime3.so \
    /usr/lib/x86_64-linux-gnu/libnspr4.so \
    /usr/lib/x86_64-linux-gnu/libcups.so.2 \
    /usr/lib/x86_64-linux-gnu/libXss.so.1 \
    /usr/lib/x86_64-linux-gnu/libXrandr.so.2 \
    /usr/lib/x86_64-linux-gnu/libgio-2.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libasound.so.2 \
    /usr/lib/x86_64-linux-gnu/libpangocairo-1.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libpango-1.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libcairo.so.2 \
    /usr/lib/x86_64-linux-gnu/libatk-1.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libatk-bridge-2.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libgtk-3.so.0 \
    /usr/lib/x86_64-linux-gnu/libgdk-3.so.0 \
    /usr/lib/x86_64-linux-gnu/libgdk_pixbuf-2.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libXau.so.6 \
    /usr/lib/x86_64-linux-gnu/libXdmcp.so.6 \
    /usr/lib/x86_64-linux-gnu/libffi.so.6 \
    /usr/lib/x86_64-linux-gnu/libplc4.so \
    /usr/lib/x86_64-linux-gnu/libplds4.so \
    /usr/lib/x86_64-linux-gnu/libgssapi_krb5.so.2 \
    /usr/lib/x86_64-linux-gnu/libgnutls-deb0.so.28 \
    /usr/lib/x86_64-linux-gnu/libavahi-common.so.3 \
    /usr/lib/x86_64-linux-gnu/libavahi-client.so.3 \
    /usr/lib/x86_64-linux-gnu/libgmodule-2.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libgthread-2.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libpangoft2-1.0.so.0 \
    /usr/lib/x86_64-linux-gnu/libfontconfig.so.1 \
    /usr/lib/x86_64-linux-gnu/libfreetype.so.6 \
    /usr/lib/x86_64-linux-gnu/libthai.so.0 \
    /usr/lib/x86_64-linux-gnu/libpixman-1.so.0 \
    /usr/lib/x86_64-linux-gnu/libpng12.so.0 \
    /usr/lib/x86_64-linux-gnu/libxcb-shm.so.0 \
    /usr/lib/x86_64-linux-gnu/libxcb-render.so.0 \
    /usr/lib/x86_64-linux-gnu/libatspi.so.0 \
    /usr/lib/x86_64-linux-gnu/libcairo-gobject.so.2 \
    /usr/lib/x86_64-linux-gnu/libXinerama.so.1 \
    /usr/lib/x86_64-linux-gnu/libwayland-client.so.0 \
    /usr/lib/x86_64-linux-gnu/libxkbcommon.so.0 \
    /usr/lib/x86_64-linux-gnu/libwayland-cursor.so.0 \
    /usr/lib/x86_64-linux-gnu/libkrb5.so.3 \
    /usr/lib/x86_64-linux-gnu/libk5crypto.so.3 \
    /usr/lib/x86_64-linux-gnu/libkrb5support.so.0 \
    /usr/lib/x86_64-linux-gnu/libp11-kit.so.0 \
    /usr/lib/x86_64-linux-gnu/libtasn1.so.6 \
    /usr/lib/x86_64-linux-gnu/libnettle.so.4 \
    /usr/lib/x86_64-linux-gnu/libhogweed.so.2 \
    /usr/lib/x86_64-linux-gnu/libgmp.so.10 \
    /usr/lib/x86_64-linux-gnu/libharfbuzz.so.0 \
    /usr/lib/x86_64-linux-gnu/libdatrie.so.1 \
    /usr/lib/x86_64-linux-gnu/libgraphite2.so.3 \
    /usr/lib/x86_64-linux-gnu/nss \
    /usr/lib/x86_64-linux-gnu/libsqlite3.so.0 \
    /usr/lib/x86_64-linux-gnu/

COPY --from=builder \
    /lib/x86_64-linux-gnu/libglib-2.0.so.0 \
    /lib/x86_64-linux-gnu/libexpat.so.1 \
    /lib/x86_64-linux-gnu/libdbus-1.so.3 \
    /lib/x86_64-linux-gnu/libpcre.so.3 \
    /lib/x86_64-linux-gnu/libz.so.1 \
    /lib/x86_64-linux-gnu/libselinux.so.1 \
    /lib/x86_64-linux-gnu/libcom_err.so.2 \
    /lib/x86_64-linux-gnu/libkeyutils.so.1 \
    /lib/x86_64-linux-gnu/libudev.so.1 \
    /lib/x86_64-linux-gnu/

COPY --from=builder \
    /usr/share/fonts \
    /usr/share/fonts

COPY --from=builder \
    /etc/fonts/fonts.conf \
    /etc/fonts/fonts.conf

# RUN addgroup -g 1000 node && \
#     adduser -u 1000 -G node -s /bin/sh -D node && \
#     mkdir /slides && \
#     chown node:node /slides

WORKDIR /slides

# USER node

# The --no-sandbox option is required, or --cap-add=SYS_ADMIN to docker run command
# https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-in-docker
# https://github.com/GoogleChrome/puppeteer/issues/290
# https://github.com/jessfraz/dockerfiles/issues/65
# https://github.com/jessfraz/dockerfiles/issues/156
# https://github.com/jessfraz/dockerfiles/issues/341
ENTRYPOINT ["/nodejs/bin/node", "/decktape/decktape.js", "--no-sandbox"]

CMD ["-h"]
