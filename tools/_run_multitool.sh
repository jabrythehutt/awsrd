#!/usr/bin/env bash
bazel run "@multitool//tools/$( basename $0 ):cwd" -- "$@"