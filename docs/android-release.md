# Android APK のリリース手順（Obtainium 配布）

署名付き APK は GitHub Actions（`.github/workflows/android.yml`）が `v*` タグの push で自動ビルドし、
GitHub Releases に添付します。Obtainium はこの Releases を見てインストール・更新します。

## 1. 署名鍵を作る（初回のみ・手元で実行）

> **この鍵は絶対に失くさない・公開しないでください。** 鍵が変わると既存ユーザーはアップデートできず、
> 一度アンインストールが必要になります。パスワードマネージャー等にバックアップしてください。

Android Studio 同梱の `keytool` を使います（Java を別途入れている場合は `keytool` だけで可）。

```bash
"/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" -genkeypair -v \
  -keystore ~/picklenote-release.keystore -alias picklenote \
  -keyalg RSA -keysize 4096 -validity 10000
```

パスワードと氏名などを聞かれるので入力します（氏名欄はニックネームで構いません）。

## 2. GitHub Secrets に登録する

リポジトリの Settings → Secrets and variables → Actions → New repository secret で 4 つ登録します。
`gh` を使う場合は次のとおり（パスワードは対話入力になり、履歴に残りません）。

```bash
base64 -i ~/picklenote-release.keystore | gh secret set ANDROID_KEYSTORE_BASE64 --repo ryocookie/picklenote
gh secret set ANDROID_KEYSTORE_PASSWORD --repo ryocookie/picklenote
gh secret set ANDROID_KEY_ALIAS --repo ryocookie/picklenote --body picklenote
gh secret set ANDROID_KEY_PASSWORD --repo ryocookie/picklenote
```

`keytool` で鍵のパスワードを別に設定しなかった場合、`ANDROID_KEY_PASSWORD` はストアのパスワードと同じです。

## 3. リリースする

```bash
git tag v1.0.0
git push origin v1.0.0
```

Actions が終わると Releases に `PickleNote-v1.0.0.apk` が追加されます。
バージョンコードは Actions の実行番号から自動で採番されるので、タグを打つだけで更新扱いになります。

## 4. Obtainium で入れる

1. Android に [Obtainium](https://github.com/ImranR98/Obtainium) を入れる
2. 「アプリを追加」で `https://github.com/ryocookie/picklenote` を入力
3. インストール。以後は新しいタグを打つと Obtainium が更新を検知します

## 署名なしで動作確認したいとき

Actions の「Android APK」ワークフローを手動実行（Run workflow）すると、デバッグ署名の APK が
Artifacts に添付されます。これは確認用で、Obtainium の更新には使えません。
