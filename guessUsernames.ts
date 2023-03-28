import { InstanceInformation } from "@aws-sdk/client-ssm";
import { defaultUsernames } from "./defaultUsernames";
import { PlatformName } from "./PlatformName";

export function guessUsernames(intanceInfo: InstanceInformation): string[] {
    const platformName = intanceInfo.PlatformName as PlatformName
    console.log("Guessing usernames for", platformName)
    const usernames = defaultUsernames[platformName] || []
    return [...usernames]
}
