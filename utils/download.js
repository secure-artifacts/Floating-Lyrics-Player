const fs = require('fs')
const path = require('path')
const https = require('https')
const iconv = require('iconv-lite')
const chardet = require('chardet')

/**
 * @description 从指定 URL 下载文件到本地路径，可选进行编码转换为 UTF-8 无 BOM 格式
 * @param {string} url - 要下载的文件 URL
 * @param {string} dest - 保存到本地的目标文件路径
 * @param {boolean} [convertEncoding=false] - 是否将文件编码转换为 UTF-8（自动检测原编码，支持 UTF-16 和其他编码）
 * @returns {Promise<void>} - 下载并处理完成后 resolve，若出错则 reject（转码失败不会中断流程）
 */
function downloadFile (url, dest, convertEncoding = false) {
  return new Promise((resolve, reject) => {
    // 创建写入流
    const file = fs.createWriteStream(dest)
    https
      .get(url, response => {
        // 将响应数据写入文件
        response.pipe(file)
        // 文件下载完成后进行转码处理
        file.on('finish', () => {
          file.close(() => {
            if (!convertEncoding) return resolve()

            try {
              const buffer = fs.readFileSync(dest)
              // 检测 BOM
              const bom = buffer.slice(0, 2)
              let encoding = null
              if (bom[0] === 0xff && bom[1] === 0xfe) {
                encoding = 'utf16le'
              } else if (bom[0] === 0xfe && bom[1] === 0xff) {
                encoding = 'utf16be'
              } else {
                encoding = chardet.detect(buffer)?.toLowerCase() || 'utf8'
                if (encoding === 'utf-16') encoding = 'utf16le' // 默认推定为 LE
              }

              if (!iconv.encodingExists(encoding)) {
                throw new Error(`不支持的编码: ${encoding}`)
              }

              // 解码并去除 BOM（iconv 不会自动清除 BOM）
              const decoded = iconv.decode(buffer, encoding).replace(/^\uFEFF/, '')

              // 保存为 UTF-8 无 BOM
              fs.writeFileSync(dest, decoded, { encoding: 'utf8' })

              resolve()
            } catch (err) {
              console.warn(`[转码失败] ${path.basename(dest)}: ${err.message}`)
              resolve() // 不中断流程
            }
          })
        })
      })
      .on('error', err => {
        fs.unlink(dest, () => reject(err))
      })
  })
}

module.exports = { downloadFile }
