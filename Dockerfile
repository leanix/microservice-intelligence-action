FROM leanix/pivio-client:latest

ADD entrpoint.sh entrpoint.sh

ENTRYPOINT [ "entrypoint.sh" ]