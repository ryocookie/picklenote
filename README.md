# PickleNote

ピックルボール初心者向けの得点計算＆ルール一覧アプリ（Vite + React + TypeScript）。

- スコア: サイドアウト方式（ダブルス 3コール / シングルス 2コール）、サーバーと位置の表示、1つ戻す、端末内に自動保存
- マッチ: 1ゲーム / 3ゲームマッチ（2ゲーム先取）。ゲーム間と最終ゲーム折り返しのコートチェンジを通知
- 読み上げ: ラリーごとにスコアコールを音声で読み上げ（Web Speech API）
- 試合中は画面のスリープを防止（Screen Wake Lock API）
- PWA: ホーム画面に追加してオフラインでも利用可能
- ルール: 初心者向けの要約・図解と検索

## 使う

- **iPhone / Android（ブラウザ）**: https://ryocookie.github.io/picklenote/ を開き、共有メニューから「ホーム画面に追加」
- **Android（アプリ）**: [Obtainium](https://github.com/ImranR98/Obtainium) に `https://github.com/ryocookie/picklenote` を追加、
  または [Releases](https://github.com/ryocookie/picklenote/releases) から APK を直接インストール

## 開発

```bash
bun install
bun dev        # 開発サーバー
bun run test   # 得点ロジックのテスト
bun run build          # 通常ビルド
bun run build:pages    # GitHub Pages 向け（/picklenote/ 配下）
bun run build:android  # Capacitor 向けビルド + android/ へ同期
```

- `main` への push で GitHub Pages に自動デプロイされます（`.github/workflows/pages.yml`）
- `v*` タグの push で署名付き APK が GitHub Releases に公開されます。初回設定は [docs/android-release.md](docs/android-release.md)
- Android ネイティブでは読み上げ・スリープ防止を Capacitor プラグイン（text-to-speech / keep-awake）で行います

得点ロジックは `src/domain/scoring.ts`、マッチ進行は `src/domain/match.ts`（いずれも純粋関数）に集約しています。
アイコンは `public/app-icon.svg` から `bunx pwa-assets-generator` で生成します。
