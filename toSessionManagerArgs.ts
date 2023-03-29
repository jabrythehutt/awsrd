import {
  StartSessionCommandInput,
  StartSessionResponse,
} from "@aws-sdk/client-ssm";

/**
 * Construct the session manager args based on https://github.com/aws/session-manager-plugin/blob/7b544e9f381d809fd7117747d4b78b244addcf1e/src/sessionmanagerplugin/session/session.go#L123
 */
export function toSessionManagerArgs(params: {
  region: string;
  profile: string;
  request: StartSessionCommandInput;
  response: StartSessionResponse;
}) {
  return [
    JSON.stringify(params.response),
    params.region,
    "StartSession",
    params.profile,
    JSON.stringify(params.request),
    `https://ssm.${params.region}.amazonaws.com`,
  ];
}
