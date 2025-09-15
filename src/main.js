// main.js
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow;

function wireKeyboardGuards(win) {
  const isMac = process.platform === 'darwin';

  // 메뉴 제거 (메뉴 역할 기반 Reload도 사라짐)
  Menu.setApplicationMenu(null);

  // 키 입력 가로채기
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const cmdOrCtrl = isMac ? input.meta : input.control;
    const key = String(input.key || '').toLowerCase();

    // ✅ F11: 전체화면 토글
    if (key === 'f11') {
      event.preventDefault();
      const now = !win.isFullScreen();
      win.setFullScreen(now);
      return;
    }

    // ✅ 맥 표준: ⌘⌃F 로 전체화면 토글
    if (isMac && input.meta && input.control && key === 'f') {
      event.preventDefault();
      toggleFullscreen();
      return;
    }

    // 🔒 리로드 차단: Cmd/Ctrl+R, Cmd/Ctrl+Shift+R, F5
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
    show: false,               // 준비되면 보여주기 (깜빡임 방지)
    fullscreen: true,          // 시작 시 전체화면
    autoHideMenuBar: true,     // Windows/Linux 메뉴바 자동 숨김
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

  // 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 키 가드(리로드 차단 + F11 토글)
  wireKeyboardGuards(mainWindow);

  // 개발 모드에서는 개발자 도구 열기
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

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

// IPC 통신 핸들러들 (예시)
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// ✅ 여기 추가: 렌더러에서 invoke('quit-app') 호출 시 앱 종료
ipcMain.handle('quit-app', () => {
  app.quit();
});

// 앱 종료 시 정리
app.on('before-quit', () => {
  // 데이터 저장 등의 정리 작업
});
