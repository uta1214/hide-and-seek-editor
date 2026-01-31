# Hide and Seek Editor

A small VS Code extension that lets you temporarily hide editor groups and bring them back when you need them. Useful when working with split screens or limited space.

---

## Features

* Toggle editor visibility with a single command
* Hide editor groups without closing files
* Quickly restore them with cursor and scroll positions preserved
* Optional notifications
* Settings can be remembered across sessions

---

## Commands

| Command                    | Description                    |
| -------------------------- | ------------------------------ |
| `hideAndSeekEditor.toggle` | Toggle hide/show editor groups |

---

## Keyboard Shortcuts

Default keybindings:

| OS              | Shortcut         | Command          |
| --------------- | ---------------- | ---------------- |
| Windows / Linux | `Ctrl + Alt + H` | Toggle hide/show |
| macOS           | `Cmd + Alt + H`  | Toggle hide/show |

You can customize these shortcuts in VS Code via **Preferences → Keyboard Shortcuts**.

---

## Usage

1. Open multiple editors or split the editor view
2. Run **Hide and Seek Editor: Toggle** from the Command Palette or use the keyboard shortcut
3. The editor area is hidden, giving you more space
4. Run the command again to restore it with the exact cursor and scroll positions

You can also use the status bar button to toggle.

---

## Configuration

This extension provides the following settings:

| Setting                                    | Default | Description                                                                                                          |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `hideAndSeekEditor.statusBarPosition`      | `right` | Status bar button position (`left`, `right`, `hidden`)                                                               |
| `hideAndSeekEditor.hideDirection`          | `right` | Which editor group to hide (`right` / `left`)                                                                        |
| `hideAndSeekEditor.autoFocusLeft`          | `true`  | Automatically focus the remaining editor when hiding                                                                |
| `hideAndSeekEditor.showNotifications`      | `true`  | Show notifications on actions                                                                                        |
| `hideAndSeekEditor.rememberAcrossSessions` | `false` | Remember hidden state across VS Code restarts                                                                        |
| `hideAndSeekEditor.statusBarText`          | `auto`  | Text shown in the status bar button: 'auto' = icon + hideDirection value, other = icon + custom text (empty = icon only) |
| `hideAndSeekEditor.statusBarActiveColor`   | `yellow`| Status bar button color when hidden (`red` / `yellow`)                                                               |

---

## Installation

* Install from the VS Code Marketplace
* Or clone this repository and run `vsce package`

---

## License

MIT License

---

# 日本語 (Japanese)

エディタ分割を一時的に隠して、必要なときにすぐ戻せる VS Code 拡張機能です。画面を広く使いたいときに便利です。

---

## 機能

* ワンコマンドでエディタ表示を切り替え
* ファイルを閉じずにエディタグループを非表示
* カーソル位置とスクロール位置を保持して復元
* 通知のオン・オフ
* 状態をセッション間で保持可能

---

## コマンド

| コマンド                       | 説明               |
| -------------------------- | ---------------- |
| `hideAndSeekEditor.toggle` | エディタの表示・非表示を切り替え |

---

## キーボードショートカット

デフォルトのショートカット:

| OS              | ショートカット          | 内容          |
| --------------- | ---------------- | ----------- |
| Windows / Linux | `Ctrl + Alt + H` | 表示・非表示を切り替え |
| macOS           | `Cmd + Alt + H`  | 表示・非表示を切り替え |

VS Code の **設定 → キーボードショートカット** から自由に変更できます。

---

## 使い方

1. エディタを分割して作業する
2. コマンドパレットから **Hide and Seek Editor: Toggle** を実行、またはキーボードショートカットを使用
3. エディタ領域が隠れて作業スペースが広がる
4. もう一度実行すると、カーソル位置とスクロール位置を保持したまま元に戻る

ステータスバーのボタンでも切り替えられます。

---

## 設定

以下の設定項目があります:

| 設定名                                        | 初期値     | 説明                                                                             |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------ |
| `hideAndSeekEditor.statusBarPosition`      | `right` | ステータスバーのボタン位置 (`left` / `right` / `hidden`)                                      |
| `hideAndSeekEditor.hideDirection`          | `right` | 隠すエディタ側 (`right` / `left`)                                                        |
| `hideAndSeekEditor.autoFocusLeft`          | `true`  | 隠す時に残ったエディタへ自動フォーカス                                                              |
| `hideAndSeekEditor.showNotifications`      | `true`  | 操作時の通知表示                                                                       |
| `hideAndSeekEditor.rememberAcrossSessions` | `false` | 再起動後も状態を保持                                                                     |
| `hideAndSeekEditor.statusBarText`          | `auto`  | ステータスバー表示テキスト: 'auto'=アイコン+hideDirectionの値、その他=アイコン+カスタムテキスト（空=アイコンのみ） |
| `hideAndSeekEditor.statusBarActiveColor`   | `yellow`| 隠しているときのボタンの色 (`red` / `yellow`)                                                |

---

## インストール

* VS Code Marketplace からインストール
* またはリポジトリを clone して `vsce package`

---

## ライセンス

MIT License