/**
 * The Sapling proving parameters a Pirate Chain spend needs. The Android SDK
 * binary (react-native-pirate-wallet-android-external) ships without them to
 * stay under the Play Store size cap, so the plugin downloads them once into
 * app storage and passes their paths to `initializeSaplingParameters`. These
 * are the Zcash ceremony files, byte-identical to the copy the iOS binary
 * embeds.
 */
export interface SaplingParamFile {
  name: string
  sha256: string
}

/**
 * The file operations the download needs, so tests can run it against a fake
 * disk. The React Native host backs it with react-native-file-access.
 */
export interface SaplingParamsDisk {
  exists: (path: string) => Promise<boolean>
  /** Saves `url` to `path`, rejecting on a non-2xx response. */
  download: (url: string, path: string) => Promise<void>
  /** Lower-case hex SHA-256 of the file at `path`. */
  hashSha256: (path: string) => Promise<string>
  /** Rejects when `path` already exists. */
  mkdir: (path: string) => Promise<void>
  mv: (source: string, target: string) => Promise<void>
  unlink: (path: string) => Promise<void>
}

export const SAPLING_PARAMS_BASE_URL = 'https://download.z.cash/downloads/'

export const SAPLING_SPEND_PARAMS = 'sapling-spend.params'
export const SAPLING_OUTPUT_PARAMS = 'sapling-output.params'

export const SAPLING_PARAM_FILES: SaplingParamFile[] = [
  {
    name: SAPLING_SPEND_PARAMS,
    sha256: '8e48ffd23abb3a5fd9c5589204f32d9c31285a04b78096ba40a79b75677efc13'
  },
  {
    name: SAPLING_OUTPUT_PARAMS,
    sha256: '2f0ebbcbb9bb0bcffe95a397e7eba89c29eb4dde6191c339db88570e3f3fb0e4'
  }
]

/**
 * Makes sure `dir` holds every parameter file with its published hash. A file
 * that is missing or does not match is downloaded again; the download lands
 * beside the target and only replaces it once its hash checks out, so an
 * interrupted download never leaves a partial file under the real name.
 */
export async function ensureSaplingParams(
  disk: SaplingParamsDisk,
  dir: string,
  files: SaplingParamFile[] = SAPLING_PARAM_FILES,
  baseUrl: string = SAPLING_PARAMS_BASE_URL
): Promise<void> {
  if (!(await disk.exists(dir))) await disk.mkdir(dir)
  for (const file of files) {
    const path = `${dir}/${file.name}`
    if ((await disk.exists(path)) && (await hashMatches(disk, path, file))) {
      continue
    }
    const partialPath = `${path}.download`
    await removeIfPresent(disk, partialPath)
    try {
      await disk.download(`${baseUrl}${file.name}`, partialPath)
    } catch (error: unknown) {
      await removeIfPresent(disk, partialPath)
      throw error
    }
    if (!(await hashMatches(disk, partialPath, file))) {
      await removeIfPresent(disk, partialPath)
      throw new Error(
        `Downloaded ${file.name} does not match its published SHA-256`
      )
    }
    await removeIfPresent(disk, path)
    await disk.mv(partialPath, path)
  }
}

/**
 * The parameter directory and disk operations on a React Native host. Only
 * called there: react-native-file-access is a peer dependency the app
 * installs, so it is required lazily.
 */
export function makeFileAccessDisk(): {
  disk: SaplingParamsDisk
  documentDir: string
} {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fileAccess: FileAccessModule = require('react-native-file-access')
  const { Dirs, FileSystem } = fileAccess
  return {
    documentDir: Dirs.DocumentDir,
    disk: {
      exists: async path => await FileSystem.exists(path),
      download: async (url, path) => {
        const response = await FileSystem.fetch(url, { method: 'GET', path })
        if (!response.ok) {
          throw new Error(
            `Download of ${url} failed with HTTP ${response.status}`
          )
        }
      },
      hashSha256: async path => await FileSystem.hash(path, 'SHA-256'),
      mkdir: async path => {
        await FileSystem.mkdir(path)
      },
      mv: async (source, target) => await FileSystem.mv(source, target),
      unlink: async path => await FileSystem.unlink(path)
    }
  }
}

/** The part of react-native-file-access the download uses. */
interface FileAccessModule {
  Dirs: { DocumentDir: string }
  FileSystem: {
    exists: (path: string) => Promise<boolean>
    fetch: (
      resource: string,
      init: { method: string; path: string }
    ) => Promise<{ ok: boolean; status: number }>
    hash: (path: string, algorithm: 'SHA-256') => Promise<string>
    mkdir: (path: string) => Promise<string>
    mv: (source: string, target: string) => Promise<void>
    unlink: (path: string) => Promise<void>
  }
}

async function hashMatches(
  disk: SaplingParamsDisk,
  path: string,
  file: SaplingParamFile
): Promise<boolean> {
  const hash = await disk.hashSha256(path)
  return hash.toLowerCase() === file.sha256
}

async function removeIfPresent(
  disk: SaplingParamsDisk,
  path: string
): Promise<void> {
  if (await disk.exists(path)) await disk.unlink(path)
}
