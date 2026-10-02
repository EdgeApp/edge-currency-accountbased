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
  /** Saves `url` to `path`, rejecting on a non-2xx response or a stall. */
  download: (url: string, path: string) => Promise<void>
  /** Lower-case hex SHA-256 of the file at `path`. */
  hashSha256: (path: string) => Promise<string>
  /** Rejects when `path` already exists. */
  mkdir: (path: string) => Promise<void>
  mv: (source: string, target: string) => Promise<void>
  unlink: (path: string) => Promise<void>
}

/** A download the caller can abandon, as `FileSystem.fetchManaged` returns. */
export interface ManagedDownload {
  cancel: () => Promise<void>
  result: Promise<{ ok: boolean; status: number }>
}

/** Starts saving `resource` to `init.path`, reporting each chunk received. */
export type FetchManaged = (
  resource: string,
  init: { method: string; path: string },
  onProgress: () => void
) => ManagedDownload

export const SAPLING_PARAMS_BASE_URL = 'https://download.z.cash/downloads/'

/**
 * How long a download may receive nothing before it is abandoned. React
 * Native's Android HTTP client sets no connect or read timeout of its own.
 */
export const DOWNLOAD_STALL_TIMEOUT_MS = 30000

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
 * Saves `url` to `path`, rejecting on a non-2xx response or once
 * `stallTimeoutMs` pass with no data. A stalled request is cancelled, so the
 * caller gets an error it can retry instead of a promise that never settles.
 */
export async function downloadWithStallTimeout(
  fetchManaged: FetchManaged,
  url: string,
  path: string,
  stallTimeoutMs: number = DOWNLOAD_STALL_TIMEOUT_MS
): Promise<void> {
  const response = await new Promise<{ ok: boolean; status: number }>(
    (resolve, reject) => {
      let stallTimer: ReturnType<typeof setTimeout> | undefined
      const armStallTimer = (): void => {
        clearTimeout(stallTimer)
        stallTimer = setTimeout(() => {
          reject(
            new Error(
              `Download of ${url} stalled: no data for ${
                stallTimeoutMs / 1000
              } seconds`
            )
          )
          download.cancel().catch((error: unknown) => {
            console.warn(
              `Failed to cancel download of ${url}: ${String(error)}`
            )
          })
        }, stallTimeoutMs)
      }
      const download = fetchManaged(url, { method: 'GET', path }, armStallTimer)
      armStallTimer()
      download.result.then(
        result => {
          clearTimeout(stallTimer)
          resolve(result)
        },
        (error: unknown) => {
          clearTimeout(stallTimer)
          reject(error)
        }
      )
    }
  )
  if (!response.ok) {
    throw new Error(`Download of ${url} failed with HTTP ${response.status}`)
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
        await downloadWithStallTimeout(FileSystem.fetchManaged, url, path)
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
    fetchManaged: FetchManaged
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
