import { combineLatest } from "rxjs";
import { AwsContextResolver } from "../aws-client";
import { defaultRootVolumeSizeGb } from "../create";
import { StackRequest } from "../deployer";
import { InstanceStore } from "../ec2";
import { ProfileStore } from "../profile";
import { toPromise } from "../rxjs";
import { defaultInstanceType } from "./defaultInstanceType";
import { StackArg } from "../command";

export class InstanceDeleter {
  constructor(
    private instanceStore: InstanceStore,
    private profileStore: ProfileStore,
    private contextResolver: AwsContextResolver,
  ) {}

  async resolveStackName(instanceId: string): Promise<string | undefined> {
    const instance = await this.instanceStore.describe(instanceId);
    return instance?.Tags?.find(
      (tag) => tag.Key === "aws:cloudformation:stack-name",
    )?.Value;
  }

  async toDeleteRequest(instanceId: string): Promise<StackRequest> {
    const stackName = await this.resolveStackName(instanceId);
    if (!stackName) {
      throw new Error(
        `No associated stack was found for instance: ${instanceId}`,
      );
    }
    const props = this.toContext(stackName);
    const [profile, region, account] = await toPromise(
      combineLatest([
        this.profileStore.value,
        this.contextResolver.region$,
        this.contextResolver.account$,
      ]),
    );
    return {
      profile,
      region,
      account,
      props,
    };
  }

  toContext(stackName: string): Record<StackArg, string> {
    return {
      stackName,
      // The instance request values don't matter since we're attempting to delete the stack
      imageId: "",
      instanceType: defaultInstanceType,
      rootVolumeSizeGb: `${defaultRootVolumeSizeGb}`,
    };
  }
}
