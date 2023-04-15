import { Instance } from "@aws-sdk/client-ec2";
import { toInstanceName } from "./toInstanceName";

export function toInstanceLabel(instance: Instance): string {
  const name = toInstanceName(instance);
  const id = instance.InstanceId as string;
  return name ? `${id} (${name})` : id;
}
