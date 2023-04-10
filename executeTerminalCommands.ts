import { Terminal, TerminalExitStatus } from "vscode";
import { window } from "vscode";

export function executeTerminalCommands(
  terminal: Terminal,
  commands: string[]
): Promise<TerminalExitStatus | undefined> {
  for (const command of [...commands, "exit"]) {
    terminal.sendText(command);
  }
  return new Promise((resolve) => {
    const token = window.onDidCloseTerminal((closedTerminal) => {
      if (closedTerminal === terminal) {
        token.dispose();
        resolve(closedTerminal.exitStatus);
      }
    });
  });
}
