FROM leanix/pivio-client:latest

RUN apt-get update -yq && \
    apt-get upgrade -yq && \
    apt-get install -yq maven && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ADD ./entrypoint.sh /entrypoint.sh

# Install docker-cli
RUN curl -fsSL 'https://download.docker.com/linux/static/stable/x86_64/docker-18.06.3-ce.tgz' | \
    tar zxvf - --strip 1 -C /usr/bin docker/docker

ENTRYPOINT [ "/entrypoint.sh" ]