load("@aspect_rules_swc//swc:defs.bzl", "swc")
load("@aspect_rules_ts//ts:defs.bzl", _ts_project = "ts_project")
load("@bazel_skylib//lib:partial.bzl", "partial")

def ts_project(name, declaration = True, source_map = True, tsconfig = "//:tsconfig", swcrc = "//:swcrc", deps = [], **kwargs):
    _ts_project(
        name = name,
        source_map = source_map,
        declaration = declaration,
        tsconfig = tsconfig,
        deps = deps + ["//:node_modules/tslib", "//:node_modules/@swc/helpers"],
        transpiler = partial.make(swc, source_maps = source_map, swcrc = swcrc),
        **kwargs
    )