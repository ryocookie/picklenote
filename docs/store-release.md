# F-Droid / IzzyOnDroid への掲載

どちらもストア掲載文・アイコン・スクリーンショットはリポジトリの `fastlane/metadata/android/` から読み込みます。
ここを編集して push すれば、次回の更新時に反映されます。

## バージョンの上げ方（共通）

1. `android/app/build.gradle` の `versionCode` / `versionName` を上げる
   - `versionCode = major * 10000 + minor * 100 + patch`（例: 1.2.0 → 10200）
2. `fastlane/metadata/android/{ja-JP,en-US}/changelogs/<versionCode>.txt` に変更点を書く（500文字以内）
3. コミットして `v<versionName>` タグを push する（タグと versionName が違うと CI が失敗します）

```bash
git tag v1.0.3
git push origin main v1.0.3
```

GitHub Releases に署名付き APK が載り、IzzyOnDroid と Obtainium はそれを配信します。
F-Droid はタグを検知してソースから自前でビルドします（反映まで数日）。

## IzzyOnDroid（GitHub Releases の APK をそのまま配信）

初回だけ申請が必要です。<https://gitlab.com/IzzyOnDroid/repo/-/issues/new> で
テンプレート「App inclusion request」を選び、以下を記入します（GitLab アカウントが必要）。

- Source code: https://github.com/ryocookie/picklenote
- License: GPL-3.0-or-later
- APK: GitHub Releases の最新 APK
- 説明: Pickleball scorekeeper, open-play court rotation and beginner rulebook. No ads, no tracking, no network access to third parties.

掲載後はリリースのたびに自動で取り込まれます。

## F-Droid 本家（F-Droid がソースからビルド）

1. GitLab で <https://gitlab.com/fdroid/fdroiddata> を fork する
2. [docs/fdroid/io.github.ryocookie.picklenote.yml](fdroid/io.github.ryocookie.picklenote.yml) を
   fork の `metadata/io.github.ryocookie.picklenote.yml` に置き、ブランチを作って Merge Request を出す
   - 最新タグに合わせて `versionName` / `versionCode` / `commit` / `CurrentVersion*` を書き換える
3. MR の CI（fdroid lint / build）が通るまでレビュアーとやり取りする

レシピの要点:

- web 部分は bun（公式リリースを SHA-256 で検証してから使う）でビルドし、`cap sync` 後に
  node_modules を Capacitor 本体とプラグイン以外削除してから Gradle に渡す（スキャナ対策）
- F-Droid 版は F-Droid の鍵で署名されるため、GitHub / IzzyOnDroid 版とは署名が異なり、
  相互にアップデートできない（切り替えるにはアンインストールが必要）

## 注意

- Google Play Services / Firebase など非 FOSS の依存を追加すると F-Droid に載らなくなります
- 署名鍵（`docs/android-release.md` 参照）を失うと IzzyOnDroid / Obtainium の利用者が更新できなくなります
