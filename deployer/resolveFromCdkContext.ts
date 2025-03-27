import { Node } from "constructs";

export function resolveFromCdkContext<T extends string>(
  node: Node,
  keys: T[],
): Record<T, string | undefined> {
  return Object.fromEntries(
    keys.map((option) => [option, node.tryGetContext(option)]),
  ) as Record<T, string | undefined>;
}
