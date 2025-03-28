load("//:platforms.bzl", "to_config_name")

archs = {
    "x64": "x86_64",
    "arm64": "arm64",
}
oss = {
    "linux": "linux",
    "darwin": "macos",
}

def to_package_args_choice(base_args):
    choices = {}
    for arch in archs.keys():
        for os in oss.keys():
            vsc_target_name = os + "-" + arch
            config_name = "//:" + to_config_name(oss[os], archs[arch])
            choices[config_name] = base_args + ["--target", vsc_target_name]

    return choices
