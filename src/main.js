const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: path.join(__dirname, '../assets/icon.png'), // 아이콘 파일이 있다면
    title: '축제 주점 테이블 관리 시스템'
  });

  // HTML 파일 로드
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

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

// IPC 통신 핸들러들
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 앱 종료 시 정리
app.on('before-quit', () => {
  // 데이터 저장 등의 정리 작업
});
