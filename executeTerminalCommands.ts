import { Terminal, TerminalExitStatus, window } from "vscode";

export function executeTerminalCommands(
  terminal: Terminal,
  commands: string[]
): Promise<TerminalExitStatus | undefined> {
  const commandsWithExit = [...commands];
  const lastCommand = commandsWithExit.pop();
  for (const command of [...commandsWithExit, `${lastCommand} && exit`]) {
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
