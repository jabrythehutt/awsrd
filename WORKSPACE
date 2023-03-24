load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive", "http_file")
load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

http_archive(
    name = "io_bazel_rules_docker",
    sha256 = "b1e80761a8a8243d03ebca8845e9cc1ba6c82ce7c5179ce2b295cd36f7e394bf",
    urls = ["https://github.com/bazelbuild/rules_docker/releases/download/v0.25.0/rules_docker-v0.25.0.tar.gz"],
)

load(
    "@io_bazel_rules_docker//repositories:repositories.bzl",
    container_repositories = "repositories",
)
container_repositories()

load("@io_bazel_rules_docker//repositories:deps.bzl", container_deps = "deps")

container_deps()

git_repository(
    name = "session_manager_repo",
    build_file = "//:BUILD_SESSION_MANAGER.bazel",
    commit = "7b544e9f381d809fd7117747d4b78b244addcf1e",
    remote = "https://github.com/aws/session-manager-plugin",
    # shallow_since = glip_shallow_slice,
)

load("@io_bazel_rules_docker//contrib:dockerfile_build.bzl", "dockerfile_image")

dockerfile_image(
    name = "session_manager_image",
    dockerfile = "@session_manager_repo//:Dockerfile"
)