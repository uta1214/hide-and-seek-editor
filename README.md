# Hide and Seek Editor

A small VS Code extension that lets you temporarily hide editor groups and bring them back when you need them. Useful when working with split screens or limited space.

---

## Features

* Toggle editor visibility with a single command
* Hide editor groups without closing files
* Quickly show them again ("peek" style)
* Optional notifications
* Settings can be remembered across sessions

---

## Commands

| Command                    | Description                    |
| -------------------------- | ------------------------------ |
| `hideAndSeekEditor.toggle` | Toggle hide/show editor groups |
| `hideAndSeekEditor.hide`   | Hide editor groups             |
| `hideAndSeekEditor.show`   | Show hidden editor groups      |
| `hideAndSeekEditor.peek`   | Temporarily show editor groups |

---

## Keyboard Shortcuts

Default keybindings:

| OS              | Shortcut         | Command          |
| --------------- | ---------------- | ---------------- |
| Windows / Linux | `Ctrl + Alt + H` | Toggle hide/show |
| macOS           | `Cmd + Alt + H`  | Toggle hide/show |

You can customize these shortcuts in VS Code via **Preferences → Keyboard Shortcuts**.

--------|-------------|
| `hideAndSeekEditor.toggle` | Toggle hide/show editor groups |
| `hideAndSeekEditor.hide` | Hide editor groups |
| `hideAndSeekEditor.show` | Show hidden editor groups |
| `hideAndSeekEditor.peek` | Temporarily show editor groups |

---

## Usage

1. Open multiple editors or split the editor view
2. Run **Hide and Seek Editor: Toggle** from the Command Palette
3. The editor area is hidden, giving you more space
4. Run the command again to restore it

You can bind these commands to keyboard shortcuts for faster access.

---

## Configuration

This extension provides the following settings:

| Setting                                    | Default | Description                                            |
| ------------------------------------------ | ------- | ------------------------------------------------------ |
| `hideAndSeekEditor.statusBarPosition`      | `right` | Status bar button position (`left`, `right`, `hidden`) |
| `hideAndSeekEditor.hideDirection`          | `right` | Which editor group to hide (`right` / `left`)          |
| `hideAndSeekEditor.enablePeekOnHover`      | `true`  | Enable peek preview feature                            |
| `hideAndSeekEditor.peekDuration`           | `3000`  | Peek display duration (ms)                             |
| `hideAndSeekEditor.autoFocusLeft`          | `true`  | Auto-focus left editor when hiding                     |
| `hideAndSeekEditor.showNotifications`      | `true`  | Show notifications on actions                          |
| `hideAndSeekEditor.rememberAcrossSessions` | `false` | Remember hidden state across restarts                  |
| `hideAndSeekEditor.statusBarText`          | `右側`    | Text shown in the status bar                           |
| `hideAndSeekEditor.animationDuration`      | `0`     | Transition delay in ms (0 = disabled)                  |
| `hideAndSeekEditor.enableButtonAnimation`  | `true`  | Enable button color animation                          |
| `hideAndSeekEditor.animationSpeed`         | `150`   | Button animation speed (ms)                            |

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
* 一時表示（ピーク表示）対応
* 通知のオン／オフ
* 状態をセッション間で保持可能

---

## コマンド

| コマンド                       | 説明               |
| -------------------------- | ---------------- |
| `hideAndSeekEditor.toggle` | エディタの表示／非表示を切り替え |
| `hideAndSeekEditor.hide`   | エディタを非表示にする      |
| `hideAndSeekEditor.show`   | エディタを再表示する       |
| `hideAndSeekEditor.peek`   | 一時的にエディタを表示      |

---

## キーボードショートカット

デフォルトのショートカット:

| OS              | ショートカット          | 内容          |
| --------------- | ---------------- | ----------- |
| Windows / Linux | `Ctrl + Alt + H` | 表示／非表示を切り替え |
| macOS           | `Cmd + Alt + H`  | 表示／非表示を切り替え |

VS Code の **設定 → キーボードショートカット** から自由に変更できます。

---------|------|
| `hideAndSeekEditor.toggle` | エディタの表示／非表示を切り替え |
| `hideAndSeekEditor.hide` | エディタを非表示にする |
| `hideAndSeekEditor.show` | エディタを再表示する |
| `hideAndSeekEditor.peek` | 一時的にエディタを表示 |

---

## 使い方

1. エディタを分割して作業する
2. コマンドパレットから **Hide and Seek Editor: Toggle** を実行
3. エディタ領域が隠れて作業スペースが広がる
4. もう一度実行すると元に戻る

キーボードショートカットに割り当てるのがおすすめです。

---

## 設定

以下の設定項目があります:

| 設定名                                        | 初期値     | 説明                                          |
| ------------------------------------------ | ------- | ------------------------------------------- |
| `hideAndSeekEditor.statusBarPosition`      | `right` | ステータスバーのボタン位置 (`left` / `right` / `hidden`) |
| `hideAndSeekEditor.hideDirection`          | `right` | 隠すエディタ側 (`right` / `left`)                  |
| `hideAndSeekEditor.enablePeekOnHover`      | `true`  | プレビュー機能を有効化                                 |
| `hideAndSeekEditor.peekDuration`           | `3000`  | プレビュー表示時間 (ms)                              |
| `hideAndSeekEditor.autoFocusLeft`          | `true`  | 隠す時に左エディタへ自動フォーカス                           |
| `hideAndSeekEditor.showNotifications`      | `true`  | 操作時の通知表示                                    |
| `hideAndSeekEditor.rememberAcrossSessions` | `false` | 再起動後も状態を保持                                  |
| `hideAndSeekEditor.statusBarText`          | `右側`    | ステータスバー表示テキスト                               |
| `hideAndSeekEditor.animationDuration`      | `0`     | 切り替え待機時間(ms)                                |
| `hideAndSeekEditor.enableButtonAnimation`  | `true`  | ボタンアニメーション有効化                               |
| `hideAndSeekEditor.animationSpeed`         | `150`   | アニメーション速度(ms)                               |

---

## インストール

* VS Code Marketplace からインストール
* またはリポジトリを clone して `vsce package`

---

## ライセンス

MIT License
