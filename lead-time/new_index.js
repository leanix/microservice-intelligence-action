
const fetch = require('node-fetch');

const myHeaders = {
    'Authorization': "token " + process.env.GITHUB_API_TOKEN
};

fetch("https://api.github.com/repos/leanix/camunda/pulls", { headers: myHeaders })
    .then(response => response.json())
    .then(response => console.log(response));