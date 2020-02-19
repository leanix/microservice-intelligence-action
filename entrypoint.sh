#!/bin/bash

set -e

case $1 in
    mvn)
        export CMD="mvn org.codehaus.mojo:license-maven-plugin:download-licenses -U"
        ;;
    npm)
        export CMD="npm-license-checker"
        ;;
esac

eval $CMD
java -jar /pivio.jar -serviceurl "https://int.leanix.net/services/integrations/v2/pivio/document" -addfield "api_token=${INT_LEANIX_NET_MICROSERVICES_API_TOKEN}"