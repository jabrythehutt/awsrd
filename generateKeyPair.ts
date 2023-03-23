import yargs from "yargs"
import { createKeyPair } from "./createKeyPair";
import { writeFile } from "node:fs/promises";
import { hideBin } from "yargs/helpers";

async function run() {
    const args = await yargs(hideBin(process.argv))
    .option("privateKeyDestination", { type: "string", demand: true })
    .option("publicKeyExtension", {type: "string", default: "pub"})
    .parse(process.argv);

    const keyPair = createKeyPair();
    const publicKeyDestination = args.privateKeyDestination + "." + args.publicKeyExtension
    await writeFile(args.privateKeyDestination, keyPair.privateKey);
    await writeFile(publicKeyDestination, keyPair.publicKey);
}

run();
