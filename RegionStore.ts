import { ConfigStore } from "./ConfigStore";
import packageJson from "./package.json";

export class RegionStore extends ConfigStore<string> {
  constructor() {
    super(
      Object.keys(packageJson.contributes.configuration.properties).find((k) =>
        k.endsWith("region")
      ) as string
    );
  }
}
