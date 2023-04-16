import { CommandName } from "./CommandName";
import packageJson from "./package.json";

test("command names represent the declared values", () => {
  const expectedCommandNames = packageJson.contributes.commands
    .map((c) => c.command)
    .sort();
  const commandNames = Object.values(CommandName).sort();
  expect(commandNames).toEqual(expectedCommandNames);
});
