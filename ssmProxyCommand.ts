import yargs from "yargs";
import { DescribeInstanceInformationCommand, StartCo, SSMClient } from "@aws-sdk/client-ssm";

async function run() {
    const args = await yargs
    .option("instanceId", { type: "string", demand: true })
    .option("port", { type: "number", demand: true })
    .option("publicKeyPath", { type: "string", demand: true })
    .option("user", { type: "string", demand: true })
    .parse(process.argv);

    const publicKeyPath = args.publicKeyPath;
    const ssmClient = new SSMClient({});
    const response = await ssmClient.send(new DescribeInstanceInformationCommand({
        Filters: [
            {
                Key: "InstanceIds",
                Values: [
                    args.instanceId
                ]
            }
        ]
    }));


    const instanceInfo = response.InstanceInformationList?.shift();
    if (!instanceInfo) {
        throw new Error(`Instance information not found for instance with ID: ${args.instanceId}`);
    }

    if (instanceInfo.PingStatus !== "Online") {
        // await ssmClient.send(new StartInstancesCommand({}));
    }

}

run();
