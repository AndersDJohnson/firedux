#!/bin/bash

npm run verb
if [ $? -ne 0 ]; then exit 1; fi
git add README.md
git commit -m "Build README.md."
if [ $? -ne 0 ]; then exit 1; fi
git push -q "https://${GITHUB_TOKEN}@github.com/AndersDJohnson/firedux.git"> /dev/null 2>&1

