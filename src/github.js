const core = require('@actions/core');
const {Octokit} = require('@octokit/rest');

class GitHubService {
    constructor(token) {
        this.octokit = new Octokit({auth: token});
    }

    async searchRepositories(scopeType, scopeName, libraryName, filePattern) {
        // org:orgname 또는 user:username 형식으로 검색
        const scope = `${scopeType}:${scopeName}`;
        const query = `${scope} filename:${filePattern} path:**/${filePattern} "${libraryName}"`;
        const result = await this.octokit.rest.search.code({q: query});
        return result.data.items;
    }

    async getDefaultBranch(owner, repo) {
        const response = await this.octokit.rest.repos.get({
            owner,
            repo,
        });
        return response.data.default_branch;
    }

    async getFileContent(owner, repo, path) {
        const response = await this.octokit.rest.repos.getContent({
            owner: owner,
            repo,
            path,
        });
        return {
            content: Buffer.from(response.data.content, 'base64').toString(),
            sha: response.data.sha
        };
    }

    async createBranch(owner, repo, branchName, baseBranch) {
        try {
            const baseRef = await this.octokit.rest.git.getRef({
                owner,
                repo,
                ref: `heads/${baseBranch}`,
            });

            try {
                const existingBranch = await this.octokit.rest.git.getRef({
                    owner,
                    repo,
                    ref: `heads/${branchName}`
                });
                core.info(`Branch ${branchName} already exists, checking if update is needed...`);
                return true; // 브랜치가 존재함을 알림
            } catch (error) {
                if (error.status !== 404) {
                    throw error;
                }

                await this.octokit.rest.git.createRef({
                    owner,
                    repo,
                    ref: `refs/heads/${branchName}`,
                    sha: baseRef.data.object.sha,
                });
                core.info(`Successfully created branch: ${branchName}`);
                return false; // 새로 브랜치를 만들었음을 알림
            }
        } catch (error) {
            core.error(`Failed to create branch ${branchName}: ${error.message}`);
            throw error;
        }
    }

    async updateFile(owner, repo, path, content, message, branch) {
        try {
            // 현재 파일의 내용 가져오기
            const {data: currentFile} = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref: branch
            });

            // 현재 파일의 내용을 디코드
            const currentContent = Buffer.from(currentFile.content, 'base64').toString();

            // 내용이 같으면 업데이트 스킵
            if (currentContent === content) {
                core.info(`File ${path} in ${owner}/${repo} is already up to date, skipping...`);
                return false;
            }

            // 내용이 다르면 업데이트
            await this.octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message,
                content: Buffer.from(content).toString('base64'),
                sha: currentFile.sha,
                branch,
            });

            core.info(`Successfully updated file ${path} in ${owner}/${repo}`);
            return true;
        } catch (error) {
            core.error(`Failed to update file: ${error.message}`);
            throw error;
        }
    }

    async createPullRequest(owner, repo, title, body, head, baseBranch) {
        const response = await this.octokit.rest.pulls.create({
            owner: owner,
            repo,
            title,
            body,
            head,
            base: baseBranch,
        });
        return response.data;
    }
}

module.exports = GitHubService;