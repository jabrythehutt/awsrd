import yargs from "yargs"
import { writeFile } from "node:fs/promises";
import { hideBin } from "yargs/helpers";
import { createKeyPair } from "./createKeyPair";
import { resolve } from "node:path"

async function run() {
    const args = await yargs(hideBin(process.argv))
        .option("privateKeyPath", { type: "string", demand: true })
        .option("publicKeyPath", { type: "string", demand: true })
        .option("configPath", { type: "string", demand: true })
        .option("proxyScriptPath", { type: "string", demand: true })
        .parse(process.argv);

    const keyPair = createKeyPair();
    await writeFile(args.privateKeyPath, keyPair.privateKey);
    await writeFile(args.publicKeyPath, keyPair.publicKey);
    const config = `
Host i-* mi-*
    IdentityFile ${resolve(args.privateKeyPath)}
    ProxyCommand node ${resolve(args.proxyScriptPath)} --instanceId=%h --user=%r --port=%p --publicKeyPath=${resolve(args.publicKeyPath)}
    StrictHostKeyChecking no
`
    await writeFile(args.configPath, config);

}

run();
