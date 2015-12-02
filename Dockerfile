FROM debian:8

RUN apt-get update

RUN apt-get install -y \
    curl \
    libwebp5 \
    libfontconfig \
    libjpeg62 \
    libssl1.0.0 \
    libicu52 \
    wget \
    bzip2

WORKDIR /decktape

# Copy each directory individually as Docker Hub does not take .dockerignore into account for the moment
# COPY . .
COPY libs libs/
COPY plugins plugins/
COPY decktape.js ./

RUN mkdir bin

# Instal PhantomJS
RUN curl \
    -L https://astefanutti.github.io/decktape/downloads/phantomjs-linux-debian8-x86-64 \
    -o bin/phantomjs
RUN chmod +x bin/phantomjs

# Install SlimerJS
WORKDIR /
RUN wget http://download.slimerjs.org/releases/0.9.6/slimerjs-0.9.6-linux-x86_64.tar.bz2
RUN tar -xvjf slimerjs-0.9.6-linux-x86_64.tar.bz2
RUN ln -s /slimerjs-0.9.6/slimerjs /decktape/bin/slimerjs

WORKDIR /decktape

ENTRYPOINT ["/decktape/bin/phantomjs", "decktape.js"]
CMD ["-h"]
