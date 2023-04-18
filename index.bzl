load("@aspect_rules_esbuild//esbuild:defs.bzl", "esbuild")
load("@aspect_rules_js//js:defs.bzl", "js_binary", "js_run_binary", "js_test")
load("platforms.bzl", "to_config_name")

def to_module_name(lib, prefix = "//:node_modules/"):
    return lib.replace(prefix, "")

def to_externals(external_libs):
    output = []
    for l in external_libs:
        output.append(to_module_name(l))
    return output

default_target = "es2020"

def cjs_bundle(name, external_libs = [], format = "cjs", output = None, sourcemap = "external", sources_content = True, target = default_target, **kwargs):
    output = output or name + ".cjs"
    esbuild(
        name = name,
        platform = "node",
        external = to_externals(external_libs),
        format = format,
        output = output,
        sourcemap = sourcemap,
        sources_content = sources_content,
        target = target,
        **kwargs
    )

def cli(name, entry_point, srcs = [], deps = [], external_libs = [], env = {"AWS_SDK_LOAD_CONFIG": "1"}, target = default_target, **kwargs):
    bundle_name = name + "_bundle"
    cjs_bundle(
        name = bundle_name,
        external_libs = external_libs,
        srcs = srcs,
        deps = deps,
        entry_point = entry_point,
        target = target,
    )
    js_binary(
        name = name,
        data = [
            bundle_name,
        ] + external_libs,
        entry_point = bundle_name + ".cjs",
        env = env,
        **kwargs
    )


def to_package_args_choice(base_args):
    archs = {
        "x64": "x86_64",
        "arm64": "arm64",
    }
    oss = {
        "linux": "linux",
        "darwin": "macos",
    }
    choices = {}
    for arch in archs.keys():
        for os in oss.keys():
            vsc_target_name = os + "-" + arch
            config_name = to_config_name(oss[os], archs[arch])
            choices[config_name] = base_args + ["--target", vsc_target_name]

    return choices
