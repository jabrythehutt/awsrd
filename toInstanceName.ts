import { Instance } from "@aws-sdk/client-ec2";

export function toInstanceName(instance: Instance): string | undefined {
  return instance.Tags?.find((t) => t.Key === "Name")?.Value;
}
