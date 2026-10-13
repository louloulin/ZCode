# Restore Legacy Sessions Plugin

Lumos official plugin for restoring old ACP-era Lumos session snapshots into the new task index and CLI session DB.

This plugin is bundled as `restore-legacy-sessions@lumos-plugins-official` and is disabled by default. Enable it only when you need to inspect or restore old session data.

## Enable

```sh
lumos plugins enable restore-legacy-sessions
```

Or inside a Lumos session:

```text
/plugins enable restore-legacy-sessions
```

Changes apply to new sessions. After enabling, use:

```text
/restore-legacy-sessions
```

## Data Boundaries

- Default source: `~/.lumos/v2/sessions`
- Task index destination: `~/.lumos/v2/tasks-index.sqlite`
- CLI session DB destination: `~/.lumos/cli/db/db.sqlite`

The restore scripts create timestamped DB backups before writing. Restored ACP-era conversations are persisted as normal `glm` Lumos Agent history and do not write `migration_source`.

## Development

This is a skill-only / command-only plugin. It has no MCP server and no build step.
