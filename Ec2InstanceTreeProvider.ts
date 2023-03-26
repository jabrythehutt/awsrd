import { ProviderResult, TreeDataProvider, TreeItem } from "vscode";
import { Ec2Instance } from "./Ec2Instance"
import { EC2Client, paginateDescribeInstances } from "@aws-sdk/client-ec2";

export class Ec2InstanceTreeProvider implements TreeDataProvider<Ec2Instance> {

    constructor(private ec2: EC2Client) {
    }

    // onDidChangeTreeData?: Event<Ec2Instance | null | undefined> | undefined;

    getTreeItem(element: Ec2Instance): TreeItem | Thenable<TreeItem> {
        return {
            
        };
    }

    async getRootChildren(): Promise<Ec2Instance[] | null | undefined> {
        const instances: Ec2Instance[] = [];
        for await (const response of paginateDescribeInstances({client: this.ec2}, {})) {
            for (const reservation of response.Reservations || []) {
                const values = (reservation.Instances || []).map(i => ({
                    id: i.InstanceId as string
                }))
                instances.push(...values);
            }
        }
        return instances;
    }

    getChildren(element: Ec2Instance): ProviderResult<Ec2Instance[]> {
        return element ? [] : this.getRootChildren();
    }


    getParent?(element: Ec2Instance): ProviderResult<Ec2Instance> {
        return undefined;
    }

}