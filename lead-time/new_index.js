
const fetch = require('node-fetch');
const request = require('request-promise-native');

const myHeaders = {
    'Authorization': "token " + process.env.GITHUB_API_TOKEN
};

const API_TOKEN = 'YayamXVBL4RChnKEBYzGNjSLrYBdrnCagrrdEgW5';
const DOMAIN = 'https://test-app-flow-2.leanix.net';
const WORKSPACE_ID = '120d4a91-ece8-4888-9409-92400cc31a44';

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

// TODO Handle develop
// The maximum page size is 100
async function fetchLeadTimes(repo) {
    return fetch("https://api.github.com/repos/leanix/" + repo.name + "/pulls?state=closed&base=" + repo.baseBranch + "&per_page=100", { headers: myHeaders })
        .then(response => response.json())
        .then(prs =>
            Promise.all(prs.filter(pr => pr.merged_at)
                .map(pr =>
                    fetch(pr._links.commits.href, { headers: myHeaders })
                        .then(response => response.json())
                        .then(commits => commits.map(commit => commit.commit.committer.date)[0])
                        .then(commit => Date.parse(pr.merged_at) - Date.parse(commit))
                        .then(durationMs => Math.ceil(durationMs / 1000 / 60))
                        .then(durationMin => ({
                            baseBranch: repo.baseBranch,
                            repository: repo.name,
                            merged_at: pr.merged_at,
                            durationMin
                        }))
                )
            )
        )
}

const repos = [
    { name: 'camunda', baseBranch: 'master' },
    { name: 'leanix-pathfinder', baseBranch: 'develop' }
];

function createMetricsPoint(repo, metric, value, timeStamp) {
    return {
        measurement: "leadtime_" + metric,
        workspaceId: WORKSPACE_ID,
        time: new Date(timeStamp).toISOString(),
        tags: [{
            k: 'externalIdProject',
            v: repo
        }],
        fields: [
            {
                k: repo,
                v: value
            }
        ]
    };
}

async function main() {
    const prOpenTimes = await Promise.all(repos.map(repo => fetchLeadTimes(repo)));
    const untilReleaseTimes = await Promise.all(prOpenTimes
        .map(prOpenTimeOfRepo => Promise.all(prOpenTimeOfRepo
            .filter(prOpenTime => prOpenTime.baseBranch != 'master')
            .map(prOpenTime => fetch("https://api.github.com/repos/leanix/" + prOpenTime.repository + "/commits?sha=" + prOpenTime.baseBranch + "&since=" + prOpenTime.merged_at, { headers: myHeaders })
                .then(response => response.json())
                .then(commits => commits
                    .map(commit => commit.commit)
                    .filter(commit => commit.message.startsWith("Merge release branch"))
                )
                .then(commits => commits[commits.length - 1])
                .then(commit => commit.committer.date)
                .then(commitDate => Date.parse(commitDate) - Date.parse(prOpenTime.merged_at))
                .then(durationMs => Math.ceil(durationMs / 1000 / 60))
                .then(untilReleaseMin => ({
                    repository: prOpenTime.repository,
                    merged_at: prOpenTime.merged_at,
                    untilReleaseMin
                }))
            ))
        ));
    console.log(prOpenTimes);
    console.log(untilReleaseTimes);

    const accessToken = await getAccessToken(API_TOKEN);
    for (const prOpenTime of prOpenTimes) {
        const responses = await Promise.all(prOpenTime
            .map(r => createMetricsPoint(r.repository, 'branchLifeTime', r.durationMin, r.merged_at))
            .map(metricsPoint => sendMetrics(accessToken, metricsPoint))
        );
    }
    for (const untilReleaseTime of untilReleaseTimes) {
        const responses = await Promise.all(untilReleaseTime
            .map(r => createMetricsPoint(r.repository, 'mergeUntilReleaseTime', r.untilReleaseMin, r.merged_at))
            .map(metricsPoint => sendMetrics(accessToken, metricsPoint))
        );
    }
}

main();