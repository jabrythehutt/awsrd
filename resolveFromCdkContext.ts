import { Node } from "constructs";

export function resolveFromCdkContext<T extends string>(node: Node, keys: T[]): Record<T, string | undefined> {
    return keys.reduce((result, option) => ({
        ...result,
        [option]: node.tryGetContext(option)
      }), {} as Record<T, string | undefined>);
}
