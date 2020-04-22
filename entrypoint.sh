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
        export CMD="/node_modules/license-checker/bin/license-checker --json > dependencies.json"
        ;;
esac

docker run --rm \
  -e GITHUB_REPOSITORY=$GITHUB_REPOSITORY \
  -e INT_LEANIX_NET_MICROSERVICES_API_TOKEN=$INT_LEANIX_NET_MICROSERVICES_API_TOKEN \
  -e INPUT_SERVICENAME=$INPUT_SERVICENAME \
  leanix/deployment-frequency-action

# Login to docker
echo $DOCKER_HUB_PASSWORD | docker login -u $DOCKER_HUB_USERNAME --password-stdin

docker run --rm \
  -v $(pwd):/app/cloud-beta/source-project \
  leanix/microservice-intelligence-pivio-client \
  run_cicd_pivio --host int.leanix.net --token $INT_LEANIX_NET_MICROSERVICES_API_TOKEN --file source-project/pivio.yaml || true

cd /github/workspace
eval $CMD
exec java -jar /pivio.jar -serviceurl "https://int.leanix.net/services/integrations/v2/pivio/document" -addfield "api_token=${INT_LEANIX_NET_MICROSERVICES_API_TOKEN}" -uploadfailexit1 -verbose
