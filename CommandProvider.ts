import { CommandSuffix } from "./CommandSuffix";

export interface CommandProvider<T extends `${CommandSuffix}`, A = void> {
  execute(args: A): Promise<void>;
}
