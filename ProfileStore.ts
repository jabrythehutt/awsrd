import { Store } from "./Store";
import packageJson from "./package.json";

export class ProfileStore extends Store<string> {
    constructor() {
        super(Object.keys(packageJson.contributes.configuration.properties).find(k => k.endsWith("profile")) as string);
    }
}
