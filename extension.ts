import { ExtensionContext, commands, window} from "vscode";
//import packageJson from "./package.json";
// import { Ec2InstanceTreeProvider } from "./Ec2InstanceTreeProvider";
// import { EC2Client } from "@aws-sdk/client-ec2";


export function activate(context: ExtensionContext) {
    //const explorerViews = packageJson.contributes.views["ec2-explorer"];
    //const explorerView = explorerViews[0];
    // const ec2 = new EC2Client({});
    // const treeView = window.createTreeView(explorerView.id, {treeDataProvider: new Ec2InstanceTreeProvider(ec2)});
    // context.subscriptions.push(treeView);
    console.log(context)
}
