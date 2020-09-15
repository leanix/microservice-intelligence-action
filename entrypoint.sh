#!/bin/bash

set -e

GITHUB_REPOSITORY_SHORTNAME=
if [[ -z "$INPUT_SERVICENAME" ]]; then
  export INPUT_SERVICENAME=$(echo $GITHUB_REPOSITORY | cut -d "/" -f 2)
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
-F 'file=@'$INPUT_CONFIGFILEPATH

# Trigger metadata extraction for sandbox environment as well
curl -X POST https://demo-eu.leanix.net/services/cicd-connector/v1/metadata \
-F 'api_token=D8PEuLM4w4D6kf965vvKyTwsF9uHWW4YgdZV2MtO' \
-F 'host=demo-eu.leanix.net' \
-F 'file=@'$INPUT_CONFIGFILEPATH

if [[ -f "pom.xml" ]]; then
  echo "Mvn repository detected"
  
  unset JAVA_HOME 

  mvn org.codehaus.mojo:license-maven-plugin:download-licenses
  curl -X POST \
    'https://demo-eu.leanix.net/services/cicd-connector/v1/dependencies?source=mvn&externalId='$INPUT_SERVICENAME \
    -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
    -F 'api_token=D8PEuLM4w4D6kf965vvKyTwsF9uHWW4YgdZV2MtO' \
    -F 'host=demo-eu.leanix.net' \
    -F 'file=@target/generated-resources/licenses.xml'
else 
  if [[ -f "package.json" ]]; then
    echo "Npm repository detected"
    npm install -g license-checker
    license-checker --json > dependencies.json
    curl -X POST \
      'https://demo-eu.leanix.net/services/cicd-connector/v1/dependencies?source=npm&externalId='$INPUT_SERVICENAME \
      -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
      -F 'api_token=D8PEuLM4w4D6kf965vvKyTwsF9uHWW4YgdZV2MtO' \
      -F 'host=demo-eu.leanix.net' \
      -F 'file=@dependencies.json'
  else 
    echo "No valid repository detected"
  fi
fi