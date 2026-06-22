# thanks — 契約後「39メール」生成システム (PoC)

住宅契約後にお客様へお送りする御礼メール（社内通称「**39（サンキュー）メール**」）の作成を支援する、Human in the Loop 型の Web アプリケーションです。

案件情報を入力すると、支払い方法に応じたテンプレートで件名・本文を自動生成し、**送信前に人間が必ず確認・編集**できるよう、リスクチェックと次回タスクの提案を併せて表示します。送信そのものは自動化せず、確認済みの本文をコピーして既存のメールフローへ流す運用を想定しています。

## 特徴

- **テンプレート自動分岐** — 支払い方法（銀行借入 / 現金支払い）に応じて本文・件名・後続タスクを切り替え
- **リスクチェック** — 必須文言の欠落、テンプレートの取り違え、契約日／工事予定日の異常、メールアドレス形式などを `critical`〜`low` の重要度付きで検出
- **次回タスク提案** — 銀行審査フォローや工事前の入金確認など、案件に応じた次アクションと期限を自動算出
- **Human in the Loop** — 生成結果は画面上で編集可能。確認のうえ「件名＋本文」をワンクリックでコピー

## 処理フロー

```
入力フォーム → テンプレート分岐 (compose) → リスクチェック (validate) → 人間が確認・編集 → コピー送信
```

## 技術スタック

- [Next.js](https://nextjs.org/) 16 (App Router) / React 19
- TypeScript
- [Zod](https://zod.dev/) — リクエストバリデーション
- Tailwind CSS 4
- [Vitest](https://vitest.dev/) — ユニットテスト
- パッケージマネージャ: pnpm

## セットアップ

```bash
pnpm install
pnpm dev
```

開発サーバ起動後、ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### スクリプト

| コマンド | 説明 |
| --- | --- |
| `pnpm dev` | 開発サーバを起動 |
| `pnpm build` | 本番ビルド |
| `pnpm start` | 本番サーバを起動 |
| `pnpm test` | テストを実行 (Vitest) |
| `pnpm test:watch` | テストを watch モードで実行 |
| `pnpm typecheck` | 型チェック (`tsc --noEmit`) |

## ディレクトリ構成

```
app/
  page.tsx                                   入力フォーム + 結果表示の UI
  api/thank-you-email/generate/route.ts      生成 API エンドポイント (POST)
src/
  domain/
    compose.ts        件名・本文・次回タスクの生成ロジック
    validate.ts       リスクチェック（必須文言・日付・テンプレート整合性 等）
    interpolate.ts    テンプレート変数の差し込み
    date.ts           日付ユーティリティ
  config/
    templateConfig.ts デフォルトのテンプレート設定（会社名・送付先・各種日数 等）
  templates/
    bankLoan.txt      銀行借入版の本文テンプレート
    cash.txt          現金支払い版の本文テンプレート
  api/
    generateRequestSchema.ts  リクエストの Zod スキーマ
    today.ts                  JST 基準の当日取得
  types.ts            ドメイン型定義
```

## API

### `POST /api/thank-you-email/generate`

案件情報を受け取り、生成済みドラフトとリスクフラグを返します。

#### リクエスト例

```json
{
  "customerName": "山田 太郎",
  "paymentType": "cash",
  "contractDate": "2026-06-22",
  "salesStaffName": "佐藤 健一",
  "assistantStaffName": "鈴木 花子",
  "ccStaffName": "高橋 一郎",
  "customerEmail": "customer@example.com",
  "constructionDateStatus": "decided",
  "constructionDate": "2026-08-01"
}
```

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `customerName` | ✓ | 顧客名 |
| `paymentType` | ✓ | `bank_loan` または `cash` |
| `contractDate` | ✓ | 契約日 (`YYYY-MM-DD`) |
| `salesStaffName` | ✓ | 担当者名 |
| `assistantStaffName` | ✓ | アシスタント名 |
| `ccStaffName` | | CC 担当者名 |
| `customerEmail` | | 顧客メールアドレス |
| `constructionDateStatus` | | `cash` の場合のみ。`decided` / `undecided` |
| `constructionDate` | | `constructionDateStatus` が `decided` の場合は必須 (`YYYY-MM-DD`) |

#### レスポンス例

```json
{
  "templateType": "cash",
  "subject": "【山田 太郎様】ご契約のお礼と今後のお手続きについて",
  "body": "...",
  "nextTask": {
    "type": "pre_construction_payment_check",
    "dueDate": "2026-07-25",
    "reason": "工事予定日の1週間前までに半金入金確認"
  },
  "riskFlags": [
    { "code": "MISSING_REPLY_ALL_NOTICE", "severity": "high", "message": "全員返信のお願いが本文にありません" }
  ]
}
```

不正な JSON は `400 Invalid JSON body`、スキーマ違反は `400 ValidationError`（`details` に内訳）を返します。

## ステータス

これは PoC（概念実証）です。メール送信機能・データ永続化・認証などは未実装で、送信は人手による運用を前提としています。テンプレート内の `TEL: [TODO]` / `MAIL: [TODO]` など、確定前のプレースホルダが含まれます。
