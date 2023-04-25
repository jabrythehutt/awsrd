load("@aspect_rules_ts//ts:defs.bzl", _ts_project = "ts_project")

default_tsc = "//:ttsc"

def ts_project(name, tsc = default_tsc, deps = [], declaration = True, resolve_json_module = True, **kwargs):
    _ts_project(
        name = name,
        tsc = tsc,
        deps = deps + ["//:node_modules/typescript"],
        declaration = declaration,
        resolve_json_module = resolve_json_module,
        **kwargs
    )
