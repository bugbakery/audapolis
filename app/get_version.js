/* eslint-disable @typescript-eslint/no-var-requires */
const child_process = require('child_process');

const execOptions = {
  cwd: __dirname,
  encoding: 'utf-8',
};

function getVersion() {
  const baseVersion = require('./package.json').version;

  const lastBumpCommit = child_process
    .execSync(`git log --no-patch --pretty="%H" -L /version/,+1:package.json`, execOptions)
    .trim()
    .split('\n')[0];
  const commitListSinceBump = child_process.execSync(
    `git rev-list ${lastBumpCommit.trim()}..HEAD`,
    execOptions
  );
  const noCommitsSinceBump = commitListSinceBump.trim().split('\n').length;
  return `${baseVersion}.${noCommitsSinceBump}`;
}

function getBuildVersion() {
  return require('./package.json').version;
}

module.exports.getVersion = getVersion;
module.exports.getBuildVersion = getBuildVersion;
