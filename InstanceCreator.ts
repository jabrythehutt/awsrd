import { CreateInstanceRequest } from "./CreateInstanceRequest";
import { join } from "path";

export class InstanceCreator {
  constructor(private cdkAppPath: string) {}

  get cdkBinaryPath(): string {
    return join(require.resolve("aws-cdk"), "bin", "cdk");
  }

  toTerminalCommand(
    request: CreateInstanceRequest,
    extraArgs: Record<string, string>
  ): string[] {
    const optionArgs = Object.entries(request).map(
      ([key, value]) => `-c ${key}=${value}`
    );
    const extraArgStrings = Object.entries(extraArgs).map(
      ([key, value]) => `--${key} ${value}`
    );
    const appArgs = `-a "node ${this.cdkAppPath}"`;
    return [this.cdkBinaryPath, appArgs, ...optionArgs, ...extraArgStrings];
  }
}
