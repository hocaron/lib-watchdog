const axios = require('axios');

class SlackService {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    async sendNotification(libraryName, newVersion, repoInfos, prUrls) {
        if (!this.webhookUrl) return;

        // 링크 형식으로 변환: • repo_name (1.0.0 → 2.0.0) | PR #123
        const formattedUpdates = repoInfos.map((info, index) => {
            return `• <${prUrls[index]}|${info}>`;
        }).join('\n');

        await axios.post(this.webhookUrl, {
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🚀 라이브러리 버전 업데이트 알림",
                        emoji: true
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*${libraryName}* \`${newVersion}\` 버전으로 업데이트하는 PR이 생성되었습니다`
                    }
                },
                {
                    type: "divider"
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "*업데이트가 필요한 레포지토리*\n" + formattedUpdates
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: "💡 레포지토리 이름을 클릭하면 업데이트 PR로 이동합니다.\n" +
                                "🙏 검토 후 머지 부탁드립니다."
                        }
                    ]
                }
            ]
        });
    }
}

module.exports = SlackService;