load("@aspect_bazel_lib//lib:directory_path.bzl", "directory_path")
load("@aspect_bazel_lib//lib:run_binary.bzl", "run_binary")
load("@aspect_bazel_lib//lib:output_files.bzl", "output_files")
load("@aspect_bazel_lib//lib:copy_to_directory.bzl", "copy_to_directory")
load("@aspect_bazel_lib//lib:copy_file.bzl", "copy_file")
load("//:platforms.bzl", "to_config_name")

archs = {
    "amd64": "x86_64",
    "arm64": "arm64",
}
oss = {
    "linux": "linux",
    "darwin": "macos",
}

workdir = "session-manager-plugin"

def dist_files():
    dist_files = []
    for arch in archs.keys():
        for os in oss.keys():
            suffix = os + "_" + arch
            bin_path = "{suffix}_plugin/{workdir}".format(suffix = suffix, workdir = workdir)
            dist_files.append(bin_path)
    return dist_files

def session_manager_dist(name, image_id_file):

    file_name = "session-manager-plugin"
    copy_commands = {}
    for arch in archs.keys():
        for os in oss.keys():
            suffix = os + "_" + arch
            dir_name = name + "_" + suffix
            config_name = to_config_name(oss[os], archs[arch])
            bin_path = "/{suffix}_plugin/{file_name}".format(suffix = suffix, file_name = file_name)
            cmd = "cp $(SRCS){bin_path} $@".format(bin_path = bin_path)
            copy_commands[config_name] = cmd

    native.genrule(
        name = name,
        srcs = [
            image_id_file,
            "@multitool//tools/docker"
        ],
        outs = [
            "dist"
        ],
        cmd = " && ".join([
            "cid=$$($(location @multitool//tools/docker) create $$(cat $(location {})))".format(image_id_file),
            "$(location @multitool//tools/docker) cp $$cid:/{}/bin $@".format(workdir),
            "$(location @multitool//tools/docker) rm $$cid"
        ])
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
            config_name = to_config_name(oss[os], archs[arch])
            bin_path = "/{suffix}_plugin/{file_name}".format(suffix = suffix, file_name = file_name)
            cmd = "cp $(SRCS){bin_path} $@".format(bin_path = bin_path)
            copy_commands[config_name] = cmd

    # native.genrule(
    #     name = name,
    #     srcs = [
    #         release_dir,
    #     ],
    #     outs = [name],
    #     cmd = select(copy_commands),
    # )
