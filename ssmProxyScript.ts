import yargs from "yargs";
import { SSMClient, SendCommandCommand, StartSessionCommand } from "@aws-sdk/client-ssm";
import { EC2Client } from "@aws-sdk/client-ec2";
import { InstanceStateResolver } from "./InstanceStateResolver";
import { InstanceStarter } from "./InstanceStarter";
import { readFile } from "fs/promises";
import { hideBin } from "yargs/helpers";

async function run() {
    const args = await yargs(hideBin(process.argv))
        .option("instanceId", { type: "string", demand: true })
        .option("port", { type: "number", demand: true })
        .option("publicKeyPath", { type: "string", demand: true })
        .option("user", { type: "string", demand: true })
        .option("pollPeriod", { type: "number", default: 1000 })
        .parse();
    
    const ec2Client = new EC2Client({});
    const stateResolver = new InstanceStateResolver(ec2Client);
    const starter = new InstanceStarter(ec2Client, stateResolver);
    await starter.start(args.instanceId, args.pollPeriod);
    const publicKey = await readFile(args.publicKeyPath)
    const userSshDir = `~${args.user}/.ssh`

    const ssmClient = new SSMClient({});
    await ssmClient.send(new SendCommandCommand({
        InstanceIds: [
            args.instanceId
        ],
        DocumentName: "AWS-RunShellScript",
        Comment: `Add the user's SSH key to the instance: ${args.instanceId}`,
        Parameters: {
            Commands: [
                `mkdir -p ${userSshDir} || exit 1`,
                `echo "${publicKey}" > ${userSshDir}/authorized_keys`,
            ]
        }
    }))
    await ssmClient.send(new StartSessionCommand({
        DocumentName: "AWS-StartSSHSession",
        Target: args.instanceId,
        Parameters: {
            portNumber: [`${args.port}`]
        }
    }))
}

run();
