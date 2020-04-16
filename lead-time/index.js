const simpleGit = require("simple-git/promise");

git = simpleGit("../leanix-pathfinder-web");

async function main() {
  try {
    let semanticVersionNumber = /^\d+.\d+.\d+$/;
    const tags = (await git.tags({ "--sort": "creatordate" })).all.filter(tag => semanticVersionNumber.test(tag));
    const start = tags.length - 400;
    for (let i = start + 1; i < tags.length; i++) {
      let endTag = tags[i];
      let startTag = tags[i - 1];
      // console.log(startTag, ' - ', endTag);
      const allCommits = await git.log({ from: startTag, to: endTag });

      const metrics = computeMetrics(allCommits.all);

      console.log(JSON.stringify({...metrics, release: endTag }));
      // console.log('average', metrics.averageLeadTimeInMs / 1000 / 60 / 60);
      // console.log('median', metrics.medianLeadTimeInMs / 1000 / 60 / 60);
    }



  } catch (error) {
    console.log(error);
  }

  console.log('done');
}

function computeMetrics(commits) {  
  if (commits.length === 0) {
    return {
      averageLeadTimeInMs: 0,
      medianLeadTimeInMs: 0
    };
  }

  const deployTime = (new Date(commits[0].date)).getTime();

  const processedCommits = commits
    .filter(commit => !invalidCommit(commit.message))
    .map(commit => ({
      originalCommit: commit,
      leadTime: deployTime - (new Date(commit.date).getTime())
    }));

  if (processedCommits.length === 0) {
    return {
      averageLeadTimeInMs: 0,
      medianLeadTimeInMs: 0
    };
  }

  const averageLeadTimeInMs = processedCommits.reduce((acc, c) => acc + c.leadTime, 0) / processedCommits.length;
  const sortedCommits = [...processedCommits].sort((a, b) => a.leadTime - b.leadTime);
  const medianIndex = Math.floor(sortedCommits.length / 2);
  const medianLeadTimeInMs = sortedCommits[medianIndex].leadTime;

  return {
    deployDate: commits[0].date,
    averageLeadTimeInMs,
    medianLeadTimeInMs
  };
}

function invalidCommit(commitMessage) {
  let semanticVersionNumber = /^\d+.\d+.\d+$/; // e.g. 5.0.344
  let releaseBranchMerge = 'Merge release branch';
  let bumpSnapshot = 'Bump snapshot version';

  return semanticVersionNumber.test(commitMessage) ||
    (commitMessage.indexOf(releaseBranchMerge) >= 0) ||
    (commitMessage.indexOf(bumpSnapshot) >= 0);
}

main();

// let testCommits = [
//   {
//     message: 'Merge release branch 1.2.3',
//     date: '2020-03-25 12:00:00 +0100'
//   }, {
//     message: '1.2.3',
//     date: '2020-03-25 11:59:50 +0100'
//   }, {
//     message: 'First',
//     date: '2020-03-25 11:00:00 +0100'
//   }, {
//     message: 'Second',
//     date: '2020-03-25 10:00:00 +0100'
//   }, {
//     message: 'Third',
//     date: '2020-03-25 09:00:10 +0100'
//   }, {
//     message: 'Bump snapshot version',
//     date: '2020-02-24 11:00:00 +0100'
//   }];

// const metrics = computeMetrics(testCommits);

// console.log('average', metrics.averageLeadTimeInMs / 1000 / 60 / 60);
// console.log('median', metrics.medianLeadTimeInMs / 1000 / 60 / 60);