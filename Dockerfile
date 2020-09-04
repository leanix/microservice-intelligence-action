FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive 

RUN apt-get update -yq && \
    apt-get upgrade -yq && \
    apt-get install -yq curl && \
    apt-get install -yq maven && \
    apt-get install -yq nodejs npm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install docker-cli
RUN curl -fsSL 'https://download.docker.com/linux/static/stable/x86_64/docker-18.06.3-ce.tgz' | \
    tar zxvf - --strip 1 -C /usr/bin docker/docker

ADD ./entrypoint.sh /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]