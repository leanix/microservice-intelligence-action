
const fetch = require('node-fetch');

const myHeaders = {
    'Authorization': "token " + process.env.GITHUB_API_TOKEN
};

// The maximum page size is 100
fetch("https://api.github.com/repos/leanix/camunda/pulls?state=closed&base=master&per_page=100", { headers: myHeaders })
    .then(response => response.json())
    .then(response => {
        console.log(response);
        console.log(response.length);
    });