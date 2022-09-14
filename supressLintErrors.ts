import fs from 'fs'
import { execFile } from 'node:child_process'

const main = async (): Promise<void> => {
  const result = await execFileAsync('yarn', ['lint'])
  // const result = fs.readFileSync('./lint.txt', { encoding: 'utf8' })

  const lines = result.split('\n')
  // const regexold = /src\/(.*)\((\d+),(\d+)\): error/
  const regex1 = /^\s*(\d+):(\d+)\s*error(.*?)@typescript-eslint(.*?)$/

  let currentFile = ''
  let currentFileArray: string[] = []
  let linesAdded = 0
  for (const line of lines) {
    if (line.includes('/edge-currency-accountbased/')) {
      if (currentFile.length > 0) {
        fs.writeFileSync(currentFile, currentFileArray.join('\n'), {
          encoding: 'utf8'
        })
      }
      linesAdded = 0
      currentFile = line
      const fileText = fs.readFileSync(currentFile, { encoding: 'utf8' })
      currentFileArray = fileText.split('\n')
      continue
    }

    const matches = regex1.exec(line)
    if (matches == null) continue

    const lineNum = matches[1]
    const errorCode = matches[4]

    console.log(
      `file: ${currentFile}, lineNum: ${lineNum}, errorCode: ${errorCode}`
    )

    const l = Number(lineNum) - 1 + linesAdded

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions

    if (currentFileArray[l - 1].includes(errorCode)) {
      continue
    }

    // If previous line has an eslint-disable on it, just add the error to that line
    if (currentFileArray[l - 1].includes('// eslint-disable-next-line')) {
      // Just add the error code to previous line
      currentFileArray[l - 1] += `, @typescript-eslint${errorCode}`
      continue
    }

    // Insert esline disable line
    currentFileArray.splice(
      l,
      0,
      `// eslint-disable-next-line @typescript-eslint${errorCode}`
    )
    linesAdded++
  }
  if (currentFile.length > 0) {
    fs.writeFileSync(currentFile, currentFileArray.join('\n'), {
      encoding: 'utf8'
    })
  }
}

const execFileAsync = async (cmd: string, args: string[]): Promise<string> => {
  return await new Promise(resolve => {
    execFile(cmd, args, { encoding: 'utf8' }, (_error, stdio, stderr) => {
      let out = ''
      // if (error != null) reject(error)
      if (typeof stdio === 'string') out += stdio
      if (typeof stderr === 'string') out += stderr
      resolve(out)
    })
  })
}

main().catch(e => console.log(e.message))
