const core = require('@actions/core');
const GitHubService = require('./github');
const SlackService = require('./slack');

async function runWithParams({ token, scopeType, scopeName, libraryName, newVersion, filePattern, slackWebhookUrl }) {
    try {
        core.info('🚀 Starting Lib Watchdog...');
        core.info(`📋 Input Configuration:
           - Scope Type: ${scopeType}
           - Scope Name: ${scopeName}
           - Library: ${libraryName}
           - New Version: ${newVersion}
           - File Pattern: ${filePattern}`);

        // Initialize services
        core.info('🔧 Initializing services...');
        const github = new GitHubService(token);
        const slack = new SlackService(slackWebhookUrl);

        // Track updates
        const repoInfos = [];
        const prUrls = [];

        // Search repositories
        core.info('🔍 Searching for repositories...');
        const repos = await github.searchRepositories(scopeType, scopeName, libraryName, filePattern);
        core.info(`Found ${repos.length} repositories to check`);

        const repoGroups = repos.reduce((acc, item) => {
            const repoName = item.repository.name;
            acc[repoName] = acc[repoName] || [];
            acc[repoName].push(item);
            return acc;
        }, {});

        for (const [repoName, files] of Object.entries(repoGroups)) {
            core.info(`📦 Processing repository: ${repoName}`);

            const baseBranch = await github.getDefaultBranch(scopeName, repoName);
            const branchName = `update-${libraryName.replace(/[/:]/g, '-')}-${newVersion}`;
            await github.createBranch(scopeName, repoName, branchName, baseBranch);

            const updates = [];
            let currentVersion = "";

            for (const file of files) {
                const { content, sha } = await github.getFileContent(scopeName, repoName, file.path);
                currentVersion = extractVersion(content, libraryName);

                if (!shouldUpdate(currentVersion, newVersion)) {
                    core.info(`⏭️ File ${file.path} is already up-to-date.`);
                    continue;
                }

                const newContent = updateVersionInFile(content, libraryName, currentVersion, newVersion);
                updates.push({ path: file.path, content: newContent, sha });
            }

            if (updates.length > 0) {
                core.info('🔄 Updating files...');
                const needsUpdate = await github.updateFiles(
                    scopeName,
                    repoName,
                    updates,
                    `chore: Update ${libraryName} to ${newVersion}`,
                    branchName
                );
                if (!needsUpdate) {
                    core.info('Branch exists and file is already updated, skipping...');
                    continue;
                }

                core.info('Creating Pull Request...');
                const pr = await github.createPullRequest(
                    scopeName,
                    repoName,
                    `Update ${libraryName} to ${newVersion}`,
                    createPRBody(libraryName, currentVersion, newVersion),
                    branchName,
                    baseBranch
                );
                core.info(`✅ Successfully created PR: ${pr.html_url}`);

                // Track updates
                repoInfos.push(`${repoName} (${currentVersion} → ${newVersion})`);
                prUrls.push(`${pr.html_url}`);
            }
        }

        // Set outputs
        if (repoInfos.length > 0) {
            core.info('\n📊 Update Summary:');
            core.info(repoInfos.join('\n'));
            core.info('\n🔗 PR URLs:');
            core.info(prUrls.join('\n'));

            core.setOutput('updated-repos', repoInfos.join('\n'));
            core.setOutput('pr-urls', prUrls.join('\n'));

            // Send notification
            core.info('\n📨 Sending Slack notification...');
            await slack.sendNotification(libraryName, newVersion, repoInfos, prUrls);
            core.info('✅ Slack notification sent');
        } else {
            core.info('\n✨ No updates were needed');
        }

    } catch (error) {
        core.error('❌ Action failed');
        core.error(error);
        core.setFailed(error.message);
    }
}

async function run() {
    const token = core.getInput('github-token', { required: true });
    const scopeType = core.getInput('scope-type', { required: true });
    const scopeName = core.getInput('scope-name', { required: true });
    const libraryName = core.getInput('library-name', { required: true });
    const newVersion = core.getInput('new-version', { required: true });
    const filePattern = core.getInput('file-pattern');
    const slackWebhookUrl = core.getInput('slack-webhook-url');

    await runWithParams({
        token,
        scopeType,
        scopeName,
        libraryName,
        newVersion,
        filePattern,
        slackWebhookUrl,
    });
}

// Helper functions with logging
function extractVersion(content, libraryName) {
    core.debug('Extracting version from content...');
    const match = content.match(new RegExp(`${libraryName}:([0-9.]+)`));
    const version = match ? match[1] : null;
    core.debug(`Extracted version: ${version}`);
    return version;
}

function shouldUpdate(currentVersion, newVersion) {
    core.debug(`Comparing versions - Current: ${currentVersion}, New: ${newVersion}`);
    if (!currentVersion || currentVersion === newVersion) return false;
    return currentVersion.localeCompare(newVersion, undefined, {numeric: true}) < 0;
}

function updateVersionInFile(content, libraryName, currentVersion, newVersion) {
    core.debug(`Updating content from ${currentVersion} to ${newVersion}`);
    return content.replace(
        new RegExp(`${libraryName}:${currentVersion}`, 'g'),
        `${libraryName}:${newVersion}`
    );
}

function createPRBody(libraryName, currentVersion, newVersion) {
    core.debug('Creating PR body...');
    return [
        '🤖 Library Version Update',
        '',
        '## Changes',
        `- Library: \`${libraryName}\``,
        `- Current version: \`${currentVersion}\``,
        `- New version: \`${newVersion}\``,
        '',
        '자동으로 생성된 라이브러리 업데이트 PR입니다.',
        '변경 사항을 검토하신 후 승인해주세요.'
    ].join('\n');
}

run();

module.exports = { run, runWithParams };
