FROM debian:8.3

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    libwebp5 \
    libfontconfig \
    libjpeg62 \
    libssl1.0.0 \
    libicu52

WORKDIR /decktape

# Copy each directory individually as Docker Hub does not take .dockerignore into account for the moment
# COPY . .
COPY libs libs/
COPY plugins plugins/
COPY decktape.js ./
COPY phantomjs.json ./

RUN mkdir bin

RUN curl -k \
    -L http://astefanutti.github.io/decktape/downloads/phantomjs-linux-debian8-x86-64 \
    -o bin/phantomjs

RUN chmod +x bin/phantomjs

WORKDIR /slides

ENTRYPOINT ["/decktape/bin/phantomjs", "/decktape/decktape.js"]
CMD ["-h"]
