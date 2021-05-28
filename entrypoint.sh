#!/bin/bash

set -e

GITHUB_REPOSITORY_SHORTNAME=
if [[ -z "$INPUT_SERVICENAME" ]]; then
  export INPUT_SERVICENAME=$(echo $GITHUB_REPOSITORY | cut -d "/" -f 2)
fi

# Login to docker
echo $ACR_PUBLIC_PASSWORD | docker login -u $ACR_PUBLIC_USERNAME --password-stdin leanixacrpublic.azurecr.io

echo "Updating deployment frequency"
(docker run --rm \
  -e GITHUB_REPOSITORY=$GITHUB_REPOSITORY \
  -e INT_LEANIX_NET_MICROSERVICES_API_TOKEN=$EU_LEANIX_NET_MICROSERVICES_API_TOKEN \
  -e INPUT_SERVICENAME=$INPUT_SERVICENAME \
  leanixacrpublic.azurecr.io/deployment-frequency-action) || true

echo "Updating code coverage"
(docker run --rm \
  -e GITHUB_REPOSITORY=$GITHUB_REPOSITORY \
  -e INT_LEANIX_NET_MICROSERVICES_API_TOKEN=$EU_LEANIX_NET_MICROSERVICES_API_TOKEN \
  -e INPUT_SERVICENAME=$INPUT_SERVICENAME \
  -e INPUT_CODECOVERAGE=$INPUT_CODECOVERAGE \
  leanixacrpublic.azurecr.io/code-coverage-action) || true

echo "Running MI Github Connector"
(docker run --rm \
  -e GITHUB_WORKSPACE \
  -e GITHUB_REPOSITORY \
  -e GITHUB_API_URL \
  -e GITHUB_TOKEN \
  -e LEANIX_API_TOKEN=$EU_LEANIX_NET_MICROSERVICES_API_TOKEN \
  leanix/leanix-mi-github-connector) || true

echo "Updating libraries and licenses"
if [[ -f "pom.xml" ]]; then
  echo "Mvn repository detected"
  unset JAVA_HOME
  mvn org.codehaus.mojo:license-maven-plugin:download-licenses $INPUT_ADDITIONALMAVENPARAMETERS
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
