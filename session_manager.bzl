load("@aspect_bazel_lib//lib:directory_path.bzl", "directory_path")
load("@io_bazel_rules_docker//docker/util:run.bzl", "container_run_and_extract")
load("@io_bazel_rules_docker//container:container.bzl", "container_image")
load("@aspect_bazel_lib//lib:output_files.bzl", "output_files")
load("@aspect_bazel_lib//lib:copy_to_directory.bzl", "copy_to_directory")
load("@aspect_bazel_lib//lib:copy_file.bzl", "copy_file")

def session_manager(name):
    workdir = "/session-manager-plugin"
    base_name = name + "_base"
    container_image(
        name = base_name,
        base = "@session_manager_image//image:dockerfile_image.tar",
        directory = workdir,
        files = [
            "@session_manager_repo//:all_srcs",
        ],
        mode = "7777",
    )

    image_dist_path = workdir + "/bin"

    release_name = name + "_release"
    container_run_and_extract(
        name = release_name,
        commands = [
            "cd " + workdir,
            "make release",
        ],
        extract_file = image_dist_path,
        image = base_name + ".tar",
    )

    release_dir = release_name + "_dir"
    output_files(
        name = release_dir,
        target = release_name,
        paths = [
            release_name + image_dist_path,
        ],
    )

    archs = {
        "amd64": "x86_64",
        "arm64": "arm64",
    }
    oss = {
        "linux": "linux",
        "darwin": "macos",
    }
    file_name = "session-manager-plugin"
    copy_commands = {}
    for arch in archs.keys():
        for os in oss.keys():
            suffix = os + "_" + arch
            dir_name = name + "_" + suffix
            platform_name = dir_name + "_config"
            native.config_setting(
                name = platform_name,
                constraint_values = [
                    "@platforms//os:" + oss[os],
                    "@platforms//cpu:" + archs[arch],
                ],
            )

            bin_path = "/{suffix}_plugin/{file_name}".format(suffix = suffix, file_name = file_name)
            cmd = "cp $(SRCS){bin_path} $@".format(bin_path = bin_path)
            copy_commands[platform_name] = cmd

    native.genrule(
        name = name,
        srcs = [
            release_dir,
        ],
        outs = [name],
        cmd = select(copy_commands),
    )
