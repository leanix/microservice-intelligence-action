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

(docker run --rm \
  -v $(pwd):/app/cloud-beta/source-project \
  leanix/microservice-intelligence-pivio-client \
  python pivio.py run_cicd_pivio --host eu.leanix.net --token $EU_LEANIX_NET_MICROSERVICES_API_TOKEN --file $INPUT_SERVICENAME/pivio.yaml) || true