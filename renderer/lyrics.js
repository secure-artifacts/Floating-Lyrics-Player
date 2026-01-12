const fs = require('fs')
const path = require('path')
const { ipcRenderer } = require('electron')

// 存储解析后的歌词数组，每一项包含时间和文本
let lyrics = []

// 当前显示的歌词索引
let currentIndex = -1

// 获取显示歌词的滚动容器元素
const scrollContainer = document.getElementById('scroll-container')

// 歌词文件所在的目录路径
let lyricsDir = ''

// 获取歌词文件夹路径
ipcRenderer.invoke('get-lyrics-path').then(path => {
  lyricsDir = path
})


// 接收播放歌曲事件，参数是歌曲名称
ipcRenderer.on('play-song', (event, songName) => {
  if (!lyricsDir) {
    console.error('未设置歌词目录')
    return
  }

  // 将歌曲文件名称转换为歌词文件名称
  const lrcPath = path.join(lyricsDir, songName.replace(/\.(m4a|mp3|wav|ogg)$/, '.lrc'))

  // 检查歌词文件是否存在
  if (fs.existsSync(lrcPath)) {
    const content = fs.readFileSync(lrcPath, 'utf-8')
    // 解析 LRC 歌词内容
    parseLRC(content)
    // 初始化渲染歌词行
    renderInitialLines()
  } else {
    // 歌词文件不存在，清空歌词显示
    scrollContainer.innerHTML = ''
    lyrics = []
    console.warn('歌词文件不存在:', lrcPath)
  }
})

// 接收更新时间，实时传输播放时间
ipcRenderer.on('update-time', (event, time) => {
  if (lyrics.length === 0) return

  // 查找当前播放时间对应的歌词行索引
  const i = lyrics.findIndex((l, idx) => time >= l.time && (idx === lyrics.length - 1 || time < lyrics[idx + 1].time))
  // 如果找到了不同于当前索引的行，更新显示
  if (i !== -1 && i !== currentIndex) {
    currentIndex = i
    // 更新滚动位置
    updateScroll()
  }
})

// 解析 LRC 格式歌词

/**
 * @description 解析 LRC 格式歌词
 * @param {string} content - 原始 LRC 歌词文本
 */
function parseLRC (content) {
  lyrics = content
    .split('\n')
    .map(line => {
      const match = line.match(/\[(\d+):(\d+\.\d+)\](.+)/)
      if (!match) return null
      const time = parseInt(match[1]) * 60 + parseFloat(match[2])
      return { time, text: match[3] }
    })
    .filter(Boolean)
  currentIndex = -1
}

// 初始化渲染所有歌词行
function renderInitialLines () {
  scrollContainer.innerHTML = ''
  for (let i = 0; i < lyrics.length; i++) {
    const div = document.createElement('div')
    div.className = 'line'
    div.textContent = lyrics[i].text
    scrollContainer.appendChild(div)
  }
  scrollContainer.style.transform = 'translateY(0)'
}

// 更新滚动歌词
function updateScroll () {
  const allLines = scrollContainer.children
  Array.from(allLines).forEach(line => line.classList.remove('active'))

  const currentLine = allLines[currentIndex]
  if (currentLine) {
    currentLine.classList.add('active')
    scrollContainer.style.transform = `translateY(-${50 * currentIndex}px)`
  }
}

// 接收应用主题颜色，修改歌词字体颜色
ipcRenderer.on('apply-theme', (event, theme) => {
  const colorMap = {
    'sky-blue': '#0089f3',
    amber: '#ffb300',
    'cyan-blue': '#00acc1',
    'raspberry-pink': '#d81b60',
    lime: '#7cb342',
    'tomato-red': '#ff5454',
    'dark-teal-gray': '#4c5455',
    'hot-pink': '#ff56b2'
  }
  const color = colorMap[theme] || 'white'
  document.querySelectorAll('.line').forEach(line => {
    line.style.color = color
  })
})
