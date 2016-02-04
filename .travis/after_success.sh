#!/bin/bash

npm run verb

git config --global user.name "Travis CI"
git config --global user.email "adjohnson916@users.noreply.github.com"

if [ $? -ne 0 ]; then exit 1; fi
git add README.md
git commit -m "Build README.md."
if [ $? -ne 0 ]; then exit 1; fi
git push -q "https://${GITHUB_TOKEN}@github.com/adjohnson916/firedux.git"> /dev/null 2>&1

