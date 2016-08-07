#!/bin/bash

# Exit on errors.
set -e

# Exit unless default Node version (don't run for each one)
echo "TRAVIS_NODE_VERSION=${TRAVIS_NODE_VERSION}"
[ "${TRAVIS_NODE_VERSION}" != "node" ] && exit 1

echo "TRAVIS_PULL_REQUEST=${TRAVIS_PULL_REQUEST}"
# Exit if this is a pull request (T.B.D. - will it run again?)
[ "${TRAVIS_PULL_REQUEST}" = "true" ] && exit 1

GIT_CHANGED_FILES=`git diff --name-only ${TRAVIS_COMMIT_RANGE}`

echo "Git changed files:"
echo $GIT_CHANGED_FILES
echo

# Exit unless `.verb.md` changed.
( echo $GIT_CHANGED_FILES | grep .verb.md >> /dev/null ) || exit 1


echo "Setting git user..."

git config user.name "Travis CI"
git config user.email "adjohnson916@users.noreply.github.com"

echo "Git checkout... branch=$TRAVIS_BRANCH"
git checkout $TRAVIS_BRANCH

echo "Running verb..."

npm run verb

[ $? -ne 0 ] && exit 1

echo "Verb complete."

echo "Git add..."
git add README.md
[ $? -ne 0 ] && exit 1
echo "Git commit..."
git commit -m "docs(README): build from Travis"
[ $? -ne 0 ] && exit 1
echo "Git push..."
git push -q "https://${GITHUB_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git" $TRAVIS_BRANCH 2>&1 > /dev/null
