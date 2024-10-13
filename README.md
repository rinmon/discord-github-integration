# Discord BotとGitHubの連携構築＆運用手順書

## 目的

この手順書では、Discord BotとGitHubを連携させ、Discord上でのスレッド作成やメッセージ投稿を自動的にGitHubのIssueに反映させる一方通行のシステムを構築する方法を詳細に説明します。これにより、DiscordでのコミュニケーションをGitHub上で一元管理し、プロジェクト管理の効率化を図ることが目的です。

## 主な機能

1. **スレッド作成とIssue連携**:
   - Discordのチャンネルでスレッドが作成されると、対応するGitHubのIssueが自動的に生成されます。

2. **メッセージの同期**:
   - Discordのスレッドやチャンネルに投稿されたメッセージが、対応するGitHub Issueのコメントとして同期されます。

3. **タグとラベルの連携**:
   - Discordのスレッドに適用されたタグが、GitHubのIssueラベルとして反映されます。

4. **ステータス管理**:
   - Discordスレッドのアーカイブやアンアーカイブ状態が、GitHub Issueの状態と同期されます。

---

## 構築手順

### 1. Discord Botの作成

#### 1.1 Discord Developer Portalへのアクセス

- [Discord Developer Portal](https://discord.com/developers/applications) にアクセスし、Discordアカウントでログインします。

#### 1.2 新しいアプリケーションの作成

1. 「**New Application**」ボタンをクリックします。
2. アプリケーション名を入力し（例: `Discord GitHub Integration Bot`）、**Create**をクリックします。

#### 1.3 Botの作成

1. 左側のメニューから「**Bot**」を選択します。
2. 「**Add Bot**」をクリックし、確認ダイアログで「**Yes, do it!**」をクリックします。

#### 1.4 Botトークンの取得

- 「**TOKEN**」セクションの「**Copy**」ボタンをクリックして、Botのトークンをコピーします。このトークンは後で使用するので安全な場所に保管してください。

#### 1.5 Botの権限設定

1. 「**Privileged Gateway Intents**」で、「**MESSAGE CONTENT INTENT**」を有効にします。これにより、Botがメッセージ内容にアクセスできます。
2. 「**Save Changes**」をクリックして設定を保存します。

#### 1.6 Botのサーバーへの招待

1. 左側のメニューから「**OAuth2**」 > 「**URL Generator**」を選択します。
2. 「**SCOPES**」で「**bot**」を選択します。
3. 「**BOT PERMISSIONS**」で以下の権限を選択します：
   - **Read Messages/View Channels**
   - **Send Messages**
   - **Manage Messages**
   - **Read Message History**
4. 下部に生成されたURLをコピーし、ブラウザでアクセスしてBotを自分のDiscordサーバーに追加します。

---

### 2. GitHub Personal Access Tokenの取得

#### 2.1 Personal Access Tokenの作成

1. GitHubにログインし、右上のプロフィールアイコンから「**Settings**」を選択します。
2. 左側のメニューから「**Developer settings**」を選択します。
3. 「**Personal access tokens**」 > 「**Fine-grained tokens**」を選択します。
4. 「**Generate new token**」をクリックします。

#### 2.2 トークンの設定

1. トークン名を入力します（例: `Discord Bot Integration Token`）。
2. 有効期限を設定します（必要に応じて選択）。
3. 「**Resource owner**」で、自分のユーザー名を選択します。
4. 「**Repository access**」で「**Only select repositories**」を選択し、使用するリポジトリ（例: `discord-github-integration`）を選択します。
5. 「**Permissions**」で以下を設定します：
   - **Repository permissions**:
     - **Issues**: Read and write
     - **Metadata**: Read-only
6. 「**Generate token**」をクリックし、生成されたトークンをコピーします。このトークンは一度しか表示されないため、安全な場所に保管してください。

---

### 3. リポジトリの作成

1. GitHubで新しいリポジトリを作成します（例: `discord-github-integration`）。
2. リポジトリを公開または非公開に設定します（必要に応じて選択）。

---

### 4. サーバー環境の構築

#### 4.1 サーバーの準備

- VPSプロバイダ（例: Vultr、DigitalOcean、AWSなど）でサーバーを作成し、Ubuntu 20.04 LTSなどの安定したLinuxディストリビューションをインストールします。

#### 4.2 SSH接続

- サーバーにSSHで接続します。

```bash
ssh root@<your_server_ip>
```

---

### 5. 必要なソフトウェアのインストール

#### 5.1 Node.jsとnpmのインストール

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

#### 5.2 Gitのインストール

```bash
apt install -y git
```

#### 5.3 pm2のインストール

```bash
npm install -g pm2
```

---

### 6. プロジェクトのセットアップ

#### 6.1 リポジトリのクローン

```bash
git clone https://github.com/rinmon/discord-github-integration.git
cd discord-github-integration
```

#### 6.2 依存パッケージのインストール

```bash
npm install
```

---

### 7. 環境変数の設定

#### 7.1 `.env`ファイルの作成

- プロジェクトのルートディレクトリに`.env`ファイルを作成し、以下の内容を記述します。

```env
DISCORD_BOT_TOKEN=あなたのDiscord Botトークン
GITHUB_ACCESS_TOKEN=あなたのGitHub Personal Access Token
GITHUB_USERNAME=あなたのGitHubユーザー名
GITHUB_REPOSITORY=discord-github-integration（またはあなたのリポジトリ名）
```

---

### 8. Botコードの更新

#### 8.1 必要なパッケージのインストール

```bash
npm install discord.js @octokit/rest dotenv fs path
```

#### 8.2 `index.js`の更新

- `index.js`を以下の内容に更新します。

```javascript
import pkg from 'discord.js';
const { Client, GatewayIntentBits } = pkg;
import { Octokit } from "@octokit/rest";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

// `__dirname` の代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Octokitのインスタンスを作成（GitHub APIとの接続）
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

// Discordクライアントの作成
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,             // サーバー情報の取得
    GatewayIntentBits.GuildMessages,      // メッセージの取得
    GatewayIntentBits.MessageContent,     // メッセージ内容の取得
    GatewayIntentBits.GuildMessageReactions, // メッセージへのリアクション
    GatewayIntentBits.GuildMembers        // メンバー情報の取得
  ]
});

// `channel_issue_mapping.json` ファイルの読み込み
const mappingFilePath = path.join(__dirname, 'channel_issue_mapping.json');
let channelIssueMapping = {};

if (fs.existsSync(mappingFilePath)) {
  channelIssueMapping = JSON.parse(fs.readFileSync(mappingFilePath));
} else {
  console.error('チャンネルとIssue番号のマッピングファイルが見つかりませんでした');
}

// 保存するデータファイルのパス
const dataFilePath = path.join(__dirname, 'discord_data.json');

// データ保存用関数
function saveData(type, data) {
  let storedData = {};
  if (fs.existsSync(dataFilePath)) {
    storedData = JSON.parse(fs.readFileSync(dataFilePath));
  }
  if (!storedData[type]) {
    storedData[type] = [];
  }
  storedData[type].push(data);
  fs.writeFileSync(dataFilePath, JSON.stringify(storedData, null, 2));
}

// Botがオンラインになったときの処理
client.once('ready', () => {
  console.log('Botがオンラインです！');
});

// メッセージが投稿された際の処理
client.on('messageCreate', async (message) => {
  if (!message.author.bot) {
    try {
      let issueNumber = channelIssueMapping[message.channel.id];
      
      // Issueが存在しない場合、新しいIssueを作成
      if (!issueNumber) {
        const { data: issue } = await octokit.rest.issues.create({
          owner: process.env.GITHUB_USERNAME,
          repo: process.env.GITHUB_REPOSITORY,
          title: `新しいメッセージ: ${message.channel.name}`,
          body: `Discordで新しいメッセージが投稿されました。\n\nメッセージURL: ${message.url}`,
        });

        issueNumber = issue.number;
        channelIssueMapping[message.channel.id] = issueNumber;

        // channel_issue_mapping.jsonにIssue番号を保存
        fs.writeFileSync(mappingFilePath, JSON.stringify(channelIssueMapping, null, 2));

        // GitHub Issueのリンクをメッセージに送信
        await message.channel.send(`GitHub Issueが作成されました: ${issue.html_url}`);
      }

      // 既存または新しいIssueにコメントを追加
      await octokit.rest.issues.createComment({
        owner: process.env.GITHUB_USERNAME,
        repo: process.env.GITHUB_REPOSITORY,
        issue_number: issueNumber,
        body: `${message.author.username}がメッセージを投稿しました: \n\n${message.content}`,
      });

      // メッセージ情報の保存
      saveData('messages', {
        messageId: message.id,
        content: message.content,
        author: message.author.username,
        issueNumber: issueNumber,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('メッセージのGitHub保存中にエラーが発生しました:', error);
    }
  }
});

// Botのログイン処理
client.login(process.env.DISCORD_BOT_TOKEN);
```

#### 8.3 `package.json`の更新

- `package.json`を以下のように更新します。

```json
{
  "name": "discord-github-integration",
  "version": "1.1.0",
  "description": "Discord and GitHub integration bot",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "author": "rinmon",
  "license": "ISC",
  "dependencies": {
    "@octokit/rest": "^21.0.2",
    "discord.js": "^14.11.0",
    "dotenv": "^16.0.3",
    "fs": "^0.0.1-security",
    "path": "^0.12.7"
  }
}
```

---

### 9. Botの起動と確認

#### 9.1 Botの起動

```bash
pm2 start index.js --name CHOTTONEWS-Police
```

#### 9.2 pm2の設定保存

```bash
pm2 save
pm2 startup
```

#### 9.3 Botの動作確認

- Discordサーバーで任意のチャンネルにメッセージを投稿し、BotがGitHubにIssueを作成し、コメントを追加するか確認します。

---

### 10. GitHub Personal Access Tokenの権限設定（重要）

- もしエラーが発生した場合、特に「**Resource not accessible by personal access token**」というエラーが出た場合は、GitHubのPersonal Access Tokenの権限が不足している可能性があります。

#### 10.1 トークンの権限確認

1. GitHubの設定で、使用しているトークンの権限を確認します。
2. **Issues**の権限が「**Read and write**」になっていることを確認してください。

#### 10.2 トークンの再生成

- 必要に応じて、新しいトークンを生成し、`.env`ファイルの`GITHUB_ACCESS_TOKEN`を更新してください。

---

### 11. 運用手順と注意事項

#### 11.1 Botの再起動

- コードを修正した場合や環境変数を更新した場合は、Botを再起動します。

```bash
pm2 restart CHOTTONEWS-Police
```

#### 11.2 ログの確認

- Botの動作ログを確認するには以下のコマンドを使用します。

```bash
pm2 logs CHOTTONEWS-Police
```

#### 11.3 ログのフラッシュ

- ログが大量に蓄積した場合は、以下のコマンドでログをクリアできます。

```bash
pm2 flush CHOTTONEWS-Police
```

---

## まとめ

以上の手順で、Discord BotとGitHubの連携環境を構築し、運用することができます。これにより、Discord上でのコミュニケーションをGitHubのIssueとして管理でき、プロジェクト管理の効率化に役立ちます。

**注意**: トークンや機密情報は絶対に公開しないようにし、安全に管理してください。

---
