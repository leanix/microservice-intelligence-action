const core = require('@actions/core');
const request = require('request-promise-native');

const MEASUREMENT = 'code-coverage-v2';
const WORKSPACE_ID = 'fcf734f4-1ca2-4f2d-8540-c292f73a45bf'
const DOMAIN = 'https://eu.leanix.net';
const LEANIX_MULTIPLE_MICROSERVICES = 'leanix-multiple-microservices';

async function getAccessToken(apiToken) {
  try {
    const result = await request.post({
      url: `${DOMAIN}/services/mtm/v1/oauth2/token`,
      auth: {
        user: 'apitoken',
        password: apiToken
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials',
      json: true
    });
    return result.access_token;
  } catch (error) {
    console.log('Error while fetching access token:', error);
    process.exit(1);
  }
}

function generateMetricsPoint(serviceName, coverage) {
  // If the service name is the special symbol 'leanix-multiple-microservices'
  // we only add the point to the project, not the application itself (... as there isn't such)
  const additionalTag = (serviceName == LEANIX_MULTIPLE_MICROSERVICES) ?
    [] : [{ k: 'externalIdApplication', v: `${serviceName}` }];

  return {
    measurement: MEASUREMENT,
    workspaceId: WORKSPACE_ID,
    time: new Date().toISOString(),
    tags: [...additionalTag, {
      k: 'externalIdProject',
      v: 'accelerateEngineering'
    }
    ],
    fields: [
      {
        k: `${serviceName}`,
        v: coverage
      }
    ]
  };
}

async function sendMetrics(accessToken, metricsPoint) {
  try {
    return request.post({
      url: `${DOMAIN}/services/metrics/v1/points`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: metricsPoint,
      json: true
    });
  } catch (error) {
    console.log('Error sending metrics:', error, 'for point ', metricsPoint);
    process.exit(1);
  }
}

async function main() {
  try {
    let coverage = core.getInput('codeCoverage');
    if (coverage) {
      if (coverage < 0 || isNaN(coverage)) {
        throw `Invalid coverage: ${coverage}`;
      }

      let microservice = core.getInput('serviceName');
      if (!microservice) {
          microservice = process.env.GITHUB_REPOSITORY.split('/')[1];
      }

      const apiToken = process.env.INT_LEANIX_NET_MICROSERVICES_API_TOKEN;
      const accessToken = await getAccessToken(apiToken);

      const metricsPoint = generateMetricsPoint(microservice, coverage);

      const result = await sendMetrics(accessToken, metricsPoint);
      console.log(JSON.stringify(result));
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
