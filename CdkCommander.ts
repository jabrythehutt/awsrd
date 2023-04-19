import { join } from "path";
import { AwsContextResolver } from "./AwsContextResolver";
import { toPromise } from "./toPromise";
import { Observable } from "rxjs";
import packageJson from "./package.json";
import { ContextArg } from "./ContextArg";

export class CdkCommander {
  constructor(
    private contextResolver: AwsContextResolver,
    private profileStore: Observable<string>
  ) {}

  get cdkBinPath(): string {
    const cdkVersion = packageJson.devDependencies["aws-cdk"];
    return `npm exec --package=aws-cdk@${cdkVersion}  --yes -- cdk`;
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

  async resolveDefaultContext(): Promise<Record<ContextArg, string>> {
    const profile = await toPromise(this.profileStore);
    return {
      profile,
    };
  }

  async resolveCommonOptions(): Promise<Record<string, string>> {
    const defaultContext = await this.resolveDefaultContext();
    return {
      ...defaultContext,
      region: await this.contextResolver.region(),
      "require-approval": "never",
    };
  }

  toLine(args: string[]): string {
    return args.join(" ");
  }

  async resolveBootstrapCommand(): Promise<string> {
    const optionArgs = await this.resolveCommonOptionArgs();
    return this.toLine([
      this.cdkBinPath,
      "bootstrap",
      `aws://${await this.contextResolver.account()}/${await this.contextResolver.region()}`,
      ...optionArgs,
    ]);
  }

  async resolveCommonOptionArgs(): Promise<string[]> {
    return this.toOptionArgs(await this.resolveCommonOptions());
  }

  async toDefaultCommand<T extends object>(
    cdkCommand: "deploy" | "destroy" | "synth",
    context: T
  ): Promise<string> {
    const defaultOptions = await this.resolveCommonOptionArgs();
    const defaultContext = await this.resolveDefaultContext();
    return this.toLine([
      this.cdkBinPath,
      cdkCommand,
      ...this.cdkAppArgs,
      ...this.toContextArgs<T & Record<ContextArg, string>>({
        ...defaultContext,
        ...context,
      }),
      ...defaultOptions,
    ]);
  }
}
