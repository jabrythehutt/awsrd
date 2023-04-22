import { ConfigurationKey } from "./ConfigurationKey";
import packageJson from "./package.json";

test("configuration keys represent the declared values", () => {
  const expectedKeys = Object.keys(packageJson.contributes.configuration.properties)
    .sort();
  const keys = Object.values(ConfigurationKey).sort();
  expect(keys).toEqual(expectedKeys);
});
