// main.js
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow;

function blockReloadAccelerators(win) {
  const isMac = process.platform === 'darwin';

  // 메뉴 제거 (메뉴 역할 기반 Reload 항목도 제거)
  Menu.setApplicationMenu(null);

  // 단축키 기반 리로드 차단: Cmd/Ctrl+R, Cmd/Ctrl+Shift+R, F5
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const cmdOrCtrl = isMac ? input.meta : input.control;
    const key = String(input.key || '').toLowerCase();

    const isReload =
      (cmdOrCtrl && key === 'r') ||
      (cmdOrCtrl && input.shift && key === 'r') ||
      key === 'f5';

    if (isReload) {
      event.preventDefault();
    }
  });
}

function createWindow() {
  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    show: false,              // 준비되면 보여주기 (깜빡임 방지)
    fullscreen: true,         // 시작 시 전체화면
    autoHideMenuBar: true,    // Windows/Linux 메뉴바 자동 숨김
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,  // 프로젝트에서 remote를 쓰고 있다면 유지
      webSecurity: false
    },
    icon: path.join(__dirname, '../assets/icon.png'), // 아이콘 파일이 있다면
    title: '축제 주점 테이블 관리 시스템'
  });

  // HTML 파일 로드
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 준비되면 표시 (전체화면 상태로)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 개발 모드에서는 개발자 도구 열기
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 리로드 단축키 차단
  blockReloadAccelerators(mainWindow);

  // 윈도우가 닫힐 때
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 앱이 준비되면 윈도우 생성
app.whenReady().then(createWindow);

// 모든 윈도우가 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS에서 독 아이콘 클릭 시 윈도우 재생성
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC 통신 핸들러들
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 앱 종료 시 정리
app.on('before-quit', () => {
  // 데이터 저장 등의 정리 작업
});

ipcMain.handle('quit-app', () => {
  app.quit();
});