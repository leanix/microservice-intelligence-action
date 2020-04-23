
const fetch = require('node-fetch');

const myHeaders = {
    'Authorization': "token " + process.env.GITHUB_API_TOKEN
};

// The maximum page size is 100
fetch("https://api.github.com/repos/leanix/camunda/pulls?state=closed&base=master&per_page=10", { headers: myHeaders })
    .then(response => response.json())
    .then(prs => {
        prs.filter(pr => pr.merged_at)
            .map(pr => {
                fetch(pr._links.commits.href, { headers: myHeaders })
                    .then(response => response.json())
                    .then(commits => commits.map(commit => commit.commit.committer.date)[0])
                    .then(commit => Date.parse(pr.merged_at) - Date.parse(commit))
                    .then(durationMs => Math.ceil(durationMs / 1000 / 60))
                    .then(durationMin => ({
                        repository: 'camunda',
                        merged_at: pr.merged_at,
                        durationMin
                    }))
                    .then(info => console.log(info));
            })
    });