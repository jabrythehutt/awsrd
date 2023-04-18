supported_os = ["linux", "macos"]
supported_arch = ["arm64", "x86_64"]

def to_config_name(os, arch):
    return os + "_" + arch

def to_platform_name(os, arch):
    return to_config_name(os, arch) + "_platform"

def platforms(): 
    for os in supported_os:
        for arch in supported_arch:
            constraint_values = [
                "@platforms//os:" + os,
                "@platforms//cpu:" + arch,                
            ]
            native.config_setting(
                name = to_config_name(os, arch),
                constraint_values = constraint_values,
            )
            native.platform(
                name = to_platform_name(os, arch),
                constraint_values = constraint_values,
            )