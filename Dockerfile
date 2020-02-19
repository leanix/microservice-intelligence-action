FROM leanix/pivio-client:latest

ADD ./entrypoint.sh /entrypoint.sh

ENTRYPOINT [ "entrypoint.sh" ]