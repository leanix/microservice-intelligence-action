
const fetch = require('node-fetch');
const request = require('request-promise-native');
const _ = require('lodash');
const axios = require('axios');
const parseLinkHeader = require('parse-link-header');
const fs = require('fs');
const util = require('util');

const environment = {
    lxApiToken: '6xrAP6yfqYUYRjNabuRThZnFE9ESeBN35SAFrtKd', // Non-production token
    domain: 'https://test-app-flow-2.leanix.net',
    workspaceId: '120d4a91-ece8-4888-9409-92400cc31a44',
    githubApiToken: process.env.GITHUB_API_TOKEN // Export GITHUB_API_TOKEN on your shell
};

axios.defaults.baseURL = 'https://api.github.com';
axios.defaults.headers.common['Authorization'] = "token " + environment.githubApiToken;

const repos = [
    { name: 'leanix-integration-api', baseBranch: 'master' },
    { name: 'cloudockit-connector', baseBranch: 'master' }
];

function getAccessToken(domain, apiToken) {
    return request.post({
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
    })
        .then(response => response.access_token)
        .catch(err => {
            console.error('Could not fetch LeanIX access token:', err);
            process.exit(1);
        });
}

function fetchGitHubRateLimit() {
    return axios.get("/rate_limit")
        .then(response => response.data);
}

function removeNonWorkingHours(minutes) {
    const noWorkPeriods = Math.floor(minutes / 60 / 16);
    return minutes - noWorkPeriods * 16 * 60;
}

function computeBranchLifeTimeInMinutes(commits, mergedAt) {
    const firstCommitDate = commits[0].commit.committer.date;
    const durationMs = Date.parse(mergedAt) - Date.parse(firstCommitDate);
    return removeNonWorkingHours(Math.ceil(durationMs / 1000 / 60));
}

function sendMetrics(domain, accessToken, metricsPoint) {
    return request.post({
        url: `${domain}/services/metrics/v1/points`,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: metricsPoint,
        json: true
    }).catch(err => {
        console.err('Error sending metrics:', err, 'for point ', metricsPoint);
        throw err;
    });
}

async function fetchBranchLifeTimes(repo, pagedPrUrl, doneUntil) {
    return axios.get(pagedPrUrl)
        .then(async response => {
            const results = await Promise.all(response.data
                .filter(pr => pr.merged_at)
                .filter(pr => !doneUntil || Date.parse(pr.merged_at) > Date.parse(doneUntil))
                .map(pr =>
                    axios.get(pr._links.commits.href)
                        .then(response => response.data)
                        .then(commits => ({
                            baseBranch: repo.baseBranch,
                            repository: "leanix/" + repo.name,
                            merged_at: pr.merged_at,
                            durationMin: computeBranchLifeTimeInMinutes(commits, pr.merged_at)
                        }))
                )
            ).catch(reason => {
                console.error("Could not fetch commits of PRs.");
                console.error(prs.map(pr => pr.url));
                console.error(reason);
                return [];
            });
            const linkHeader = parseLinkHeader(response.headers['Link']);
            if (linkHeader && linkHeader.next && results.length > 0) {
                return fetchBranchLifeTimes(repo, linkHeader.next.url)
                    .then(nextResults => results.concat(nextResults));
            } else {
                return results;
            }
        }).catch(reason => {
            console.error("Could not fetch any PRs!");
            console.error(reason);
            return [];
        });
}

async function fetchBranchLifeTimesOfRepos() {
    const fetchInfoBefore = await util.promisify(fs.readFile)('fetch_info.json', 'utf8').then(JSON.parse).catch(err => []);
    console.log("Found fetch information.");
    console.log(fetchInfoBefore);
    const fetchInfoAfter = await repos
        .map(repo => async () => {
            const repoId = "leanix/" + repo.name;
            const rateLimit = await fetchGitHubRateLimit();
            console.log("Remaining GitHub requests: " + rateLimit.resources.core.remaining);
            console.log("Processing '" + repoId + "'...");
            const doneUntil = _.find(fetchInfoBefore, info => info.repository == repoId);
            const initialPagePrUrl = "/repos/" + repoId + "/pulls?state=closed&base=" + repo.baseBranch + "&sort=updated&direction=desc&per_page=100";
            console.log("Start fetching branch life times...");
            const branchLifeTimes = await fetchBranchLifeTimes(repo, initialPagePrUrl, doneUntil);
            console.log(`Fetched ${branchLifeTimes.length} branch life times.`);
            console.log("Retrieving LeanIX access token...");
            const accessToken = await getAccessToken(environment.domain, environment.lxApiToken);
            console.log(`Start sending branch life times to metrics...`);
            await Promise.all(branchLifeTimes
                .map(r => createMetricsPoint(environment.workspaceId, r.repository, 'branchLifeTime', r.durationMin, r.merged_at))
                .map(metricsPoint => sendMetrics(environment.domain, accessToken, metricsPoint))
            );
            console.log(`Finished sending branch life times to metrics.`);
            return {
                repository: repoId,
                doneUntil: branchLifeTimes[0] ? branchLifeTimes[0].mergedAt : null
            };
        }).reduce((p, f) => p.then(async list => list.concat([await f()])), Promise.resolve([]));
    console.log("Updating fetch information...");
    const mergedFetchInfo = _.uniqBy(fetchInfoAfter.filter(info => !!info.doneUntil).concat(fetchInfoBefore), 'repository');
    await util.promisify(fs.writeFile)('fetch_info.json', JSON.stringify(mergedFetchInfo));
    console.log("Updated fetch information.");
    console.log(mergedFetchInfo);
}

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
    await fetchBranchLifeTimesOfRepos();
}

main();