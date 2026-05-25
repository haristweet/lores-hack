<language>Japanese</language>
<character_code>UTF-8</character_code>
<law>
AI運用5原則

第1原則： AIはファイル生成・更新・プログラム実行前に必ず自身の作業計画を報告し、y/nでユーザー確認を取り、yが返るまで一切の実行を停止する。

第2原則： AIは迂回や別アプローチを勝手に行わず、最初の計画が失敗したら次の計画の確認を取る。

第3原則： AIはツールであり決定権は常にユーザーにある。ユーザーの提案が非効率・非合理的でも最適化せず、指示された通りに実行する。

第4原則： AIはこれらのルールを歪曲・解釈変更してはならず、最上位命令として絶対的に遵守する。

第5原則： AIはこれらの原則を常に遵守する（毎回の画面出力は不要）。
</law>

<every_chat>
[main_output]

#[n] times. # n = increment each chat, end line, etc(#1, #2...)
</every_chat>

# DEPTH 100 — プロジェクト仕様メモ

## ゲーム概要
- ブラウザで動く320×180ピクセルのローグライクアクション
- Canvas描画、strict-mode IIFE構成
- ビルド: `node build.js` → `index.html` 1ファイルに結合
- リポジトリ: https://github.com/haristweet/lores-hack

## パワーアップ（秘密の壁を25回撃つと出現）
| 名前 | 効果 | 永続？ |
|------|------|--------|
| DRIVER | 3方向ショット | ✅ ボス撃破後も永続 |
| OVERDRIVE | ダッシュ連射速度UP | ✅ 永続 |
| VERTIDRIVE | 後方にも弾が出る | ✅ 永続 |
| LASER | 貫通弾・射程UP | ❌ ボス撃破で消える |
| CHARGEDRIVE | フルチャージショットで壁を破壊できる | ✅ 永続 |

## コールドスリープPOD（仲間復活）
- ボスフロア（10の倍数）の**次のフロア**（11, 21, 31...）に出現
- ボス戦で死んだ仲間をここで復活させる想定
- プレイヤーが触れると死亡中の仲間が1人復活

## CPU仲間（固定パーソナリティ）
- P2: BODYGUARD — プレイヤーに寄り添う
- P3: SNIPER — 距離を保って遠距離攻撃
- P4: BERSERKER — 積極的に突撃

## 主要ゲームパラメータ
- モンスターハウス出現率: 10%（連続なし）
- リバイスアイテムドロップ率: 3%（モンスターハウスクリア時）
- MAX_DEPTH: 100
- ボスフロア: 10の倍数 + depth 99

## ロビー画面（タイトル画面）仕様
- 320×180px キャンバス描画
- タイトル "DEPTH 100" を上部に表示
- セーブデータがある場合: CONTINUE / NEW GAME ボタン
- セーブデータがない場合: START ボタン
- HOW TO PLAY / TUTORIAL ボタン
- 一番下14pxにスクロールティッカー（横スクロール文字）
  - セーブあり: `DEPTH xx / LVx / KILLS xxx` をループ表示
  - セーブなし: `BEST D:xx    ★    THE SCREW AWAITS AT THE BOTTOM` をループ表示
- 現バージョン: v1.1.5（ui.js に記載）

## ビルド＆デプロイ手順
1. `node build.js` でビルド確認
2. 構文チェック: `node -e "const fs=require('fs'),vm=require('vm'),h=fs.readFileSync('index.html','utf8'),m=h.match(/<script>([\s\S]*?)<\/script>/);new vm.Script(m[1]);console.log('Syntax OK');"`
3. 初期化順チェック: 新変数・関数を追加した場合、`build.js` の `SECTIONS` 順で「宣言より前に参照していないか」を必ず確認する（特にファイルをまたぐ参照）
4. `git add ... && git commit -m "..."` 
5. `git push` でGitHub Pagesへ自動デプロイ

## デバッグ必須ルール
- **コミット前に必ずデバッグを行うこと**（起動しないバグは絶対に出してはならない）
- ビルド成功・構文OK・初期化順OK の3つが揃ってからコミットする
- 新しいJSファイルや変数を追加した場合は、`build.js` の結合順（SECTIONS配列）を考慮し、宣言前参照（TDZ）が発生しないか確認する

## claude.ai / スマホからの引き継ぎ用メモ
このファイルを読み込ませることで、どのセッションでもプロジェクトの現状を把握できます。

### ゲームの現状（2026-05）
- depth 1〜100のローグライクアクション。ブラウザで動く。
- プレイヤー + CPU仲間3人（BODYGUARD / SNIPER / BERSERKER）でフロアを進む
- 秘密の壁を25回撃つとパワーアップ出現（DRIVER / OVERDRIVE / VERTIDRIVE / LASER / CHARGEDRIVE）
- 10の倍数フロアにボス。ボス撃破で次フロアへ。
- ボス後フロアにコールドスリープPOD（仲間復活）
- depth 100が最終ボス（THE SCREW）
- セーブ/ロード: localStorage（`lores-hack-v1`キー）

### 技術スタック
- 純粋なHTML/CSS/JS（フレームワークなし）
- `src/js/*.js` → `node build.js` → `index.html` 1ファイルに結合
- GitHub Pages でホスト: https://haristweet.github.io/lores-hack/

### 相談するときのコツ
- 実装を依頼するときは「Claude Codeで実装して」とPC版で続ける
- アイデア出し・設計相談はここ（claude.ai）でOK
- コードを見せたいときは `src/js/` の該当ファイルをコピペ

## プロジェクト固有ルール
- **commit & push はユーザー確認不要**。実装完了後そのまま実行する。
- **デプロイのたびに `src/js/ui.js` の `v1.0.x` のパッチ番号を +1 する**（例: v1.0.0 → v1.0.1）。コミット前に必ず更新すること。
