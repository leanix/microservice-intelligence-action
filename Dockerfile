FROM ubuntu:latest

# Install docker-cli
RUN apt-get update -y && apt-get install -y curl && \
    curl -fsSL 'https://download.docker.com/linux/static/stable/x86_64/docker-18.06.3-ce.tgz' | \
    tar zxvf - --strip 1 -C /usr/bin docker/docker

ADD ./entrypoint.sh /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]