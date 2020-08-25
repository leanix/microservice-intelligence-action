#!/bin/bash

set -e

GITHUB_REPOSITORY_SHORTNAME=
PIVIO_FILE_PATH="@pivio.yaml"
if [[ -z "$INPUT_SERVICENAME" ]]; then
  export INPUT_SERVICENAME=$(echo $GITHUB_REPOSITORY | cut -d "/" -f 2)
fi

if [[ -n "$INPUT_CONFIGFILEPATH" ]]; then
  export PIVIO_FILE_PATH="@$INPUT_CONFIGFILEPATH"
fi

echo "Now registering $INPUT_SERVICENAME with LeanIX with config file $INPUT_CONFIGFILEPATH"

# Login to docker
echo $DOCKER_HUB_PASSWORD | docker login -u $DOCKER_HUB_USERNAME --password-stdin

(docker run --rm \
  -e GITHUB_REPOSITORY=$GITHUB_REPOSITORY \
  -e INT_LEANIX_NET_MICROSERVICES_API_TOKEN=$EU_LEANIX_NET_MICROSERVICES_API_TOKEN \
  -e INPUT_SERVICENAME=$INPUT_SERVICENAME \
  leanix/deployment-frequency-action) || true

curl -X POST https://demo-eu.leanix.net/services/cicd-connector/v1/metadata \
-F 'api_token='$EU_LEANIX_NET_MICROSERVICES_API_TOKEN \
-F 'host=demo-eu.leanix.net' \
-F 'file='$PIVIO_FILE_PATH
