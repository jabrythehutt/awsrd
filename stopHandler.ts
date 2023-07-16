import { EC2Client } from "@aws-sdk/client-ec2";
import { Handler } from "aws-lambda";
import { stopInstance } from "./stopInstance";
import { StopperEnvVar } from "./StopperEnvVar";

const client = new EC2Client({});
const instanceId = process.env[StopperEnvVar.InstanceId];

export const handler: Handler<void, void> = async () => {
  await stopInstance(client, instanceId as string);
};
