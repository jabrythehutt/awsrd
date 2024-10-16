load("@aspect_rules_ts//ts:defs.bzl", _ts_project = "ts_project")

def ts_project(name, deps = [], declaration = True, resolve_json_module = True, **kwargs):
    _ts_project(
        name = name,
        deps = deps + ["//:node_modules/typescript"],
        declaration = declaration,
        resolve_json_module = resolve_json_module,
        **kwargs
    )
