import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitClient = {
  assertBranch(name: string): Promise<void>;
  stage(paths: string[]): Promise<void>;
  hasStagedChanges(): Promise<boolean>;
  commit(message: string): Promise<void>;
  push(remote: string, branch: string): Promise<void>;
};

export class ShellGitClient implements GitClient {
  constructor(
    private readonly cwd: string,
    private readonly authorName: string,
    private readonly authorEmail: string,
  ) {}

  async assertBranch(name: string) {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--abbrev-ref", "HEAD"],
      { cwd: this.cwd },
    );

    if (stdout.trim() !== name) {
      throw new Error(`Refusing to sync from branch ${stdout.trim()}; expected ${name}.`);
    }
  }

  async stage(paths: string[]) {
    await execFileAsync("git", ["add", "--", ...paths], { cwd: this.cwd });
  }

  async hasStagedChanges() {
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--cached", "--name-only"],
      { cwd: this.cwd },
    );

    return stdout.trim().length > 0;
  }

  async commit(message: string) {
    await execFileAsync(
      "git",
      [
        "-c",
        `user.name=${this.authorName}`,
        "-c",
        `user.email=${this.authorEmail}`,
        "commit",
        "-m",
        message,
      ],
      { cwd: this.cwd },
    );
  }

  async push(remote: string, branch: string) {
    await execFileAsync("git", ["push", remote, branch], { cwd: this.cwd });
  }
}

export class NoopGitClient implements GitClient {
  async assertBranch() {}

  async stage() {}

  async hasStagedChanges() {
    return true;
  }

  async commit() {}

  async push() {}
}
