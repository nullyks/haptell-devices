# Clone and update Haptell on macOS

Clone the repository once to get a local copy of the project. Later, use
`git pull` in the same folder to bring in updates from GitHub.

## Check that Git is installed

Press **Command+Space**, type **Terminal**, and press **Return**. In Terminal,
run this command.

```bash
git --version
```

If macOS offers to install the Command Line Tools, click **Install** and
follow the prompts. If Git is unavailable and no prompt appears, run
`xcode-select --install`. After installation, run `git --version` again.
See [Apple's Command Line Tools guide](https://developer.apple.com/documentation/xcode/installing-the-command-line-tools)
for details.

## Clone the repository

Run these commands one at a time. They create a `Projects` folder in your
home folder and download the project into `~/Projects/haptell-devices`.

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/nullyks/haptell-devices.git
cd haptell-devices
git status
```

Git should report **On branch main** and a clean working tree. To open the
project folder in Finder, run `open .` from that folder. Continue with
[Arduino and WiFi setup](./start.md#upload-the-matching-sketch).

## Pull updates

Open Terminal and go to the folder you cloned. If you cloned it somewhere
else, use that folder path.

```bash
cd ~/Projects/haptell-devices
git status
```

Check that you are on `main` and that the working tree is clean. Then run
the update command.

```bash
git pull --ff-only
```

**Already up to date.** means you already have the latest version. If there
are new commits, Git lists what was updated. The `--ff-only` option stops
the update if your branch and GitHub's branch have both gained commits.
Keep your WiFi settings in the sketch's local `secrets.h`. Git ignores this
file, so it stays in place when you pull updates.

If Git reports local edits or says it cannot fast-forward, stop and keep
your local work while you resolve the difference. If Git says **not a git
repository**, check that you opened the cloned project folder. A ZIP
download is a snapshot. To use `git pull` later, make a clone in a separate
folder.
