load("@aspect_rules_esbuild//esbuild:defs.bzl", "esbuild")

def to_module_name(lib, prefix = "//:node_modules/"):
    return lib.replace(prefix, "")

def to_externals(external_libs):
    output = []
    for l in external_libs:
        output.append(to_module_name(l))
    return output

default_target = "es2022"

def cjs_bundle(name, external_libs = [], format = "cjs", output = None, minify = True, sourcemap = None, sources_content = True, target = default_target, **kwargs):
    output = output or name + ".cjs"
    esbuild(
        name = name,
        platform = "node",
        config = "//bundle:build_config",
        external = to_externals(external_libs),
        minify = minify,
        format = format,
        output = output,
        sourcemap = sourcemap,
        sources_content = sources_content,
        target = target,
        **kwargs
    )
