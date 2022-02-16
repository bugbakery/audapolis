/* eslint-disable @typescript-eslint/no-var-requires */
const child_process = require('child_process');

function getVersion() {
  const baseVersion = require('./package.json').version;

  const execOptions = {
    cwd: __dirname,
    encoding: 'utf-8',
  };
  const lastBumpCommit = child_process.execSync(
    `git log --no-patch --pretty="%H" -L /version/,+1:package.json`,
    execOptions
  );
  const commitListSinceBump = child_process.execSync(
    `git rev-list ${lastBumpCommit.trim()}..HEAD`,
    execOptions
  );
  const noCommitsSinceBump = commitListSinceBump.trim().split('\n').length;
  return `${baseVersion}+${noCommitsSinceBump}`;
}

module.exports = getVersion;
