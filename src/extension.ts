// src/extension.ts
import * as vscode from 'vscode';

interface EditorState {
  tabs: { 
    uri: vscode.Uri; 
    viewColumn: number;
    selection?: {
      start: { line: number; character: number };
      end: { line: number; character: number };
      active: { line: number; character: number };
    };
    visibleRanges?: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    }[];
    // より正確なスクロール位置の保存
    topVisibleLine?: number;
    label: string;
  }[];
  activeIndex: number;
}

interface Config {
  statusBarPosition: 'left' | 'right' | 'hidden';
  hideDirection: 'right' | 'left';
  enablePeekOnHover: boolean;
  peekDuration: number;
  autoFocusLeft: boolean;
  showNotifications: boolean;
  rememberAcrossSessions: boolean;
  statusBarText: string;
  statusBarActiveColor: string;
}

let savedState: EditorState | null = null;
let statusBarItem: vscode.StatusBarItem;
let isHidden = false;
let isPeeking = false;
let peekTimeout: NodeJS.Timeout | null = null;

export function activate(context: vscode.ExtensionContext) {
  // 永続化された状態を復元
  const config = getConfig();
  if (config.rememberAcrossSessions) {
    const saved = context.globalState.get<EditorState>('savedEditorState');
    const wasHidden = context.globalState.get<boolean>('isHidden');
    if (saved && wasHidden) {
      savedState = saved;
      isHidden = true;
    }
  }

  // ステータスバーアイテム作成
  createStatusBarItem();
  updateStatusBar();

  // コマンド登録
  context.subscriptions.push(
    vscode.commands.registerCommand('hideAndSeekEditor.toggle', async () => {
      if (isHidden) {
        await restoreGroup(context, false);
      } else {
        await hideGroup(context);
      }
    }),
    vscode.commands.registerCommand('hideAndSeekEditor.hide', async () => {
      if (!isHidden) {
        await hideGroup(context);
      }
    }),
    vscode.commands.registerCommand('hideAndSeekEditor.show', async () => {
      if (isHidden) {
        await restoreGroup(context, false);
      }
    }),
    vscode.commands.registerCommand('hideAndSeekEditor.peek', async () => {
      if (isHidden && !isPeeking) {
        await peekGroup(context);
      }
    }),
    statusBarItem
  );

  // 設定変更監視
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
      if (e.affectsConfiguration('hideAndSeekEditor')) {
        createStatusBarItem();
        updateStatusBar();
      }
    })
  );
}

function getConfig(): Config {
  const config = vscode.workspace.getConfiguration('hideAndSeekEditor');
  return {
    statusBarPosition: config.get('statusBarPosition', 'right'),
    hideDirection: config.get('hideDirection', 'right'),
    enablePeekOnHover: config.get('enablePeekOnHover', true),
    peekDuration: config.get('peekDuration', 3000),
    autoFocusLeft: config.get('autoFocusLeft', true),
    showNotifications: config.get('showNotifications', true),
    rememberAcrossSessions: config.get('rememberAcrossSessions', false),
    statusBarText: config.get('statusBarText', 'right editor'),
    statusBarActiveColor: config.get('statusBarActiveColor', 'yellow'),
  };
}

function createStatusBarItem() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  const config = getConfig();
  
  // hiddenの場合はステータスバーを表示しない
  if (config.statusBarPosition === 'hidden') {
    return;
  }
  
  const alignment = config.statusBarPosition === 'left' 
    ? vscode.StatusBarAlignment.Left 
    : vscode.StatusBarAlignment.Right;
  
  statusBarItem = vscode.window.createStatusBarItem(alignment, 100);
  statusBarItem.command = 'hideAndSeekEditor.toggle';
  statusBarItem.show();
}

function getBackgroundColor(colorName: string): vscode.ThemeColor {
  // 確実に動作する色のマッピング
  const colorMap: { [key: string]: string } = {
    'red': 'statusBarItem.errorBackground',
    'yellow': 'statusBarItem.warningBackground',
  };

  const color = colorMap[colorName.toLowerCase()] || colorMap['yellow'];
  return new vscode.ThemeColor(color);
}

function updateStatusBar() {
  const config = getConfig();
  
  // hiddenの場合は何もしない
  if (config.statusBarPosition === 'hidden' || !statusBarItem) {
    return;
  }
  
  const text = config.statusBarText;
  const direction = config.hideDirection === 'left' ? 'left' : text;
  
  if (isHidden) {
    statusBarItem.text = `$(expand-all) Show ${direction}`;
    statusBarItem.backgroundColor = getBackgroundColor(config.statusBarActiveColor);
    statusBarItem.tooltip = isPeeking 
      ? 'Peeking...'
      : `Restore ${direction} editor group (Right-click for preview)`;
  } else {
    statusBarItem.text = `$(collapse-all) Hide ${direction}`;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.tooltip = `Temporarily hide ${direction} editor group`;
  }
}

async function hideGroup(context: vscode.ExtensionContext) {
  const config = getConfig();
  
  // 全てのタブグループを取得
  const tabGroups = vscode.window.tabGroups.all;
  
  // 隠す対象のタブを全て収集(通常のファイルのみ)
  const targetTabs: { tab: vscode.Tab; group: vscode.TabGroup }[] = [];
  
  for (const group of tabGroups) {
    const shouldHide = config.hideDirection === 'left'
      ? group.viewColumn === vscode.ViewColumn.One
      : group.viewColumn !== vscode.ViewColumn.One && group.viewColumn !== undefined;
    
    if (shouldHide) {
      for (const tab of group.tabs) {
        // 通常のファイルのみを対象にする(設定、拡張機能画面などは残す)
        if (tab.input instanceof vscode.TabInputText) {
          targetTabs.push({ tab, group });
        }
      }
    }
  }

  if (targetTabs.length === 0) {
    if (config.showNotifications) {
      const side = config.hideDirection === 'left' ? 'left' : 'right';
      vscode.window.showInformationMessage(`No editors on the ${side} side`);
    }
    return;
  }

  // 現在のアクティブなエディタを記憶
  const activeEditor = vscode.window.activeTextEditor;
  const editors = vscode.window.visibleTextEditors;
  const keepSide = config.hideDirection === 'left' 
    ? editors.find((e: vscode.TextEditor) => e.viewColumn && e.viewColumn > vscode.ViewColumn.One)
    : editors.find((e: vscode.TextEditor) => e.viewColumn === vscode.ViewColumn.One);

  // ステップ1: 全タブを一度アクティブにして位置情報を取得
  const tabsToSave: EditorState['tabs'] = [];
  
  for (const { tab, group } of targetTabs) {
    const tabInput = tab.input as vscode.TabInputText;
    
    try {
      // タブをアクティブにする
      const editor = await vscode.window.showTextDocument(tabInput.uri, {
        viewColumn: group.viewColumn,
        preserveFocus: false,
        preview: false,
      });
      
      // エディタが完全に初期化されるまで待つ（重要！）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 位置情報を取得
      const selection = {
        start: {
          line: editor.selection.start.line,
          character: editor.selection.start.character
        },
        end: {
          line: editor.selection.end.line,
          character: editor.selection.end.character
        },
        active: {
          line: editor.selection.active.line,
          character: editor.selection.active.character
        }
      };
      
      const visibleRanges = editor.visibleRanges?.map(range => ({
        start: { line: range.start.line, character: range.start.character },
        end: { line: range.end.line, character: range.end.character }
      }));
      
      const topVisibleLine = editor.visibleRanges?.[0]?.start.line;
      
      console.log(`Saving ${tabInput.uri.fsPath}:`, {
        topVisibleLine,
        selectionLine: selection.active.line,
        hasVisibleRanges: !!visibleRanges && visibleRanges.length > 0
      });
      
      tabsToSave.push({
        uri: tabInput.uri,
        viewColumn: group.viewColumn!,
        selection,
        visibleRanges,
        topVisibleLine,
        label: tab.label,
      });
      
    } catch (err) {
      console.error(`Failed to get state for ${tabInput.uri.fsPath}:`, err);
      // エラーの場合もエントリを追加（デフォルト位置）
      tabsToSave.push({
        uri: tabInput.uri,
        viewColumn: group.viewColumn!,
        selection: undefined,
        visibleRanges: undefined,
        topVisibleLine: undefined,
        label: tab.label,
      });
    }
  }

  savedState = {
    tabs: tabsToSave,
    activeIndex: activeEditor ? tabsToSave.findIndex(t => 
      t.uri.toString() === activeEditor.document.uri.toString()
    ) : -1,
  };

  // 永続化(非同期だが待たない)
  if (config.rememberAcrossSessions) {
    context.globalState.update('savedEditorState', savedState);
    context.globalState.update('isHidden', true);
  }

  // タブを閉じる前に、最新のタブグループから閉じるべきタブを取得
  const currentTabGroups = vscode.window.tabGroups.all;
  const tabsToClose: vscode.Tab[] = [];
  
  for (const group of currentTabGroups) {
    const shouldHide = config.hideDirection === 'left'
      ? group.viewColumn === vscode.ViewColumn.One
      : group.viewColumn !== vscode.ViewColumn.One && group.viewColumn !== undefined;
    
    if (shouldHide) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          const tabUri = (tab.input as vscode.TabInputText).uri.toString();
          // 保存したタブのみを閉じる
          if (tabsToSave.some(t => t.uri.toString() === tabUri)) {
            tabsToClose.push(tab);
          }
        }
      }
    }
  }
  
  console.log(`Closing ${tabsToClose.length} tabs`);

  // タブを一気に閉じる(Promise.allで並列実行)
  await Promise.all(
    tabsToClose.map(tab => vscode.window.tabGroups.close(tab))
  );

  // 残った側にフォーカスを戻す(非同期だが待たない)
  if (config.autoFocusLeft && keepSide) {
    vscode.window.showTextDocument(keepSide.document, {
      viewColumn: keepSide.viewColumn,
      preserveFocus: false,
      preview: false,
    }).then(undefined, (err: Error) => {
      console.error('Failed to focus keep side:', err);
    });
  }

  isHidden = true;
  updateStatusBar();
  
  if (config.showNotifications) {
    const side = config.hideDirection === 'left' ? 'left' : 'right';
    vscode.window.showInformationMessage(`Hidden ${side} side (${targetTabs.length} file${targetTabs.length !== 1 ? 's' : ''})`);
  }
}

async function restoreGroup(context: vscode.ExtensionContext, isTemporary: boolean = false) {
  const config = getConfig();
  
  if (!savedState || savedState.tabs.length === 0) {
    if (config.showNotifications && !isTemporary) {
      vscode.window.showInformationMessage('No saved state to restore');
    }
    return;
  }

  const currentEditor = vscode.window.activeTextEditor;
  const fileCount = savedState.tabs.length;
  
  // savedStateを定数に保存してnullチェックを回避
  const state = savedState;

  // 一つずつ順番にファイルを開いて位置を復元
  const results: boolean[] = [];
  
  for (const tabData of state.tabs) {
    try {
      // ファイルの存在確認
      try {
        await vscode.workspace.fs.stat(tabData.uri);
      } catch (statErr) {
        console.error(`File does not exist: ${tabData.uri.fsPath}`);
        results.push(false);
        continue;
      }
      
      // ファイルを開く
      const editor = await vscode.window.showTextDocument(tabData.uri, {
        viewColumn: tabData.viewColumn,
        preserveFocus: true,
        preview: false,
      });
      
      console.log(`Opened ${tabData.label}`);
      
      // エディタの初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // カーソル位置を復元
      if (tabData.selection) {
        const anchor = new vscode.Position(
          tabData.selection.start.line,
          tabData.selection.start.character
        );
        const active = new vscode.Position(
          tabData.selection.active.line,
          tabData.selection.active.character
        );
        editor.selection = new vscode.Selection(anchor, active);
        console.log(`  Set cursor to line ${tabData.selection.active.line}`);
      }
      
      // スクロール位置を復元
      if (tabData.topVisibleLine !== undefined) {
        const topLine = new vscode.Position(tabData.topVisibleLine, 0);
        editor.revealRange(
          new vscode.Range(topLine, topLine),
          vscode.TextEditorRevealType.AtTop
        );
        console.log(`  Scrolled to line ${tabData.topVisibleLine}`);
      } else if (tabData.visibleRanges && tabData.visibleRanges.length > 0) {
        const range = tabData.visibleRanges[0];
        const start = new vscode.Position(range.start.line, range.start.character);
        const end = new vscode.Position(range.end.line, range.end.character);
        const visibleRange = new vscode.Range(start, end);
        
        editor.revealRange(visibleRange, vscode.TextEditorRevealType.AtTop);
        console.log(`  Scrolled to range ${range.start.line}-${range.end.line}`);
      }
      
      // 位置が確実に設定されるまで待つ
      await new Promise(resolve => setTimeout(resolve, 30));
      
      results.push(true);
      
    } catch (err) {
      console.error(`Failed to restore ${tabData.label}:`, err);
      results.push(false);
    }
  }
  const restoredCount = results.filter(r => r).length;

  // フォーカスは常に元の場所に戻す
  if (config.autoFocusLeft && currentEditor) {
    try {
      await vscode.window.showTextDocument(currentEditor.document, {
        viewColumn: currentEditor.viewColumn,
        preserveFocus: false,
        preview: false,
      });
    } catch (err) {
      console.error('Failed to restore focus:', err);
    }
  }

  // 永続復元の場合のみ状態をクリア
  if (!isTemporary) {
    isHidden = false;
    savedState = null;
    updateStatusBar();

    // 永続化をクリア
    if (config.rememberAcrossSessions) {
      await context.globalState.update('savedEditorState', undefined);
      await context.globalState.update('isHidden', false);
    }

    if (config.showNotifications) {
      const side = config.hideDirection === 'left' ? 'left' : 'right';
      vscode.window.showInformationMessage(`Restored ${side} side (${fileCount} file${fileCount !== 1 ? 's' : ''})`);
    }
  }
}

async function peekGroup(context: vscode.ExtensionContext) {
  const config = getConfig();
  
  if (!config.enablePeekOnHover || !savedState) {
    return;
  }

  isPeeking = true;
  updateStatusBar();

  // 一時的に復元
  await restoreGroup(context, true);

  // タイマーをセット
  if (peekTimeout) {
    clearTimeout(peekTimeout);
  }

  peekTimeout = setTimeout(async () => {
    // プレビュー時間が経過したら再度隠す
    if (isPeeking && savedState) {
      // 状態を一時保存
      const tempState = savedState;
      
      // タブグループを取得
      const tabGroups = vscode.window.tabGroups.all;
      const tabsToClose: vscode.Tab[] = [];
      
      // 隠すべきタブを収集
      for (const group of tabGroups) {
        const shouldHide = config.hideDirection === 'left'
          ? group.viewColumn === vscode.ViewColumn.One
          : group.viewColumn !== vscode.ViewColumn.One && group.viewColumn !== undefined;
        
        if (shouldHide) {
          for (const tab of group.tabs) {
            // TabInputTextの場合のみURIでマッチング
            if (tab.input instanceof vscode.TabInputText) {
              const tabUri = tab.input.uri.toString();
              if (tempState.tabs.some(t => t.uri.toString() === tabUri)) {
                tabsToClose.push(tab);
              }
            }
          }
        }
      }
      
      // タブを一気に閉じる
      await Promise.all(
        tabsToClose.map(tab => vscode.window.tabGroups.close(tab))
      );

      // 状態を復元
      savedState = tempState;
      isPeeking = false;
      updateStatusBar();
    }
  }, config.peekDuration);
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  if (peekTimeout) {
    clearTimeout(peekTimeout);
  }
}