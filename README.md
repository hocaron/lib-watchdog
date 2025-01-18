# Lib Watchdog 📦🐶

## Overview

Lib Watchdog is a GitHub Action that automatically updates library versions across multiple repositories. It helps maintain consistent library versions by:

- Searching repositories based on specified criteria
- Detecting outdated library versions
- Creating pull requests with version updates
- Sending Slack notifications about updates

## Features

- 🔍 Smart repository search
- 🤖 Automatic version detection and update
- 🚀 Pull request generation
- 📣 Slack notification support

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token with repository access | ✅ | - |
| `scope-type` | Scope type (organization or user) | ❌ | `organization` |
| `scope-name` | Organization name or username | ✅ | - |
| `new-version` | New version to update to | ✅ | - |
| `file-pattern` | File pattern to search (e.g., build.gradle, pom.xml) | ❌ | `build.gradle` |
| `slack-webhook-url` | Slack webhook URL for notifications | ❌ | - |

## Outputs

| Output | Description |
|--------|-------------|
| `updated-repos` | List of repositories updated |
| `pr-urls` | URLs of created pull requests |

## Example Workflow

```yaml
name: Library Version Update

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'New version'
        required: true

jobs:
  update-libraries:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hocaron/lib-watchdog@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          scope-type: org
          scope-name: your-organization
          library-name: example-library
          new-version: ${{ github.event.inputs.version }}
          slack-webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

## How It Works

1. Search repositories containing the specified library
2. Check current library versions
3. Compare versions and identify repos needing updates
4. Create a new branch for each repository
5. Update library version in identified files
6. Generate a pull request for each update
7. Send Slack notification with update summary

## Requirements

- GitHub token with repository access
- Optional Slack webhook for notifications

## Notes

- Supports semantic versioning comparison
- Handles multiple repositories in a single run
- Skips repositories with already up-to-date versions

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[Add your license information here]