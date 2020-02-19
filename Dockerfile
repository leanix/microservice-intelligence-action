FROM leanix/pivio-client:latest

RUN apt-get update -yq && \
    apt-get upgrade -yq && \
    apt-get install -yq maven && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ADD ./entrypoint.sh /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]