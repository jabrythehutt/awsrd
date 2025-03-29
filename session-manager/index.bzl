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
