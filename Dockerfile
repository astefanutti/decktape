FROM debian:8

RUN apt-get update

RUN apt-get install -y \
    curl \
    libwebp5 \
    libfontconfig \
    libjpeg62 \
    libssl1.0.0 \
    libicu52

COPY . /decktape

WORKDIR /decktape

RUN mkdir bin

RUN curl \
    -L https://astefanutti.github.io/decktape/downloads/phantomjs-linux-debian8-x86-64 \
    -o bin/phantomjs

RUN chmod +x bin/phantomjs

ENTRYPOINT ["/decktape/bin/phantomjs", "decktape.js"]
