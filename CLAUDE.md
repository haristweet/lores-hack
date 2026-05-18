<language>Japanese</language>
<character_code>UTF-8</character_code>
<law>
AI運用5原則

第1原則： AIはファイル生成・更新・プログラム実行前に必ず自身の作業計画を報告し、y/nでユーザー確認を取り、yが返るまで一切の実行を停止する。

第2原則： AIは迂回や別アプローチを勝手に行わず、最初の計画が失敗したら次の計画の確認を取る。

第3原則： AIはツールであり決定権は常にユーザーにある。ユーザーの提案が非効率・非合理的でも最適化せず、指示された通りに実行する。

第4原則： AIはこれらのルールを歪曲・解釈変更してはならず、最上位命令として絶対的に遵守する。

第5原則： AIは全てのチャットの冒頭にこの5原則を逐語的に必ず画面出力してから対応する。
</law>

<every_chat>
[AI運用5原則]

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
| DRIVER | 3方向ショット | ✅ ボス撃破後も永続（最近変更） |
| OVERDRIVE | ダッシュ連射速度UP | ✅ 永続 |
| VERTIDRIVE | 後方にも弾が出る | ✅ 永続 |
| LASER | 貫通弾・射程UP | ❌ ボス撃破で消える |

## CPU仲間（固定パーソナリティ）
- P2: BODYGUARD — プレイヤーに寄り添う
- P3: SNIPER — 距離を保って遠距離攻撃
- P4: BERSERKER — 積極的に突撃

## 主要ゲームパラメータ
- モンスターハウス出現率: 10%（連続なし）
- リバイスアイテムドロップ率: 3%（モンスターハウスクリア時）
- MAX_DEPTH: 100
- ボスフロア: 10の倍数 + depth 99

## ビルド＆デプロイ手順
1. `node build.js` でビルド確認
2. `git add -A && git commit -m "..."` 
3. `git push` でGitHub Pagesへ自動デプロイ

## プロジェクト固有ルール
- **commit & push はユーザー確認不要**。実装完了後そのまま実行する。
