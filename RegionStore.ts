import { Store } from "./Store";
import packageJson from "./package.json";

export class RegionStore extends Store<string> {
  constructor() {
    super(
      Object.keys(packageJson.contributes.configuration.properties).find((k) =>
        k.endsWith("region")
      ) as string
    );
  }
}
