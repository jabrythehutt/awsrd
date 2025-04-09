import { CommandSuffix } from "./CommandSuffix";
import { ExtensionKey } from "./ExtensionKey";
import packageJson from "../package.json";

export type CommandName = { [T in `${CommandSuffix}`]: ExtensionKey<T> };
export const CommandName: CommandName = Object.values(CommandSuffix).reduce(
  (values, commandSuffix) => ({
    ...values,
    [commandSuffix]: `${packageJson.name}.${commandSuffix}`,
  }),
  {} as CommandName,
);
