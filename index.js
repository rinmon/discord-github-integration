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
          title: `新しいメッセージ: ${message.channel.name}`, // チャンネル名をIssueタイトルに
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
