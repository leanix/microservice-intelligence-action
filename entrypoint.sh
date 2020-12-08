#!/bin/bash

set -e

GITHUB_REPOSITORY_SHORTNAME=
if [[ -z "$INPUT_SERVICENAME" ]]; then
  export INPUT_SERVICENAME=$(echo $GITHUB_REPOSITORY | cut -d "/" -f 2)
fi

# Login to docker
echo $DOCKER_HUB_PASSWORD | docker login -u $DOCKER_HUB_USERNAME --password-stdin

echo "Updating deployment frequency"
(docker run --rm \
  -e GITHUB_REPOSITORY=$GITHUB_REPOSITORY \
  -e INT_LEANIX_NET_MICROSERVICES_API_TOKEN=$EU_LEANIX_NET_MICROSERVICES_API_TOKEN \
  -e INPUT_SERVICENAME=$INPUT_SERVICENAME \
  leanix/deployment-frequency-action) || true

echo "Updating service metadata"
curl -X POST https://eu.leanix.net/services/cicd-connector/v1/metadata \
-F 'api_token='$EU_LEANIX_NET_MICROSERVICES_API_TOKEN \
-F 'host=eu.leanix.net' \
-F 'file=@'$INPUT_CONFIGFILEPATH

echo "Updating libraries and licenses"
if [[ -f "pom.xml" ]]; then
  echo "Mvn repository detected"
  unset JAVA_HOME 
  mvn org.codehaus.mojo:license-maven-plugin:download-licenses
  curl -X POST \
    'https://eu.leanix.net/services/cicd-connector/v1/dependencies?source=mvn&externalId='$INPUT_SERVICENAME \
    -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
    -F "api_token=${EU_LEANIX_NET_MICROSERVICES_API_TOKEN}" \
    -F 'host=eu.leanix.net' \
    -F 'file=@target/generated-resources/licenses.xml'
else 
  if [[ -f "package.json" ]]; then
    echo "Npm repository detected"
    npm install -g license-checker
    license-checker --json > dependencies.json
    curl -X POST \
      'https://eu.leanix.net/services/cicd-connector/v1/dependencies?source=npm&externalId='$INPUT_SERVICENAME \
      -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
      -F "api_token=${EU_LEANIX_NET_MICROSERVICES_API_TOKEN}" \
      -F 'host=eu.leanix.net' \
      -F 'file=@dependencies.json'
  else 
    echo "No valid repository detected"
  fi
fi