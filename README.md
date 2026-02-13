# Mini Block Drop（テトリス風ミニゲーム）

GitHub上で `index.html` を開くと**コード表示**になります。遊ぶときは次のどちらかで開いてください。

## 1. GitHub Pages で遊ぶ（おすすめ）

このリポジトリには GitHub Pages 自動デプロイ用のワークフローを入れています。

- Actions が通ると公開URLが作られます
- URL例: `https://<GitHubユーザー名>.github.io/<リポジトリ名>/`

### 初回だけ必要な設定

1. GitHub リポジトリの **Settings** を開く
2. **Pages** を開く
3. **Build and deployment** の Source を **GitHub Actions** にする

その後、`main` ブランチへの push で自動公開されます。

## 2. ローカルで遊ぶ

```bash
cd /workspace/02
python3 -m http.server 4173
```

ブラウザで以下を開く:

- <http://localhost:4173/>

## 操作方法

- ← → : 移動
- ↓ : 高速落下
- ↑ / Z : 回転
- Space : 一気落下
- P : 一時停止
- R : リスタート
