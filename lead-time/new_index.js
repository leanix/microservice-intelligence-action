
const fetch = require('node-fetch');
const request = require('request-promise-native');
const _ = require('lodash');

const environment = {
    lxApiToken: 'YayamXVBL4RChnKEBYzGNjSLrYBdrnCagrrdEgW5',
    domain: 'https://test-app-flow-2.leanix.net',
    workspaceId: '120d4a91-ece8-4888-9409-92400cc31a44',
    githubApiToken: process.env.GITHUB_API_TOKEN
};

async function getAccessToken(domain, apiToken) {
    try {
        const result = await request.post({
            url: `${domain}/services/mtm/v1/oauth2/token`,
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

async function sendMetrics(domain, accessToken, metricsPoint) {
    try {
        return request.post({
            url: `${domain}/services/metrics/v1/points`,
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

// The maximum page size is 100
async function fetchBranchLifeTimes(token, repo) {
    return fetch("https://api.github.com/repos/leanix/" + repo.name + "/pulls?state=closed&base=" + repo.baseBranch + "&per_page=100", createGitHubRequestObject(token))
        .then(response => response.json())
        .then(prs =>
            Promise.all(prs.filter(pr => pr.merged_at)
                .map(pr =>
                    fetch(pr._links.commits.href, createGitHubRequestObject(token))
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

function createMetricsPoint(workspaceId, repo, metric, value, timeStamp) {
    return {
        measurement: "leadtime_" + metric,
        workspaceId,
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

function createGitHubRequestObject(token) {
    return {
        headers: {
            'Authorization': "token " + token
        }
    };
}

async function main() {
    console.log("Start fetching branch life times...");
    const branchLifeTimes = await Promise.all(_.flatMap(repos, repo => fetchBranchLifeTimes(environment.githubApiToken, repo)));
    console.log("Finished fetching branch life times.");
    
    console.log("Start fetching merge-until-release times...");
    const mergeUntilReleaseTimes = await Promise.all(branchLifeTimes
        .filter(branchLifeTime => branchLifeTime.baseBranch != 'master')
        .map(branchLifeTime => fetch("https://api.github.com/repos/leanix/" + branchLifeTime.repository + "/commits?sha=" + branchLifeTime.baseBranch + "&since=" + branchLifeTime.merged_at, createGitHubRequestObject(environment.githubApiToken))
            .then(response => response.json())
            .then(commits => commits
                .map(commit => commit.commit)
                .filter(commit => commit.message.startsWith("Merge release branch"))
            )
            .then(commits => commits[commits.length - 1])
            .then(commit => commit.committer.date)
            .then(commitDate => Date.parse(commitDate) - Date.parse(branchLifeTime.merged_at))
            .then(durationMs => Math.ceil(durationMs / 1000 / 60))
            .then(untilReleaseMin => ({
                repository: branchLifeTime.repository,
                merged_at: branchLifeTime.merged_at,
                untilReleaseMin
            }))
        ));
    console.log("Finished fetching merge-until-release times.");

    const accessToken = await getAccessToken(environment.domain, environment.lxApiToken);
    console.log("Start sending branch life times to metrics...");
    await Promise.all(branchLifeTimes
        .map(r => createMetricsPoint(environment.workspaceId, r.repository, 'branchLifeTime', r.durationMin, r.merged_at))
        .map(metricsPoint => sendMetrics(environment.domain, accessToken, metricsPoint))
    );
    console.log("Finished sending branch life times to metrics.");
    console.log("Start sending merge-until-release times to metrics...");
    await Promise.all(mergeUntilReleaseTimes
        .map(r => createMetricsPoint(environment.workspaceId, r.repository, 'mergeUntilReleaseTime', r.untilReleaseMin, r.merged_at))
        .map(metricsPoint => sendMetrics(environment.domain, accessToken, metricsPoint))
    );
    console.log("Finished sending merge-until-release times to metrics.");
}

main();