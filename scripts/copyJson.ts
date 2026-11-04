import * as fs from 'fs'
import path from 'node:path'

/**
 * Copy every JSON file under src/ into lib/, beside the JavaScript sucrase
 * writes there.
 *
 * sucrase compiles TypeScript only, so a JSON file a module imports is missing
 * from the Node build, and the import fails under Node with "Cannot find
 * module". The webpack chunks the app loads inline their JSON, so only Node
 * consumers would see it.
 */
const copyJson = (from: string, to: string): void => {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    // Dotfiles such as src/.eslintrc.json configure tools, not the package.
    if (entry.name.startsWith('.')) continue
    const source = path.join(from, entry.name)
    const target = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyJson(source, target)
    } else if (entry.name.endsWith('.json')) {
      fs.mkdirSync(to, { recursive: true })
      fs.copyFileSync(source, target)
    }
  }
}

copyJson('src', 'lib')
