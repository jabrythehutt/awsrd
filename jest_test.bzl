load("@aspect_rules_jest//jest:defs.bzl", _jest_test = "jest_test")

def jest_test(name, data = [], config = "//:jest_config", node_modules = "//:node_modules", node_options = ["--experimental-vm-modules"], **kwargs):
    _jest_test(
        name = name,
        config = config,
        data = data + [
            "//:package",
        ],
        node_modules = node_modules,
        node_options = node_options,
        **kwargs
    )
