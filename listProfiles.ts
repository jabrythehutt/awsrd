import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";

/**
 * List the AWS profiles from the CLI AWS config and credential files
 *
 * @returns An array of the AWS credential profiles
 */
export async function listProfiles(): Promise<string[]> {
  const configs = await loadSharedConfigFiles();
  return Object.keys({
    ...configs.configFile,
    ...configs.credentialsFile,
  });
}
