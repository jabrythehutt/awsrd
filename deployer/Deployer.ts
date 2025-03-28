import { combineLatest, Observable, of } from "rxjs";
import {
  AwsClientFactory,
  AwsContextResolver,
  createCredentialStore,
} from "../aws-client";
import { toPromise } from "../rxjs";
import { BootstrapEnvironments, Toolkit } from "@aws-cdk/toolkit-lib";
import { App, CfnOutput, Stack } from "aws-cdk-lib";
import { InstancePropsResolver } from "./InstancePropsResolver";
import { instanceTagName, instanceTagValue } from "../ec2";
import { VscInstance } from "./VscInstance";
import { StackArg } from "../command";

export class Deployer {
  constructor(
    private contextResolver: AwsContextResolver,
    private profileStore: Observable<string>,
  ) {}
  async deploy(request: Record<StackArg, string | undefined>): Promise<void> {
    const [region, account, profile] = await toPromise(
      combineLatest([
        this.contextResolver.region$,
        this.contextResolver.account$,
        this.profileStore,
      ]),
    );
    const cdk = new Toolkit({
      sdkConfig: {
        profile,
      },
    });
    const cx = await cdk.fromAssemblyBuilder(async () => {
      const app = new App();
      const credentialStore = createCredentialStore(of(profile));
      const clientFactory = new AwsClientFactory(credentialStore, of(region));
      const propsResolver = new InstancePropsResolver(clientFactory);

      const stack = new Stack(app, request.stackName, {
        tags: {
          [instanceTagName]: instanceTagValue,
        },
        env: {
          account,
          region,
        },
      });
      const props = await propsResolver.resolve(request, stack);
      const ec2 = new VscInstance(stack, "EC2", props);
      new CfnOutput(stack, "InstanceIdOutput", {
        value: ec2.instance.instanceId,
      });
      return app.synth();
    });
    await cdk.bootstrap(BootstrapEnvironments.fromCloudAssemblySource(cx), {});
    await cdk.deploy(cx);
  }
}
