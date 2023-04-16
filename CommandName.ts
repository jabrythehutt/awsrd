import { CommandSuffix } from "./CommandSuffix";
import packageJson from "./package.json";

export type CommandName = { [T in `${CommandSuffix}`]: `ec2vsc.${T}` };
export const CommandName: CommandName = Object.values(CommandSuffix).reduce(
  (values, commandSuffix) => ({
    ...values,
    [commandSuffix]: `${packageJson.name}.${commandSuffix}`,
  }),
  {} as CommandName
);
