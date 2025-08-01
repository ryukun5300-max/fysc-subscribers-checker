const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, 'data');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');

// CORSとJSONパース設定
app.use(cors());
app.use(express.json());

// カレントディレクトリを静的ファイルとして提供する
app.use(express.static(__dirname));

// アクセスログ（デバッグ用）
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// index.htmlを返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// channels.jsonの読み込み（なければ空）
let channels = {};
try {
  const data = fs.readFileSync(CHANNELS_FILE, 'utf-8');
  channels = JSON.parse(data);
  console.log('channels.json loaded successfully.');
} catch (error) {
  console.log('channels.json not found or could not be parsed. Starting with empty channels.');
  channels = {};
}
console.log('Channels object after initial load:', JSON.stringify(channels, null, 2));


// チャンネルデータ保存関数
function saveChannels() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  
  console.log('Channels object content before saving:', JSON.stringify(channels, null, 2));

  try {
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
    console.log('channels.json saved!');  
  } catch (error) {
    console.error('Error saving channels.json:', error);
  }
}

// サーバー起動時に一度保存してファイル作成を保証
saveChannels();

// ランキング用 チャンネル一覧返す（上位105位まで）
app.get('/channels', (req, res) => {
  const sortedChannels = Object.values(channels).sort((a, b) => {
    const subsA = a.subscribers ?? 0;
    const subsB = b.subscribers ?? 0;
    return subsB - subsA;
  }).slice(0, 105);
  res.json(sortedChannels);
});

// チャンネル追加API（!registerコマンド）
app.get('/add', (req, res) => {
  const { user_id, user_name } = req.query;
  if (!user_id || !user_name) {
    return res.status(400).send('user_id and user_name are required');
  }

  if (channels[user_id]) {
    return res.status(409).send(`${user_name} is already registered.`);
  }

  channels[user_id] = {
    userid: user_id,
    name: user_name,
    subscribers: 0,
    growth: 0
  };
  saveChannels(); // add時は即座に保存
  res.send(`${user_name} has been added to the ranking!`);
});

// Growth増加API（!videoコマンド - ランダムな値を追加）
app.get('/video', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).send('user_id is required');

  if (!channels[user_id]) {
    return res.status(404).send('Use !wall to add it to your system');
  }

  const amount = Math.floor(Math.random() * (150 - 10 + 1)) + 10;

  channels[user_id].growth = (channels[user_id].growth || 0) + amount;
  res.send('Video posted!');
});

// Growth増加API（!shortコマンド）
app.get('/short', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).send('user_id is required');

  if (!channels[user_id]) {
    return res.status(404).send('Use !wall to add it to your system');
  }

  const amount = Math.floor(Math.random() * (200 - 20 + 1)) + 20;

  channels[user_id].growth = (channels[user_id].growth || 0) + amount;
  res.send('Posted Short Video');
});

// Growth増加API（!viralコマンド）
app.get('/viral', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).send('user_id is required');

  if (!channels[user_id]) {
    return res.status(404).send('Use !wall to add it to your system');
  }

  const amount = Math.floor(Math.random() * (300 - 50 + 1)) + 50;

  channels[user_id].growth = (channels[user_id].growth || 0) + amount;
  res.send('Posted Viral Video');
});

// Growth増加API（!trendコマンド）
app.get('/trend', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).send('user_id is required');

  if (!channels[user_id]) {
    return res.status(404).send('Use !wall to add it to your system');
  }

  const amount = Math.floor(Math.random() * (500 - 100 + 1)) + 100;

  channels[user_id].growth = (channels[user_id].growth || 0) + amount;
  res.send('Posted Trend Video');
});

// Growth確認API（!growth-checkコマンド）
app.get('/growth-check', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).send('user_id is required');

  const ch = channels[user_id];
  if (!ch) {
    return res.status(404).send('Use !wall to add it to your system');
  }

  const formattedGrowth = (ch.growth || 0).toLocaleString();
  res.send(`${ch.name}'s current Growth is ${formattedGrowth}.`);
});

// チャンネル全部削除API（開発用）
app.get('/clear', (req, res) => {
  channels = {};
  saveChannels(); // clear時も即座に保存
  res.send('All channels have been cleared.');
});

// バトル用: 最も登録者数が近い2つのチャンネルを返す
app.get('/battle/auto', (req, res) => {
  const channelArray = Object.values(channels);

  if (channelArray.length < 2) {
    return res.status(400).send('Not enough channels for a battle.');
  }

  channelArray.sort((a, b) => (a.subscribers ?? 0) - (b.subscribers ?? 0));

  let minDiff = Infinity;
  let battlePair = [];

  for (let i = 0; i < channelArray.length - 1; i++) {
    const diff = channelArray[i + 1].subscribers - channelArray[i].subscribers;
    if (diff < minDiff) {
      minDiff = diff;
      battlePair = [channelArray[i], channelArray[i + 1]];
    }
  }

  res.json(battlePair);
});

// Faster Growth用: 成長率が高いチャンネルを返す
app.get('/growth/faster', (req, res) => {
  const sortedChannels = Object.values(channels).sort((a, b) => {
    const growthA = a.growth ?? 0;
    const growthB = b.growth ?? 0;
    return growthB - growthA;
  }).slice(0, 105);
  res.json(sortedChannels);
});

// 特定のチャンネルの情報を返す
app.get('/channel/:user_id', (req, res) => {
  const { user_id } = req.params;
  const channel = channels[user_id];

  if (!channel) {
    return res.status(404).json({ error: 'Channel not found.' });
  }

  res.json(channel);
});

// チャンネル名でチャンネルを検索する
app.get('/search', (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required.' });
    }
    
    const lowerCaseQuery = query.toLowerCase();
    const searchResults = Object.values(channels).filter(ch => 
        ch.name.toLowerCase().includes(lowerCaseQuery)
    );
    
    res.json(searchResults);
});

// 【新しいAPI】登録されているすべてのチャンネルを返す
app.get('/channels/all', (req, res) => {
  res.json(Object.values(channels));
});

// 5秒ごとにGrowthを登録者数に反映し、常に保存
setInterval(() => {
  for (const id in channels) {
    const ch = channels[id];
    if (ch.growth > 0) {
      const consume = Math.ceil(ch.growth / (3600 / 5));
      ch.growth -= consume;
      if (ch.growth < 0) ch.growth = 0;
      ch.subscribers += consume;
    }
  }
  saveChannels(); // 常に保存
}, 5000);

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});