#!/bin/bash

set -e

GITHUB_REPOSITORY_SHORTNAME=

if [[ -z "$INPUT_SERVICENAME" ]]; then
  export INPUT_SERVICENAME=$(echo $GITHUB_REPOSITORY | cut -d "/" -f 2)
fi

echo "Now registering $INPUT_SERVICENAME with LeanIX"

# Login to docker
echo $DOCKER_HUB_PASSWORD | docker login -u $DOCKER_HUB_USERNAME --password-stdin

(docker run --rm \
  -e GITHUB_REPOSITORY=$GITHUB_REPOSITORY \
  -e INT_LEANIX_NET_MICROSERVICES_API_TOKEN=$EU_LEANIX_NET_MICROSERVICES_API_TOKEN \
  -e INPUT_SERVICENAME=$INPUT_SERVICENAME \
  leanix/deployment-frequency-action) || true

curl -X POST \
  https://demo-eu.leanix.net/services/cicd-connector/v1/metadata \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
  -F api_token=YXBpdG9rZW46NVQ2UG1EVHkyUWhLc3pqZFpqRnBHVWZFdGZWemZUeVpoRnNYZnk5SA== \
  -F host=demo-eu.leanix.net
  -F file=@source-project/pivio.yaml