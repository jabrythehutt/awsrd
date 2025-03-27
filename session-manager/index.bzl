load("@aspect_bazel_lib//lib:copy_file.bzl", "copy_file")
load("@aspect_bazel_lib//lib:copy_to_directory.bzl", "copy_to_directory")
load("@aspect_bazel_lib//lib:directory_path.bzl", "directory_path")
load("@aspect_bazel_lib//lib:output_files.bzl", "output_files")
load("@aspect_bazel_lib//lib:run_binary.bzl", "run_binary")
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
    dist_files = {}
    for arch in archs.keys():
        for os in oss.keys():
            suffix = os + "_" + arch
            bin_path = "{suffix}_plugin/{workdir}".format(suffix = suffix, workdir = workdir)
            config_name = "//:" + to_config_name(oss[os], archs[arch])
            dist_files[config_name] = bin_path
    return dist_files

def to_sub_files(prefix):
    sub_files = {}
    files = dist_files()
    for key in files.keys():
        sub_files[key] = prefix + files[key]
    return sub_files
