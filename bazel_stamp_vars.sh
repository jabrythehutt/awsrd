#!/usr/bin/env bash
echo STABLE_GIT_COMMIT $(git rev-parse HEAD)
echo STABLE_GIT_VERSION $(git describe --tags $(git rev-list --tags --max-count=1) | cut -c2-)
echo STABLE_GIT_BRANCH $(git rev-parse --abbrev-ref HEAD)
