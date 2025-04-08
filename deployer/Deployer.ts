import {
  BootstrapEnvironments,
  ICloudAssemblySource,
  IoMessage,
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
import { Observable, Subscriber } from "rxjs";

export class Deployer {
  constructor(
    private propsResolver: InstancePropsResolver,
    private stopperProps: LambdaProps,
  ) {}

  destroy(request: StackRequest): Observable<IoMessage<unknown>> {
    return new Observable((subscriber) => {
      this.executeOperation(request, subscriber, (cdk, cx) =>
        cdk.destroy(cx, {
          stacks: {
            strategy: StackSelectionStrategy.ALL_STACKS,
          },
        }),
      );
    });
  }

  async toAssemblySource(
    request: StackRequest,
    subscriber: Subscriber<IoMessage<unknown>>,
  ): Promise<[Toolkit, ICloudAssemblySource]> {
    const { profile } = request;
    const cdk = new Toolkit({
      ioHost: {
        async notify(msg) {
          subscriber.next(msg);
        },
        async requestResponse(msg) {
          return msg.defaultResponse;
        },
      },
      sdkConfig: {
        profile,
      },
    });
    const cx = await cdk.fromAssemblyBuilder(() => this.toAssemply(request));
    return [cdk, cx];
  }

  async executeOperation(
    request: StackRequest,
    subscriber: Subscriber<IoMessage<unknown>>,
    operation: (cdk: Toolkit, cx: ICloudAssemblySource) => Promise<void>,
  ): Promise<void> {
    try {
      const [cdk, cx] = await this.toAssemblySource(request, subscriber);
      await cdk.bootstrap(
        BootstrapEnvironments.fromCloudAssemblySource(cx),
        {},
      );
      await operation(cdk, cx);
      subscriber.complete();
    } catch (err) {
      subscriber.error(err);
    }
  }

  deploy(request: StackRequest): Observable<IoMessage<unknown>> {
    return new Observable((subscriber) => {
      this.executeOperation(request, subscriber, (cdk, cx) => cdk.deploy(cx));
    });
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
