import {
  BootstrapEnvironments,
  ICloudAssemblySource,
  StackSelectionStrategy,
  Toolkit,
} from "@aws-cdk/toolkit-lib";
import { App, CfnOutput, Stack } from "aws-cdk-lib";
import { InstancePropsResolver } from "./InstancePropsResolver";
import { instanceTagName, instanceTagValue } from "../ec2";
import { VscInstance } from "./VscInstance";
import { StackRequest } from "./StackRequest";
import { ICloudAssembly } from "aws-cdk-lib/cloud-assembly-schema";
import { LambdaProps } from "./LambdaProps";

export class Deployer {
  constructor(
    private propsResolver: InstancePropsResolver,
    private stopperProps: LambdaProps,
  ) {}

  async destroy(request: StackRequest): Promise<void> {
    const [cdk, cx] = await this.toAssemblySource(request);
    await cdk.destroy(cx, {
      stacks: {
        strategy: StackSelectionStrategy.ALL_STACKS,
      },
    });
  }

  async toAssemblySource(
    request: StackRequest,
  ): Promise<[Toolkit, ICloudAssemblySource]> {
    const { profile } = request;
    const cdk = new Toolkit({
      sdkConfig: {
        profile,
      },
    });
    const cx = await cdk.fromAssemblyBuilder(() => this.toAssemply(request));
    return [cdk, cx];
  }

  async deploy(request: StackRequest): Promise<void> {
    const [cdk, cx] = await this.toAssemblySource(request);
    await cdk.bootstrap(BootstrapEnvironments.fromCloudAssemblySource(cx), {});
    await cdk.deploy(cx);
  }

  async toAssemply(request: StackRequest): Promise<ICloudAssembly> {
    return (await this.createApp(request)).synth();
  }

  async createApp(request: StackRequest): Promise<App> {
    const app = new App();
    const { region, account } = request;
    const stack = new Stack(app, request.props.stackName, {
      tags: {
        [instanceTagName]: instanceTagValue,
      },
      env: {
        account,
        region,
      },
    });
    const props = await this.propsResolver.resolve(request.props, stack);
    const ec2 = new VscInstance(stack, "EC2", {
      ...props,
      lambdaProps: this.stopperProps,
    });
    new CfnOutput(stack, "InstanceIdOutput", {
      value: ec2.instance.instanceId,
    });
    return app;
  }
}
