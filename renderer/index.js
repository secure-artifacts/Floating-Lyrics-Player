const { ipcRenderer } = require('electron')
const path = require('path')
const { downloadFile } = require('../utils/download.js')
const axios = require('axios')

// 获取 UI 元素引用
const audio = document.getElementById('audio')
const seekBar = document.getElementById('seek-bar')
const currentTime = document.getElementById('current-time')
const totalTime = document.getElementById('total-time')
const themeSelect = document.getElementById('theme-select')
const list = document.getElementById('song-list')
const playBtn = document.getElementById('play-btn')

// 当前正在播放的索引
let currentIndex = 0
// 歌曲列表
let songs = []
// 歌词存放的目录
let lyricsDir = ''

// 获取软件配置，并且初始化界面主题
ipcRenderer.invoke('get-settings').then(settings => {
  if (settings.theme) {
    currentTheme = settings.theme
    document.body.dataset.theme = currentTheme
    themeSelect.value = currentTheme
    ipcRenderer.send('set-theme', currentTheme)
  }
})

// 主题选择变更时应用并保存
themeSelect.addEventListener('change', () => {
  currentTheme = themeSelect.value
  document.body.dataset.theme = currentTheme
  ipcRenderer.send('set-theme', currentTheme)
  ipcRenderer.send('save-settings', { theme: currentTheme })
})

// 获取歌词存放的目录
async function initialize () {
  lyricsDir = await ipcRenderer.invoke('get-lyrics-path')
  loadSongs()
}

// 加载歌曲列表并渲染到页面
async function loadSongs () {
  // 储存到数组中
  songs = await ipcRenderer.invoke('get-songs')
  // 清空列表
  list.innerHTML = ''
  // 循环加载歌曲列表
  songs.forEach((name, index) => {
    const li = document.createElement('li')
    // 删除文件后缀名
    li.textContent = name.replace(/\.(m4a|mp3|wav|ogg)$/i, '')
    li.onclick = () => playSong(index)
    list.appendChild(li)
  })
}

/**
 * @description 播放指定索引的歌曲
 * @param {number} index - 要播放的歌曲在列表中的索引
 */
function playSong (index) {
  currentIndex = index
  const song = songs[index]

  const fullPath = path.join(lyricsDir, song)
  audio.src = `file://${fullPath}`
  audio.play()

  // 播放按钮切换为暂停图标
  const playIcon = playBtn.querySelector('i')
  playIcon.classList.remove('fa-play')
  playIcon.classList.add('fa-pause')

  // 通知主进程播放并应用主题
  ipcRenderer.send('play-song', song)
  currentTheme = themeSelect.value
  ipcRenderer.send('set-theme', currentTheme)

  // 更新歌曲列表中高亮显示
  const listItems = document.querySelectorAll('#song-list li')
  listItems.forEach((li, i) => {
    if (i === index) {
      li.classList.add('playing')
    } else {
      li.classList.remove('playing')
    }
  })
}

// 播放和暂停按钮点击处理
playBtn.onclick = e => {
  const playIcon = playBtn.querySelector('i')
  if (audio.paused) {
    playIcon.classList.remove('fa-play')
    playIcon.classList.add('fa-pause')
    audio.play()
  } else {
    playIcon.classList.remove('fa-pause')
    playIcon.classList.add('fa-play')
    audio.pause()
  }
}

// 上一首按钮
document.getElementById('prev-btn').onclick = () => {
  if (songs.length > 0) {
    currentIndex = (currentIndex - 1 + songs.length) % songs.length
    playSong(currentIndex)
  }
}
// 下一首按钮
document.getElementById('next-btn').onclick = () => {
  if (songs.length > 0) {
    currentIndex = (currentIndex + 1) % songs.length
    playSong(currentIndex)
  }
}
// 音频播放进度更新
audio.ontimeupdate = () => {
  seekBar.max = audio.duration
  seekBar.value = audio.currentTime

  currentTime.textContent = formatTime(audio.currentTime)
  totalTime.textContent = formatTime(audio.duration)
  // 通知歌词窗口当前播放时间
  ipcRenderer.send('update-time', audio.currentTime)
}
// 拖动进度条跳转
seekBar.oninput = () => {
  audio.currentTime = seekBar.value
}
// 格式化时间（转为 mm:ss）
function formatTime (t) {
  if (isNaN(t)) return '00:00'
  const m = Math.floor(t / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}
// 打开歌词文件夹（系统资源管理器）
document.getElementById('open-folder-btn').onclick = () => {
  ipcRenderer.invoke('open-folder')
}
// 从指定 URL 下载歌词和音频
document.getElementById('download-btn').onclick = async () => {
  const baseUrl = document.getElementById('url-input').value.trim()
  if (!baseUrl) return

  const url = new URL(baseUrl)
  const base = baseUrl.replace(/.+\/|.html/g, '')

  const pageRes = await axios.get(baseUrl)
  const html = pageRes.data
  // 获取网页标题
  const titleMatch = html.match(/<title>(.*?)<\/title>/i)
  if (!titleMatch) {
    alert('无法获取页面标题')
    return
  }

  // 格式化标题，用作与文件名称
  let title = titleMatch[1].trim()
  console.log(title)
  title = title.replace(/ -.+|\|.+|[\\/:*?"<>|]/g, '').trim()

  const lrcUrl = `${url.origin}/wp-content/grand-media/lrc/${base}.lrc`
  const m4aUrl = `${url.origin}/wp-content/grand-media/audio/${base}.m4a`

  const dir = lyricsDir

  try {
    await downloadFile(lrcUrl, path.join(dir, `${title}.lrc`), true)
    await downloadFile(m4aUrl, path.join(dir, `${title}.m4a`))
    alert('下载完成')
    loadSongs()
  } catch (e) {
    alert('下载失败：' + e.message)
  }
}

// 播放模式切换
let playMode = 'sequential'
const modeBtn = document.getElementById('mode-btn')
modeBtn.addEventListener('click', () => {
  const modeIcon = modeBtn.querySelector('i')
  if (playMode === 'sequential') {
    playMode = 'loop'
    modeIcon.setAttribute('class', 'fas fa-infinity')
  } else if (playMode === 'loop') {
    playMode = 'shuffle'
    modeIcon.setAttribute('class', 'fas fa-random')
  } else {
    playMode = 'sequential'
    modeIcon.setAttribute('class', 'fas fa-repeat')
  }
})

// 音乐播放结束时，根据播放模式处理
audio.addEventListener('ended', () => {
  if (playMode === 'loop') {
    playSong(currentIndex)
  } else if (playMode === 'shuffle') {
    let next
    do {
      next = Math.floor(Math.random() * songs.length)
    } while (next === currentIndex && songs.length > 1)
    playSong(next)
  } else {
    currentIndex = (currentIndex + 1) % songs.length
    playSong(currentIndex)
  }
})
// 音量控制
const volumeBar = document.getElementById('volume-bar')
volumeBar.addEventListener('input', () => {
  audio.volume = volumeBar.value
})

audio.volume = 1.0

initialize()
