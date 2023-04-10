import { Terminal } from "vscode";
import { window } from "vscode";

export function executeTerminalCommands(terminal: Terminal, commands: string[]): Promise<void> {
    for (const command of [...commands, "exit"]) {
        terminal.sendText(command)
    }
    return new Promise(resolve => {
        window.onDidCloseTerminal(closedTerminal => {
            if (closedTerminal === terminal) {
                resolve();
            }
        });
    });
}
