FROM ubuntu:latest

ADD ./entrypoint.sh /entrypoint.sh

# Install docker-cli
RUN curl -fsSL 'https://download.docker.com/linux/static/stable/x86_64/docker-18.06.3-ce.tgz' | \
    tar zxvf - --strip 1 -C /usr/bin docker/docker

ENTRYPOINT [ "/entrypoint.sh" ]