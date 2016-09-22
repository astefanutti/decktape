FROM debian:8.3

ENV TERM xterm-color

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    libfontconfig

WORKDIR /decktape

# Copy each directory individually as Docker Hub does not take .dockerignore into account for the moment
# COPY . .
COPY libs libs/
COPY plugins plugins/
COPY decktape.js ./
COPY phantomjs.json ./

RUN mkdir bin

RUN curl -kf \
    -L https://github.com/astefanutti/decktape/releases/download/v1.0.0/phantomjs-linux-x86-64 \
    -o bin/phantomjs

RUN chmod +x bin/phantomjs

WORKDIR /slides

ENTRYPOINT ["/decktape/bin/phantomjs", "/decktape/decktape.js"]
CMD ["-h"]
