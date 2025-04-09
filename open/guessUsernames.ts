import { InstanceInformation } from "@aws-sdk/client-ssm";
import { defaultUsernames, PlatformName } from "../ec2";

export function guessUsernames(intanceInfo: InstanceInformation): string[] {
  const platformName = intanceInfo.PlatformName as PlatformName;
  const usernames = defaultUsernames[platformName] || [];
  return [...usernames];
}
