# KARMEN LOOP

We build Koder, an AI assistant for coding and everyday work on your computer. You choose the model, open a project, and review changes before they are saved.

[Website](https://karmenloop.com/en/index.html) · [Get started](https://karmenloop.com/en/tutorial.html) · [Downloads](https://karmenloop.com/en/download.html) · [Email](mailto:info@karmenloop.com)

## Koder

Use the desktop app for an editor and workbench, the CLI for terminal tasks and scripts, or the TUI for a full-screen terminal session. The SDK lets you use Koder from your own code.

Koder does not include a model. Connect a provider you already use, or a local model. Your workspace stays on your computer; requests to a hosted model go to the provider you choose. File changes wait for your approval, and commands ask first by default.

The desktop app is in beta. Current builds and availability are listed on the [download page](https://karmenloop.com/en/download.html).

| Repository | Use it for |
| --- | --- |
| [koder-cli](https://github.com/KarmenLoop/koder-cli) | Terminal tasks, scripts, and CI |
| [koder-sdk](https://github.com/KarmenLoop/koder-sdk) | TypeScript, JavaScript, and Python integrations |
| [karmenbot](https://github.com/KarmenLoop/karmenbot) | A full-screen terminal session with chat app connections |
| [koder-open-cli](https://github.com/KarmenLoop/koder-open-cli) | Configuring AI roles and working rules in the macOS preview |

## Memory and agent tools

Some work needs more context than a single conversation. We also maintain:

- [Koder Personal Knowledge](https://github.com/KarmenLoop/koder-personal-knowledge), a local library for notes and reference files.
- [User Behavior Personalization](https://github.com/KarmenLoop/user-behavior-personalization), a skill for remembering preferences you can inspect and correct.
- [Koder Shared Memory](https://github.com/KarmenLoop/koder-shared-memory), a skill for context across linked chats and devices. The host supplies storage, identity checks, and sync.
- [Bot Orchestrator](https://github.com/KarmenLoop/bot-orchestrator), a task board and skill for planning work, reviewing results, and resuming interrupted tasks.

Each repository explains its requirements and has its own license. The KARMEN LOOP kernel is proprietary and is distributed separately from the public source.

## KARMEN BOT

KARMEN BOT is a personal assistant we are still developing. The mobile app is not available yet. The bot inside Koder currently supports chat; it does not run tools or change files. Updates are on the [product page](https://karmenloop.com/en/karmen-bot.html).

For questions about Koder or an integration, write to [info@karmenloop.com](mailto:info@karmenloop.com). For a bug in one of these projects, open an issue in that repository.
