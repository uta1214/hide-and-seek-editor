// src/extension.ts
import * as vscode from 'vscode';

interface EditorState {
  tabs: { 
    uri: vscode.Uri; 
    viewColumn: number;
    selection?: vscode.Selection;
    visibleRanges?: readonly vscode.Range[];
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
  animationDuration: number;
  enableButtonAnimation: boolean;
  animationSpeed: number;
}

let savedState: EditorState | null = null;
let statusBarItem: vscode.StatusBarItem;
let isHidden = false;
let isPeeking = false;
let peekTimeout: NodeJS.Timeout | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    statusBarText: config.get('statusBarText', '右側'),
    animationDuration: config.get('animationDuration', 0),
    enableButtonAnimation: config.get('enableButtonAnimation', true),
    animationSpeed: config.get('animationSpeed', 150),
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
  
  // ホバーイベントを設定（プレビュー機能用）
  if (config.enablePeekOnHover) {
    // Note: StatusBarItemにはホバーイベントがないため、tooltipで代替
    // 実際のプレビューはコマンドパレットから実行可能
  }
  
  statusBarItem.show();
}

function updateStatusBar() {
  const config = getConfig();
  
  // hiddenの場合は何もしない
  if (config.statusBarPosition === 'hidden' || !statusBarItem) {
    return;
  }
  
  const text = config.statusBarText;
  const direction = config.hideDirection === 'left' ? '左側' : text;
  
  if (isHidden) {
    statusBarItem.text = `$(expand-all) ${direction}を表示`;
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.warningBackground'
    );
    statusBarItem.tooltip = isPeeking 
      ? 'プレビュー中...'
      : `${direction}エディタグループを復元 (右クリックでプレビュー)`;
  } else {
    statusBarItem.text = `$(collapse-all) ${direction}を隠す`;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.tooltip = `${direction}エディタグループを一時非表示`;
  }
}

async function animateButtonHide() {
  const config = getConfig();
  if (!config.enableButtonAnimation || !statusBarItem) {
    return;
  }

  const colors = [
    'statusBarItem.activeBackground',
    'statusBarItem.prominentBackground',
    'statusBarItem.warningBackground',
  ];

  for (const color of colors) {
    statusBarItem.backgroundColor = new vscode.ThemeColor(color);
    await sleep(config.animationSpeed);
  }
}

async function animateButtonShow() {
  const config = getConfig();
  if (!config.enableButtonAnimation || !statusBarItem) {
    return;
  }

  const colors = [
    'statusBarItem.prominentBackground',
    'statusBarItem.activeBackground',
  ];

  for (const color of colors) {
    statusBarItem.backgroundColor = new vscode.ThemeColor(color);
    await sleep(config.animationSpeed);
  }
  
  // 最後は背景色なしに戻す
  statusBarItem.backgroundColor = undefined;
}

async function hideGroup(context: vscode.ExtensionContext) {
  const config = getConfig();
  
  // 全てのタブグループを取得
  const tabGroups = vscode.window.tabGroups.all;
  
  // 隠す対象のタブを全て収集
  const targetTabs: { tab: vscode.Tab; group: vscode.TabGroup }[] = [];
  
  for (const group of tabGroups) {
    const shouldHide = config.hideDirection === 'left'
      ? group.viewColumn === vscode.ViewColumn.One
      : group.viewColumn !== vscode.ViewColumn.One && group.viewColumn !== undefined;
    
    if (shouldHide) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          targetTabs.push({ tab, group });
        }
      }
    }
  }

  if (targetTabs.length === 0) {
    if (config.showNotifications) {
      const side = config.hideDirection === 'left' ? '左側' : '右側';
      vscode.window.showInformationMessage(`${side}にエディタがありません`);
    }
    return;
  }

  // 現在のアクティブなエディタとvisibleEditorsを保存
  const activeEditor = vscode.window.activeTextEditor;
  const editors = vscode.window.visibleTextEditors;
  const keepSide = config.hideDirection === 'left' 
    ? editors.find((e: vscode.TextEditor) => e.viewColumn && e.viewColumn > vscode.ViewColumn.One)
    : editors.find((e: vscode.TextEditor) => e.viewColumn === vscode.ViewColumn.One);

  // ボタンアニメーション開始
  await animateButtonHide();

  // 状態を保存
  const tabsToSave: EditorState['tabs'] = [];
  
  for (const { tab, group } of targetTabs) {
    const tabInput = tab.input as vscode.TabInputText;
    const correspondingEditor = editors.find(e => 
      e.document.uri.toString() === tabInput.uri.toString()
    );
    
    tabsToSave.push({
      uri: tabInput.uri,
      viewColumn: group.viewColumn!,
      selection: correspondingEditor?.selection,
      visibleRanges: correspondingEditor?.visibleRanges,
      label: tab.label,
    });
  }

  savedState = {
    tabs: tabsToSave,
    activeIndex: activeEditor ? tabsToSave.findIndex(t => 
      t.uri.toString() === activeEditor.document.uri.toString()
    ) : -1,
  };

  // 永続化
  if (config.rememberAcrossSessions) {
    await context.globalState.update('savedEditorState', savedState);
    await context.globalState.update('isHidden', true);
  }

  // アニメーション待機
  if (config.animationDuration > 0) {
    await sleep(config.animationDuration);
  }

  // タブを一気に閉じる（Promise.allで並列実行）
  await Promise.all(
    targetTabs.map(({ tab }) => vscode.window.tabGroups.close(tab))
  );

  // 残った側にフォーカスを戻す
  if (config.autoFocusLeft && keepSide) {
    try {
      await vscode.window.showTextDocument(keepSide.document, {
        viewColumn: keepSide.viewColumn,
        preserveFocus: false,
        preview: false,
      });
    } catch (err) {
      console.error('Failed to focus keep side:', err);
    }
  }

  isHidden = true;
  updateStatusBar();
  
  if (config.showNotifications) {
    const side = config.hideDirection === 'left' ? '左側' : '右側';
    vscode.window.showInformationMessage(`${side}を隠しました (${targetTabs.length}個)`);
  }
}

async function restoreGroup(context: vscode.ExtensionContext, isTemporary: boolean = false) {
  const config = getConfig();
  
  if (!savedState || savedState.tabs.length === 0) {
    if (config.showNotifications && !isTemporary) {
      vscode.window.showInformationMessage('復元する状態がありません');
    }
    return;
  }

  const currentEditor = vscode.window.activeTextEditor;

  // ボタンアニメーション開始（永続復元のみ）
  if (!isTemporary) {
    await animateButtonShow();
  }

  // アニメーション待機
  if (config.animationDuration > 0 && !isTemporary) {
    await sleep(config.animationDuration);
  }

  // タブを一気に復元（Promise.allで並列実行）
  const restorePromises = savedState.tabs.map(async (tabData) => {
    try {
      const editor = await vscode.window.showTextDocument(tabData.uri, {
        viewColumn: tabData.viewColumn,
        preserveFocus: true,
        preview: false,
      });
      
      // スクロール位置を復元
      if (tabData.visibleRanges && tabData.visibleRanges.length > 0) {
        editor.revealRange(tabData.visibleRanges[0], vscode.TextEditorRevealType.AtTop);
      }
      
      // カーソル位置を復元（ただし選択はしない）
      if (tabData.selection) {
        editor.selection = new vscode.Selection(tabData.selection.start, tabData.selection.start);
      }
      
      return true;
    } catch (err) {
      // エラーはコンソールにのみ出力（ユーザーには見せない）
      console.error(`Failed to restore ${tabData.label}:`, err);
      return false;
    }
  });

  const results = await Promise.all(restorePromises);
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
    const count = savedState.tabs.length;
    isHidden = false;
    savedState = null;
    updateStatusBar();

    // 永続化をクリア
    if (config.rememberAcrossSessions) {
      await context.globalState.update('savedEditorState', undefined);
      await context.globalState.update('isHidden', false);
    }

    if (config.showNotifications) {
      const side = config.hideDirection === 'left' ? '左側' : '右側';
      vscode.window.showInformationMessage(`${side}を復元しました (${restoredCount}個)`);
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