# 契約後 39 メール生成・確認管理システム 要件定義書

## アフターホーム / 事務員作業置換 PoC / 高度エンジニアリング詳細版

---

# 1. 最上位結論

本 PoC で作るべきものは、メール自動送信ツールではない。

作るべきものは、契約後に顧客へ送る「39 メール」を、契約情報に応じて正しいテンプレートへ分岐し、必要情報を差し込み、送信前チェックを行い、人間が確認したうえで送信できる状態にする **契約後メール生成・確認管理システム** である。

初期スコープは、以下 1 業務に限定する。

* 契約後の 39 メール生成

ただし、契約後 39 メールには支払い方法による分岐があるため、MVP では以下 2 パターンを実装対象にする。

1. 銀行借入版 39 メール
2. 現金支払い版 39 メール

初期段階では Gmail API による自動送信は行わない。
フォーム入力 → テンプレート分岐 → AI / テンプレート整形 → 人間確認 → コピー送信 → 送信済み記録、という Human in the Loop 型で実装する。

---

# 2. 背景

現在、契約後の顧客対応では、事務員さんまたはアシスタントチームが顧客へ 39 メールを送っている。

39 メールは、契約のお礼だけではなく、契約後業務全体の入口である。

このメールで顧客へ伝える内容は、以下である。

* 契約のお礼
* 今後のサポート体制
* 契約内容確認電話への対応依頼
* 銀行審査の進め方
* 現金支払いの場合の支払いタイミング
* 委任状の返送依頼
* 印鑑証明書の同封依頼
* 書類送付先
* 現地調査日 / 工事日確定までの流れ
* 全員返信のお願い
* 不明点がある場合の問い合わせ導線

つまり、39 メールは、契約後の顧客行動を決める最初の公式案内である。

このメールの作成・送信・送信済み管理を構造化できれば、後続の書類回収、銀行進捗確認、現地調査日程調整、工事日程調整、入金確認へ拡張できる。

---

# 3. 目的

本システムの目的は、契約後 39 メール作成業務を半自動化し、事務員さんへの依頼・文面作成・確認ラリー・送信済み管理の負荷を削減することである。

より具体的には、以下を目的とする。

## 3.1 業務削減

* 39 メール作成時間を短縮する
* 事務員さんへのメール作成依頼を減らす
* 「この内容で送ってよいですか？」という確認ラリーを減らす
* 担当者がフォーム入力だけでメール文面を生成できるようにする
* 送信済み / 未送信を案件単位で見える化する

## 3.2 品質担保

* 銀行借入版 / 現金支払い版のテンプレート選択ミスを防ぐ
* 顧客名の誤記を防ぐ
* 担当者名の誤記を防ぐ
* CC に入れる担当者の漏れを防ぐ
* 委任状案内の記載漏れを防ぐ
* 書類送付先の表記揺れを防ぐ
* 現金支払い時の入金タイミング誤記を防ぐ
* 銀行借入時の銀行審査案内の抜け漏れを防ぐ
* 全員返信案内の記載漏れを防ぐ

## 3.3 進捗管理

* 契約日または翌日に送るべき 39 メールを見える化する
* 未送信案件を一覧化する
* 送信済み記録を案件に紐づける
* 次回確認タスクを作成する
* 銀行借入の場合は「1 週間後の進捗確認」へ接続する
* 現金支払いの場合は「工事 1 週間前の半金入金確認」へ接続する

---

# 4. 対象スコープ

## 4.1 MVP 対象

MVP 対象は以下のみ。

* 契約後 39 メール生成
* 銀行借入版テンプレート
* 現金支払い版テンプレート
* 送信前チェック
* 人間による確認・編集
* コピー用本文出力
* 送信済み記録
* 次回確認日の提案

## 4.2 MVP 対象外

以下は初期 MVP では対象外。

* Gmail API による自動送信
* Gmail 下書き自動作成
* 顧客返信の自動取得
* 書類不足リマインドメール
* 銀行進捗確認メール
* 工事日確定後の確認メール
* 現調日前リマインド
* 工事日前リマインド
* 工事後お礼メール
* 入金確認メール
* SMS 送信
* LINE 送信
* 契約書 OCR
* Slack 自動通知
* Google Calendar 連携
* 施工依頼フォーマット生成

## 4.3 将来拡張候補

39 メール PoC 成功後に拡張する候補。

* 現調日確定メール
* 工事日確定メール
* 現調日前リマインド
* 工事日前リマインド
* 銀行進捗確認メール
* 現金支払いの入金確認メール
* 工事後お礼メール
* Gmail API 連携
* Slack 通知
* 案件ステータス管理

---

# 5. 業務要件

## 5.1 送信タイミング

39 メールは、原則として以下のタイミングで送る。

* 契約日当日
* または契約日の翌日

システム上は、契約日を入力した時点で、39 メールの送信期限を自動計算する。

例：

```text
契約日：2026/06/22
送信期限：2026/06/23 23:59
```

送信期限を超えた場合は、未送信アラートを表示する。

---

## 5.2 テンプレート分岐

39 メールは、支払い方法によってテンプレートを分岐する。

分岐条件：

```text
paymentType = bank_loan
→ 銀行借入版 39 メール

paymentType = cash
→ 現金支払い版 39 メール
```

支払い方法が未選択の場合、メール生成をブロックする。

表示メッセージ：

```text
支払い方法が未選択です。
銀行借入または現金支払いを選択してください。
```

---

## 5.3 銀行借入版の業務要件

銀行借入版では、顧客に以下 3 点を依頼する。

1. 契約内容の確認電話への対応
2. 銀行審査についての進捗共有
3. 委任状の返送

銀行審査については、テンプレート上では以下の案内を含める。

* 銀行審査の結果は通常 1 週間程度で届く
* 結果が分かり次第、このメールへ返信してもらう
* 1 週間ほど経過したタイミングで、こちらからも確認する
* これから銀行審査を進める顧客には、担当より改めて案内する

送信後の次回タスクとして、以下を作成する。

```text
タスク種別：銀行審査進捗確認
期限：39 メール送信日 + 7 日
担当：契約担当者
```

---

## 5.4 現金支払い版の業務要件

現金支払い版では、顧客に以下 3 点を依頼する。

1. 契約内容の確認電話への対応
2. 現金支払いの支払いタイミング確認
3. 委任状の返送

現金支払いについては、以下の案内を含める。

* 工事予定日の 1 週間前までに、ご請求金額の半金を支払う
* 工事完了後 3 日以内に、残額の全額を支払う

工事予定日が未定の場合でも、メール本文には「工事予定日が確定次第、改めてご案内します」という補足を入れる。

送信後の次回タスクとして、工事予定日がある場合は以下を作成する。

```text
タスク種別：工事前半金入金確認
期限：工事予定日 - 7 日
担当：契約担当者
```

工事予定日が未定の場合は、以下を作成する。

```text
タスク種別：工事日確定後に入金確認日を設定
期限：未定
担当：契約担当者
```

---

## 5.5 共通業務要件

銀行借入版 / 現金支払い版のどちらにも、以下を含める。

* 契約のお礼
* アシスタントチームと担当者が一緒に対応する旨
* 工事完了までチームでサポートする旨
* 契約内容確認電話への対応依頼
* 委任状 2 部の署名・捺印依頼
* 印鑑証明書の同封依頼
* 書類送付先
* 記入例添付の案内
* 委任状をすでに渡している場合は対応不要の案内
* 弊社側で現地調査日・工事日を調整する旨
* 委任状の補足説明
* 全員返信のお願い
* 全員返信手順の添付案内
* 締めの挨拶
* 署名

---

# 6. テンプレート仕様

## 6.1 共通プレースホルダー

テンプレートには以下のプレースホルダーを持たせる。

```text
{{customerName}}
{{salesStaffName}}
{{assistantStaffName}}
{{ccStaffName}}
{{companyName}}
{{contractDateLabel}}
{{documentReturnAddress}}
{{senderSignature}}
```

## 6.2 銀行借入版のみのプレースホルダー

```text
{{bankProcessStatus}}
{{bankFollowUpDays}}
```

初期値：

```text
bankFollowUpDays = 7
```

## 6.3 現金支払い版のみのプレースホルダー

```text
{{constructionDate}}
{{preConstructionPaymentDueDate}}
{{postConstructionPaymentDueDays}}
{{prePaymentRatio}}
```

初期値：

```text
prePaymentRatio = 50%
postConstructionPaymentDueDays = 3
```

## 6.4 固定文言として管理する情報

書類送付先は固定値として設定管理する。

```text
〒463-0003
愛知県名古屋市中区錦1-16-25 三甲名古屋錦ビル5F
（株）Fit Founder JEPA申請担当 宛
```

この値はテンプレートに直書きせず、設定値として管理する。

理由：

* 将来変更時にコード修正を不要にするため
* 表記揺れを防ぐため
* 複数テンプレートで共通利用するため

---

# 7. メール文面仕様

## 7.1 件名仕様

現行テンプレートでは、件名が以下のように示されている。

```text
件名：【お客様名】
```

ただし、これだけではメール一覧上で内容が分かりにくいため、システム上は以下 2 パターンを選べるようにする。

### パターン A：現行準拠

```text
【{{customerName}}】
```

### パターン B：推奨

```text
【{{customerName}}様】ご契約のお礼と今後のお手続きについて
```

MVP では、現行準拠をデフォルトにしつつ、推奨件名も設定で選択可能にする。

---

## 7.2 銀行借入版本文構成

構成：

1. 宛名
2. 挨拶
3. 契約のお礼
4. サポート体制の説明
5. 今後の流れの案内
6. お願いしたいこと 3 点

   * 契約内容の確認電話
   * 銀行審査
   * 委任状の返送
7. 弊社側で進めること
8. 委任状についての補足
9. 全員返信のお願い
10. 全員返信手順添付の案内
11. 締め
12. 署名

---

## 7.3 現金支払い版本文構成

構成：

1. 宛名
2. 挨拶
3. 契約のお礼
4. サポート体制の説明
5. 今後の流れの案内
6. お願いしたいこと 3 点

   * 契約内容の確認電話
   * 現金支払いについて
   * 委任状の返送
7. 弊社側で進めること
8. 委任状についての補足
9. 全員返信のお願い
10. 全員返信手順添付の案内
11. 締め
12. 署名

---

# 8. 入力項目定義

## 8.1 必須入力

```text
customerName
paymentType
salesStaffName
assistantStaffName
ccStaffName
senderSignature
contractDate
```

## 8.2 条件付き必須

paymentType が cash の場合：

```text
constructionDate
```

ただし、工事予定日が未定の場合は、`constructionDateStatus = undecided` を選択できる。

paymentType が bank_loan の場合：

```text
bankProcessStatus
```

選択肢：

```text
already_started
not_started_yet
unknown
```

## 8.3 任意入力

```text
customerEmail
ccEmail
contractConfirmationCallStatus
documentPowerOfAttorneyStatus
sealCertificateStatus
customNote
```

---

# 9. データモデル

## 9.1 Contract

```ts
type Contract = {
  id: string;
  customerId: string;
  contractDate: string;
  paymentType: "bank_loan" | "cash";
  salesStaffId: string;
  assistantStaffId?: string;
  ccStaffIds: string[];
  constructionDate?: string;
  constructionDateStatus?: "decided" | "undecided";
  status: "contracted" | "thank_you_email_pending" | "thank_you_email_sent";
  createdAt: string;
  updatedAt: string;
};
```

## 9.2 Customer

```ts
type Customer = {
  id: string;
  name: string;
  kana?: string;
  email?: string;
  phone?: string;
  preferredContactMethod?: "email" | "phone" | "sms" | "line";
  createdAt: string;
  updatedAt: string;
};
```

## 9.3 ThankYouEmail

```ts
type ThankYouEmail = {
  id: string;
  contractId: string;
  customerId: string;

  templateType: "bank_loan" | "cash";
  status:
    | "not_created"
    | "draft_generated"
    | "pending_review"
    | "approved"
    | "sent"
    | "on_hold"
    | "error";

  subject: string;
  body: string;

  to?: string;
  cc: string[];

  generatedAt?: string;
  generatedBy?: string;

  reviewedAt?: string;
  reviewedBy?: string;

  sentAt?: string;
  sentBy?: string;

  nextTaskType?:
    | "bank_follow_up"
    | "pre_construction_payment_check"
    | "set_payment_check_after_construction_date_decided"
    | "none";

  nextTaskDueDate?: string;

  riskFlags: EmailRiskFlag[];

  createdAt: string;
  updatedAt: string;
};
```

## 9.4 EmailRiskFlag

```ts
type EmailRiskFlag = {
  code:
    | "MISSING_CUSTOMER_NAME"
    | "MISSING_PAYMENT_TYPE"
    | "MISSING_STAFF_NAME"
    | "MISSING_SIGNATURE"
    | "MISSING_CC_STAFF"
    | "MISSING_CONSTRUCTION_DATE_FOR_CASH"
    | "PAYMENT_TEMPLATE_MISMATCH"
    | "BANK_SECTION_INCLUDED_FOR_CASH"
    | "CASH_SECTION_INCLUDED_FOR_BANK_LOAN"
    | "MISSING_REPLY_ALL_NOTICE"
    | "MISSING_POWER_OF_ATTORNEY_NOTICE"
    | "MISSING_RETURN_ADDRESS"
    | "PAST_CONTRACT_DATE"
    | "MANUAL_REVIEW_REQUIRED";

  severity: "low" | "medium" | "high" | "critical";
  message: string;
};
```

## 9.5 TemplateConfig

```ts
type TemplateConfig = {
  id: string;
  templateType: "bank_loan" | "cash";
  subjectTemplate: string;
  bodyTemplate: string;
  documentReturnAddress: string;
  bankFollowUpDays: number;
  prePaymentRatio: number;
  postConstructionPaymentDueDays: number;
  requireReplyAllNotice: boolean;
  requireAttachmentNotice: boolean;
  createdAt: string;
  updatedAt: string;
};
```

---

# 10. 状態遷移

## 10.1 基本フロー

```text
未作成
↓
下書き生成
↓
下書き生成済み
↓
人間確認
↓
承認済み
↓
コピーして送信
↓
送信済み登録
```

## 10.2 ステータス詳細

```text
not_created
draft_generated
pending_review
approved
sent
on_hold
error
```

## 10.3 例外

支払い方法未選択：

```text
not_created → error
```

必須情報不足：

```text
draft_generated → on_hold
```

人間が送信しない判断：

```text
pending_review → on_hold
```

送信済み後に再生成する場合：

```text
sent → 再生成不可
```

再送が必要な場合は、別途 `resend` 概念を将来追加する。

---

# 11. バリデーション要件

## 11.1 必須チェック

以下が未入力の場合、生成をブロックする。

* 顧客名
* 支払い方法
* 契約日
* 担当者名
* アシスタント名
* 署名

## 11.2 テンプレート整合性チェック

支払い方法が `bank_loan` の場合：

* 現金支払いセクションが本文に入っていないこと
* 銀行審査セクションが入っていること

支払い方法が `cash` の場合：

* 銀行審査セクションが本文に入っていないこと
* 現金支払いセクションが入っていること

## 11.3 共通必須文言チェック

以下が本文に含まれているか確認する。

* 契約内容の確認電話
* 委任状
* 印鑑証明書
* 書類送付先
* 現地調査日・工事日が確定次第案内する旨
* 全員に返信
* 全員返信手順の添付案内

## 11.4 日付チェック

* 契約日が未来日ではない
* 契約日から 2 日以上経過している場合は警告
* 現金支払いで工事日が入力されている場合、工事日が過去日ではない
* 工事日前入金期限が過去日ではない

## 11.5 宛先チェック

MVP では送信は行わないが、顧客メールアドレスを入力する場合は以下を確認する。

* `@` が含まれている
* 全角文字がない
* 前後スペースがない
* 社内メールアドレスを顧客欄に入れていないか

---

# 12. AI 利用方針

## 12.1 基本方針

39 メールは定型性が高いため、AI に完全自由生成させない。

基本はテンプレートエンジンで生成し、AI は以下に限定して使う。

* 表記の自然化
* 入力情報の不足検知
* 送信前チェックリスト生成
* 顧客向けに読みやすい微修正
* 余計な断定表現の検知
* 支払い方法と本文の整合性チェック

## 12.2 理由

AI に自由生成させると、以下のリスクがある。

* 支払い条件を誤る
* 銀行借入と現金支払いを混ぜる
* 委任状案内を落とす
* 書類送付先を誤る
* 未確定の工事日を確定済みのように書く
* 不要な約束をする

したがって、MVP では deterministic template first とする。

つまり、

```text
構造化入力
→ 支払い方法でテンプレート選択
→ プレースホルダー差し込み
→ ルールベース検証
→ AI による品質チェック
→ 人間確認
```

の順序にする。

---

# 13. AI 入力 JSON

```json
{
  "emailType": "post_contract_thank_you",
  "templateType": "bank_loan",
  "customer": {
    "name": "〇〇"
  },
  "staff": {
    "salesStaffName": "〇〇",
    "assistantStaffName": "〇〇",
    "ccStaffName": "〇〇"
  },
  "contract": {
    "contractDate": "2026-06-22",
    "paymentType": "bank_loan",
    "constructionDateStatus": "undecided"
  },
  "rules": {
    "sendTiming": "contract_date_or_next_day",
    "bankFollowUpDays": 7,
    "requirePowerOfAttorney": true,
    "requireSealCertificate": true,
    "requireReplyAllNotice": true
  }
}
```

---

# 14. AI 出力 JSON

```json
{
  "subject": "【〇〇様】ご契約のお礼と今後のお手続きについて",
  "body": "〇〇様\n\nお世話になっております...",
  "checklist": [
    "顧客名が正しいか",
    "支払い方法に合ったテンプレートか",
    "担当者が CC に入っているか",
    "委任状の案内が入っているか",
    "全員返信の案内が入っているか"
  ],
  "riskFlags": [],
  "nextTask": {
    "type": "bank_follow_up",
    "dueDate": "2026-06-29",
    "reason": "銀行審査結果の確認"
  }
}
```

---

# 15. UI 要件

## 15.1 画面名

契約後 39 メール生成画面

## 15.2 画面構成

### セクション 1：案件情報

* 顧客名
* 契約日
* 支払い方法

  * 銀行借入
  * 現金支払い
* 担当者名
* アシスタント名
* CC 担当者
* 顧客メールアドレス
* 工事予定日
* 工事予定日未定チェック

### セクション 2：テンプレート分岐プレビュー

支払い方法を選ぶと、どのテンプレートが使われるか表示する。

例：

```text
選択中テンプレート：銀行借入版 39 メール
```

または、

```text
選択中テンプレート：現金支払い版 39 メール
```

### セクション 3：生成ボタン

* 39 メール生成
* 再生成
* リスクチェックのみ実行

### セクション 4：生成結果

* 件名
* 本文
* チェックリスト
* リスク警告
* 次回タスク

### セクション 5：操作

* コピー
* 編集
* 承認済みにする
* 送信済みにする
* 保留にする

---

# 16. API 要件

## 16.1 39 メール生成 API

```http
POST /api/thank-you-email/generate
```

Request：

```json
{
  "customerName": "〇〇",
  "paymentType": "bank_loan",
  "contractDate": "2026-06-22",
  "salesStaffName": "〇〇",
  "assistantStaffName": "〇〇",
  "ccStaffName": "〇〇",
  "customerEmail": "customer@example.com",
  "constructionDate": null,
  "constructionDateStatus": "undecided"
}
```

Response：

```json
{
  "emailId": "email_123",
  "templateType": "bank_loan",
  "subject": "【〇〇様】ご契約のお礼と今後のお手続きについて",
  "body": "〇〇様\n\nお世話になっております...",
  "riskFlags": [],
  "checklist": [
    "支払い方法が銀行借入になっているか",
    "銀行審査の案内が入っているか",
    "委任状の返送案内が入っているか"
  ],
  "nextTask": {
    "type": "bank_follow_up",
    "dueDate": "2026-06-29"
  }
}
```

## 16.2 ステータス更新 API

```http
PATCH /api/thank-you-email/:emailId/status
```

Request：

```json
{
  "status": "approved"
}
```

## 16.3 送信済み登録 API

```http
POST /api/thank-you-email/:emailId/mark-sent
```

Request：

```json
{
  "sentAt": "2026-06-22T15:00:00+09:00",
  "sentBy": "user_123",
  "actualTo": "customer@example.com",
  "actualCc": ["staff@example.com"]
}
```

---

# 17. 監査ログ要件

以下の操作を記録する。

* 39 メール生成
* テンプレートタイプ選択
* 本文編集
* リスクチェック
* 承認
* コピー
* 送信済み登録
* 保留
* 再生成

監査ログ項目：

* 操作日時
* 操作者
* 操作種別
* 対象メール ID
* 対象契約 ID
* 変更前
* 変更後
* リスクフラグ

---

# 18. セキュリティ要件

## 18.1 個人情報

扱う可能性がある情報：

* 顧客名
* メールアドレス
* 契約日
* 支払い方法
* 工事予定日

MVP では、住所・電話番号・契約金額は不要。
不要な個人情報は入力項目に含めない。

## 18.2 AI 連携時の情報最小化

AI に渡す情報は以下に限定する。

* 顧客名
* 支払い方法
* 契約日
* 担当者名
* アシスタント名
* 工事予定日ステータス
* テンプレート本文

渡さない情報：

* 住所
* 電話番号
* 契約金額
* 銀行口座情報
* 本人確認書類
* 印鑑証明書画像

## 18.3 誤送信対策

MVP では自動送信しない。
コピー運用とし、送信は人間がメールソフト上で行う。

---

# 19. 非機能要件

## 19.1 パフォーマンス

* テンプレート生成：1 秒以内
* AI チェック込み生成：10 秒以内
* 画面表示：2 秒以内

## 19.2 可用性

PoC 段階では 24 時間稼働は必須ではない。
業務時間中に安定利用できることを優先する。

## 19.3 保守性

* テンプレート本文はコード直書きしない
* TemplateConfig として管理する
* 書類送付先は設定値化する
* 支払い条件の文言も設定値化する
* 将来的に管理画面から編集できる設計にする

---

# 20. 技術アーキテクチャ案

## 20.1 MVP 技術構成

Frontend：

* Next.js
* React
* TypeScript

Backend：

* Next.js API Routes

Database：

* Supabase PostgreSQL

Auth：

* Supabase Auth

Hosting：

* Vercel

AI：

* OpenAI API または Claude API

Template Engine：

* Handlebars
* Mustache
* 独自の安全な文字列置換

## 20.2 処理フロー

```text
ユーザー入力
↓
必須項目バリデーション
↓
支払い方法でテンプレート選択
↓
プレースホルダー差し込み
↓
ルールベースチェック
↓
AI 品質チェック
↓
生成結果プレビュー
↓
人間編集
↓
コピー
↓
送信済み登録
↓
次回タスク作成
↓
監査ログ保存
```

---

# 21. テストケース

## 21.1 正常系

* 銀行借入を選択すると銀行借入版メールが生成される
* 現金支払いを選択すると現金支払い版メールが生成される
* 顧客名が正しく差し込まれる
* 担当者名が正しく差し込まれる
* CC 担当者名が本文に反映される
* 書類送付先が正しく表示される
* 銀行借入版では銀行審査セクションが入る
* 現金支払い版では現金支払いセクションが入る
* 銀行借入版では 7 日後の銀行確認タスクが作成される
* 現金支払い版で工事日がある場合、工事 7 日前の入金確認タスクが作成される
* 送信済み登録ができる
* 監査ログが保存される

## 21.2 異常系

* 顧客名未入力で生成できない
* 支払い方法未選択で生成できない
* 担当者名未入力で警告
* アシスタント名未入力で警告
* 現金支払いなのに銀行審査文が入っていたら重大警告
* 銀行借入なのに現金支払い文が入っていたら重大警告
* 書類送付先が欠落していたら重大警告
* 全員返信案内が欠落していたら警告
* 契約日が未来日の場合は警告
* 契約日から 2 日以上経過して未送信の場合は警告

## 21.3 境界値

* 顧客名が非常に長い
* 担当者名が複数
* 工事日未定
* 顧客メールアドレス未入力
* CC 未入力
* 契約日が今日
* 契約日が昨日
* 契約日が 3 日前

---

# 22. MVP 受け入れ条件

MVP 完了条件は以下。

* 顧客名、契約日、支払い方法、担当者名を入力できる
* 銀行借入版 / 現金支払い版を自動分岐できる
* 2 種類の 39 メール本文を生成できる
* 件名を生成できる
* 生成文を画面で確認できる
* 人間が本文を編集できる
* コピーできる
* 送信済みにできる
* 送信済み日時と送信者を保存できる
* 銀行借入版では 7 日後の銀行進捗確認タスクを提案できる
* 現金支払い版では工事日前入金確認タスクを提案できる
* リスクチェックリストが表示される
* 誤テンプレート混入を検知できる
* 監査ログが残る

---

# 23. 実装ステップ

## Step 1：静的テンプレート作成

* 銀行借入版テンプレートを作成
* 現金支払い版テンプレートを作成
* プレースホルダーを定義
* TemplateConfig に分離

## Step 2：フォーム UI 作成

* 顧客名
* 支払い方法
* 契約日
* 担当者名
* アシスタント名
* CC 担当者
* 工事予定日
* 顧客メール

## Step 3：テンプレート分岐ロジック

* paymentType による分岐
* bank_loan / cash のテンプレート選択
* 未選択時のエラー

## Step 4：本文生成

* プレースホルダー差し込み
* 件名生成
* 本文生成

## Step 5：ルールベースチェック

* 必須項目
* 支払い方法と文面整合性
* 重要セクション欠落
* 日付

## Step 6：AI 品質チェック

* 不自然な表現
* 断定しすぎ
* 支払い条件混入
* 送信前チェックリスト生成

## Step 7：送信済み管理

* ステータス保存
* sentAt
* sentBy
* actualTo
* actualCc

## Step 8：次回タスク生成

* 銀行借入：送信日 + 7 日
* 現金支払い：工事日 - 7 日
* 工事日未定：工事日確定後に再設定

## Step 9：監査ログ

* 生成
* 編集
* コピー
* 送信済み登録
* 保留

---

# 24. 未確定事項

以下は要確認。

* 件名は現行どおり「【お客様名】」でよいか
* 推奨件名「ご契約のお礼と今後のお手続きについて」に変えてよいか
* アシスタントチーム名は固定か、担当者ごとに変わるか
* CC に入れる担当者は誰か
* 送信者名は誰にするか
* 署名の正式文面
* 顧客メールアドレスはどこから取得するか
* 全員返信手順の添付ファイルは毎回添付するか
* 委任状記入例は毎回添付するか
* 委任状が現地調査日または工事日に渡されるケースをどう表現分岐するか
* すでに契約内容確認電話が完了している場合、該当セクションを残すか削るか
* 銀行審査をすでに開始している場合と、これから開始する場合で文面を分岐するか
* 現金支払いで工事日未定の場合の文面
* 工事予定日の 1 週間前が休日の場合の入金期限の扱い
* 送信済み記録は誰が押すか
* Gmail API 連携はいつ検討するか

---

# 25. 最重要設計判断

この PoC の成功条件は、AI が美しい文章を書くことではない。

重要なのは、契約後 39 メールという小さな業務を、以下の形に変換することである。

```text
契約情報
↓
支払い方法による分岐
↓
正しいテンプレート選択
↓
必要情報の差し込み
↓
送信前チェック
↓
人間確認
↓
コピー送信
↓
送信済み記録
↓
次回タスク作成
```

この流れを作れば、事務員さんの作業置換だけでなく、契約後業務全体をハーネス化する最初の成功体験になる。

まずは 39 メールだけでよい。
対象を広げない。
銀行借入版 / 現金支払い版の 2 分岐を正確に作る。
