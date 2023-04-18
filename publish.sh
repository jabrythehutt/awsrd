#!/usr/bin/env bash

set -e

# Don't rely on $PATH to have the right version
readonly BAZEL_BIN="npx -y @bazel/bazelisk"

readonly BAZEL=$BAZEL_BIN

for os in linux macos ; do
    for arch in arm64 x86_64 ; do
        $BAZEL run --stamp --config=release --platforms=//:${os}_${arch} publish
    done
done
