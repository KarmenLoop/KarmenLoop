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

## Small local tools

These skill packages include Python helpers you can run on your own data. They use the standard library and accept JSON from a file or standard input. Each README has an example, installation steps, and tests.

| Project | Use it for |
| --- | --- |
| [api-diagnostics](https://github.com/KarmenLoop/skill-api-diagnostics) | Classify API failures and decide whether a retry is appropriate |
| [bug-repro](https://github.com/KarmenLoop/skill-bug-repro) | Keep reproduction steps and results together |
| [calendar-slots](https://github.com/KarmenLoop/skill-calendar-slots) | Find meeting slots from supplied busy intervals |
| [daily-brief](https://github.com/KarmenLoop/skill-daily-brief) | Fit ready tasks into a daily time budget |
| [document-diff](https://github.com/KarmenLoop/skill-document-diff) | Compare document text, numbers, and line endings |
| [file-manifest](https://github.com/KarmenLoop/skill-file-manifest) | Hash selected local files and find duplicate contents |
| [follow-up-tracker](https://github.com/KarmenLoop/skill-follow-up-tracker) | Track due follow-ups and stop conditions |
| [inbox-triage](https://github.com/KarmenLoop/skill-inbox-triage) | Sort message exports into reply and review queues |
| [meeting-actions](https://github.com/KarmenLoop/skill-meeting-actions) | Check action items against transcript evidence |
| [memory-ledger](https://github.com/KarmenLoop/skill-memory-ledger) | Reconcile sourced facts, corrections, and expiry |
| [patch-risk-review](https://github.com/KarmenLoop/skill-patch-risk-review) | Summarize a Git diff and identify review areas |
| [project-plan](https://github.com/KarmenLoop/skill-project-plan) | Order dependencies and estimate the critical path |
| [task-checkpoint](https://github.com/KarmenLoop/skill-task-checkpoint) | Resume task records while preserving unknown outcomes |
| [test-failure-triage](https://github.com/KarmenLoop/skill-test-failure-triage) | Compare JUnit reports for repeated and mixed outcomes |

The helpers process the data you supply. They do not connect accounts, send messages, or book meetings.

## KARMEN BOT

KARMEN BOT is a personal assistant we are still developing. The mobile app is not available yet. The bot inside Koder currently supports chat; it does not run tools or change files. Updates are on the [product page](https://karmenloop.com/en/karmen-bot.html).

For questions about Koder or an integration, write to [info@karmenloop.com](mailto:info@karmenloop.com). For a bug in one of these projects, open an issue in that repository.
