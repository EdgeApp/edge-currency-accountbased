import { expect } from 'chai'
import { createHash } from 'crypto'
import { describe, it } from 'mocha'

import {
  ensureSaplingParams,
  SaplingParamFile,
  SaplingParamsDisk
} from '../../src/piratechain/saplingParams'
import { expectRejection } from '../expectRejection'

const sha256 = (text: string): string =>
  createHash('sha256').update(text).digest('hex')

const files: SaplingParamFile[] = [
  { name: 'spend.params', sha256: sha256('spend') },
  { name: 'output.params', sha256: sha256('output') }
]
const baseUrl = 'https://params.test/'
const dir = '/app/params'

/**
 * An in-memory disk whose server answers each URL with `served`, falling
 * back to the published contents.
 */
function makeFakeDisk(served: Record<string, string> = {}): {
  disk: SaplingParamsDisk
  entries: Map<string, string>
  downloads: string[]
} {
  const entries = new Map<string, string>()
  const downloads: string[] = []
  const published: Record<string, string> = {
    [`${baseUrl}spend.params`]: 'spend',
    [`${baseUrl}output.params`]: 'output'
  }
  const disk: SaplingParamsDisk = {
    exists: async path => entries.has(path),
    download: async (url, path) => {
      downloads.push(url)
      const body = served[url] ?? published[url]
      if (body == null) throw new Error(`Download of ${url} failed`)
      entries.set(path, body)
    },
    hashSha256: async path => {
      const body = entries.get(path)
      if (body == null) throw new Error(`No file at ${path}`)
      return sha256(body).toUpperCase()
    },
    mkdir: async path => {
      if (entries.has(path)) throw new Error(`'${path}' already exists.`)
      entries.set(path, '')
    },
    mv: async (source, target) => {
      const body = entries.get(source)
      if (body == null) throw new Error(`No file at ${source}`)
      entries.delete(source)
      entries.set(target, body)
    },
    unlink: async path => {
      if (!entries.delete(path)) throw new Error(`Failed to unlink '${path}'`)
    }
  }
  return { disk, entries, downloads }
}

describe('ensureSaplingParams', function () {
  it('downloads missing files into a new directory', async function () {
    const { disk, entries, downloads } = makeFakeDisk()
    await ensureSaplingParams(disk, dir, files, baseUrl)
    expect(entries.get(`${dir}/spend.params`)).equals('spend')
    expect(entries.get(`${dir}/output.params`)).equals('output')
    expect(downloads).deep.equals([
      `${baseUrl}spend.params`,
      `${baseUrl}output.params`
    ])
  })

  it('keeps files that already match', async function () {
    const { disk, downloads } = makeFakeDisk()
    await ensureSaplingParams(disk, dir, files, baseUrl)
    downloads.length = 0
    await ensureSaplingParams(disk, dir, files, baseUrl)
    expect(downloads).deep.equals([])
  })

  it('replaces a corrupted file', async function () {
    const { disk, entries, downloads } = makeFakeDisk()
    await ensureSaplingParams(disk, dir, files, baseUrl)
    entries.set(`${dir}/output.params`, 'outpuX')
    downloads.length = 0
    await ensureSaplingParams(disk, dir, files, baseUrl)
    expect(entries.get(`${dir}/output.params`)).equals('output')
    expect(downloads).deep.equals([`${baseUrl}output.params`])
  })

  it('rejects a download that does not match, leaving no file', async function () {
    const { disk, entries } = makeFakeDisk({
      [`${baseUrl}spend.params`]: 'tampered'
    })
    await expectRejection(
      ensureSaplingParams(disk, dir, files, baseUrl),
      'Error: Downloaded spend.params does not match its published SHA-256'
    )
    expect(entries.has(`${dir}/spend.params`)).equals(false)
    expect(entries.has(`${dir}/spend.params.download`)).equals(false)
  })

  it('removes a partial download that failed', async function () {
    const { disk, entries } = makeFakeDisk()
    await ensureSaplingParams(disk, dir, files, baseUrl)
    entries.set(`${dir}/spend.params`, 'spenX')
    const failing: SaplingParamsDisk = {
      ...disk,
      download: async (url, path) => {
        entries.set(path, 'partial')
        throw new Error(`Download of ${url} failed with HTTP 503`)
      }
    }
    await expectRejection(
      ensureSaplingParams(failing, dir, files, baseUrl),
      `Error: Download of ${baseUrl}spend.params failed with HTTP 503`
    )
    expect(entries.has(`${dir}/spend.params.download`)).equals(false)
  })
})
