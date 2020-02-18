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
java -jar /pivio.jar -serviceurl "${PIVIO_SERVICE_URL}" -addfield "api_token=${API_TOKEN}"