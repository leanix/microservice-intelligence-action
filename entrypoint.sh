#!/bin/bash
set -e

# Ensure JAVA_HOME is set correctly even if the variable was passed in during docker run.
# If the calling github workflow uses the setup-java action it will set the env var and pass it into this container.
export JAVA_HOME="/docker-java-home/jre"

case $1 in
    mvn)
        export CMD="mvn -B org.codehaus.mojo:license-maven-plugin:download-licenses -U"
        ;;
    npm)
        export CMD="npm-license-checker"
        ;;
esac

cd /github/workspace
eval $CMD
exec java -jar /pivio.jar -serviceurl "https://int.leanix.net/services/integrations/v2/pivio/document" -addfield "api_token=${INT_LEANIX_NET_MICROSERVICES_API_TOKEN}" -uploadfailexit1 -verbose