import { join } from "path";
import { AwsContextResolver } from "./AwsContextResolver";
import { toPromise } from "./toPromise";
import { Observable } from "rxjs";

export class CdkCommander {
  constructor(private contextResolver: AwsContextResolver, private profileStore: Observable<string>) {
  }

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

  async resolveCommonOptions(): Promise<Record<string, string>> {
    const region = await this.contextResolver.region();
    const profile = await toPromise(this.profileStore);
    return {
      profile,
      region,
      "require-approval": "never",
    };
  }

  async resolveCommonOptionArgs(): Promise<string[]> {
    return this.toOptionArgs(await this.resolveCommonOptions());
  }
}
