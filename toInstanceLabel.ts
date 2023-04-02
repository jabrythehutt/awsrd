import { Instance } from "@aws-sdk/client-ec2";

export function toInstanceLabel(instance: Instance): string {
  const name = instance.Tags?.find((t) => t.Key === "Name")?.Value;
  const id = instance.InstanceId as string;
  return name ? `${name} (${id})` : id;
}
