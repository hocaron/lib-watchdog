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
                        text: `🚀 ${libraryName} ${newVersion} 버전 출시 알림`,
                        emoji: true
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*${libraryName}* 라이브러리의 새로운 버전인 \`${newVersion}\`이 출시되었어요!`
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `버전에 맞춰 필요한 업데이트 작업을 자동으로 준비해두었어요. 아래 링크에서 확인해 주시면 돼요.`
                    }
                },
                {
                    type: "divider"
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*업데이트가 필요한 서비스*\n${formattedUpdates}`
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: "🔗 서비스 이름을 클릭하면 준비된 작업(PR)을 바로 확인하실 수 있어요.\n🙌 작업 내용을 확인하시고 머지해 주시면 정말 감사하겠습니다!"
                        }
                    ]
                }
            ]
        });
    }
}

module.exports = SlackService;