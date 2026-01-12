const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const currentYear = new Date().toLocaleString('en', { year: 'numeric' })

const template = [
  {
    label: '悬浮歌词播放器',
    submenu: [
      {
        label: `关于 悬浮歌词播放器`,
        click: () => {
          dialog.showMessageBox({
            title: `关于 悬浮歌词播放器`,
            message: `悬浮歌词播放器`,
            detail: `Version ${app.getVersion()}\n\nCopyright © 2025-${currentYear} Raz1ner\nAll Rights Reserved.`,
            icon: process.platform === 'darwin' ? 'build/icon.icns' : 'build/icon.ico'
          })
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit()
        }
      }
    ]
  },
  {
    label: '编辑',
    submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }]
  }
]

const isMac = process.platform === 'darwin'
if (isMac) {
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 用户数据目录
const userDataPath = app.getPath('userData')

// 配置文件路径
const settingsPath = path.join(userDataPath, 'settings.json')

// 歌词文件夹路径
const lyricsPath = path.join(userDataPath, 'lyrics')
// 如果歌词文件夹不存在，则创建该文件夹
if (!fs.existsSync(lyricsPath)) {
  fs.mkdirSync(lyricsPath, { recursive: true })
}

// 读取软件配置
ipcMain.handle('get-settings', () => {
  if (fs.existsSync(settingsPath)) {
    // 读取并解析 JSON
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
  } else {
    // 默认主题
    return { theme: 'sky-blue' }
  }
})

// 保存设置
ipcMain.on('save-settings', (event, newSettings) => {
  fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2), 'utf-8')
})

let mainWindow, lyricWindow

// 创建播放器窗口
function createMainWindow () {
  const menuOptions = !isMac
    ? {
        menu: null, // 明确告诉 Electron 不要加载任何菜单
        autoHideMenuBar: true // 自动隐藏菜单栏
      }
    : {}
  mainWindow = new BrowserWindow({
    width: 600,
    height: 770,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    ...menuOptions
  })
  // 加载界面
  mainWindow.loadFile('renderer/index.html')
  // mainWindow.webContents.openDevTools()
  // 当播放器窗口关闭时，同时关闭悬浮歌词窗口
  mainWindow.on('closed', () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.close()
    }
    lyricWindow = null
    mainWindow = null
  })
}

// 创建悬浮歌词窗口
function createLyricWindow () {
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

  lyricWindow = new BrowserWindow({
    width: 600,
    height: 100,
    x: Math.floor((width - 600) / 2), // 居中显示
    y: 40, // 靠近顶部
    frame: false, // 无边框
    transparent: true, // 透明背景
    alwaysOnTop: true, // 置顶窗口
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  // 加载悬浮歌词界面
  lyricWindow.loadFile('renderer/lyrics.html')
  // lyricWindow.webContents.openDevTools()
}

// 获取歌词文件夹路径
ipcMain.handle('get-lyrics-path', () => {
  return lyricsPath
})

// 获取所有歌词文件
ipcMain.handle('get-songs', () => {
  const files = fs.readdirSync(lyricsPath).filter(f => f.endsWith('.m4a') || f.endsWith('.mp3') || f.endsWith('.wav'))
  return files
})

// 打开歌词文件夹
ipcMain.handle('open-folder', () => {
  shell.openPath(lyricsPath)
})

// 软件启动后创建播放器和悬浮歌词窗口
app.whenReady().then(() => {
  createMainWindow()
  createLyricWindow()
})

// 播放歌曲时，转发给悬浮歌词窗口
ipcMain.on('play-song', (e, song) => {
  if (lyricWindow) {
    lyricWindow.webContents.send('play-song', song)
  }
})

// 更新当前播放时间，发送给悬浮歌词窗口同步显示
ipcMain.on('update-time', (e, time) => {
  if (lyricWindow) {
    lyricWindow.webContents.send('update-time', time)
  }
})

// 设置主题颜色，发送给悬浮歌词窗口应用主题样式
ipcMain.on('set-theme', (event, theme) => {
  if (lyricWindow && lyricWindow.webContents) {
    lyricWindow.webContents.send('apply-theme', theme)
  }
})
