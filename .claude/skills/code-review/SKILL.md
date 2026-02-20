---
name: code-review
description: Code Review 工具。分析 git diff 中的變更，依據專案規範提出審查意見，完成分析後需二次確認才執行修改。
user_invocable: true
metadata:
  version: "2.0"
  framework: reactjs
---

# Code Review

## 流程

### 步驟 1：收集變更

執行 `git diff` 取得當前所有未暫存的變更。若使用者有指定檔案或範圍，則只分析該範圍。

### 步驟 2：逐檔分析

針對每個變更檔案，檢查以下項目：

#### 正確性
- 邏輯是否正確，有無遺漏的邊界條件
- 是否有殘留的 dead code、未使用的 import、未清理的註解
- hooks 相依陣列是否正確（useEffect、useMemo、useCallback 的 deps）
- useEffect 是否有正確的 cleanup function（清除 timer、取消訂閱、移除 event listener）
- 元件是否有 key prop 問題（列表渲染缺少 key 或使用 index 作為 key）

#### 一致性
- 命名是否符合專案慣例（boolean 用 is/has/can 前綴、事件回呼 prop 用 on 前綴、handler 用 handle 前綴、hook 用 use 前綴）
- 是否與周邊程式碼風格一致
- 型別定義是否放在正確位置（types.ts）

#### 安全性
- 是否有潛在的記憶體洩漏（未清理的 subscription、timer、event listener）
- 是否有不安全的型別轉換（as any、型別斷言）
- 是否有 XSS 風險（dangerouslySetInnerHTML）

#### 簡潔性
- 是否有可以簡化的邏輯
- 是否有不必要的中間變數
- 是否有可以用 useMemo/useCallback 優化的部分

### 步驟 3：輸出審查報告

使用以下格式輸出：

```
## Code Review 報告

### [檔案路徑]

**[問題等級]** 問題描述
- 位置：L行號
- 建議：具體修改建議

---
問題等級：
- MUST FIX — 必須修正（邏輯錯誤、記憶體洩漏、安全問題）
- SUGGESTION — 建議改善（可讀性、一致性、簡潔性）
- NITPICK — 小建議（命名、格式）
- GOOD — 值得肯定的改動
```

### 步驟 4：二次確認

報告輸出後，使用 AskUserQuestion 工具詢問使用者：
- 哪些項目要執行修改
- 哪些項目忽略

**在使用者明確回覆前，不得進行任何程式碼修改。**
