import { join } from "path";

export class CdkCommander {
  get cdkBinPath(): string {
    return join(__dirname, "node_modules", "aws-cdk", "bin", "cdk");
  }

  get cdkAppPath(): string {
    return join(__dirname, process.env.CDK_APP_FILENAME as string);
  }

  get cdkAppArgs(): string[] {
    return ["-a", `"node ${this.cdkAppPath}"`];
  }

  toOptionArgs(params: Record<string, string>): string[] {
    return Object.entries(params).map(([key, value]) => `--${key} "${value}"`);
  }

  toContextArgs<T extends object>(context: T): string[] {
    return Object.entries(context).map(
      ([key, value]) => `-c ${key}="${value}"`
    );
  }
}
