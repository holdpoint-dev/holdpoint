import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

/**
 * Ask a yes/no question on the terminal and resolve to true/false.
 *
 * Defaults to true on empty input (`Y/n` style). Returns `defaultYes` and
 * skips the prompt entirely when stdout isn't a TTY (CI, piped invocation,
 * agent hook) so we never block on input nobody can provide. Callers that
 * need different non-TTY behaviour should check `stdout.isTTY` first.
 */
export async function promptYesNo(question: string, defaultYes = true): Promise<boolean> {
  if (!stdout.isTTY || !stdin.isTTY) {
    return defaultYes;
  }
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const suffix = defaultYes ? " [Y/n] " : " [y/N] ";
    const answer = (await rl.question(question + suffix)).trim().toLowerCase();
    if (answer === "") return defaultYes;
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}
