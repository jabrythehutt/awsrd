import { ConfigStore } from "./ConfigStore";
import packageJson from "./package.json";

export class ProfileStore extends ConfigStore<string> {
  constructor() {
    super(
      Object.keys(packageJson.contributes.configuration.properties).find((k) =>
        k.endsWith("profile")
      ) as string
    );
  }
}
