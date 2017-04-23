
export class ABCDataStore {
  constructor (directory = '', data = {}) {
    this.dir = directory
    this.data = data
  }

// abcWallet.dataStore.listKeys(folder, callback)
  listKeys (folder, callback) {
    const targetFolder = this.data[folder]
    let keys
    if (targetFolder) {
      keys = Object.keys(targetFolder)
    }

    callback(null, keys)
  }

// abcWallet.dataStore.removeKey(folder, key, callback)
  removeKey (folder, key, callback) {
    const targetFolder = this.data[folder]
    if (targetFolder) {
      delete targetFolder[key]
    }
    callback(null)
  }

// abcWallet.dataStore.readData(folder, key, callback)
  readData (folder, key, callback) {
    const targetFolder = this.data[folder]
    let targetData

    if (targetFolder) {
      targetData = targetFolder[key]
    }

    callback(null, targetData)
  }

// writeData(folder, key, value, callback)
  writeData (folder, key, newValue, callback) {
    const folderExists = Object.keys(this.data).includes(folder)

    if (!folderExists) {
      this.data[folder] = {}
    }
    this.data[folder][key] = newValue
    callback(null)
  }

// abcWallet.dataStore.removeFolder(folder, callback)
  removeFolder (folder, callback) {
    delete this.data[folder]
    callback(null)
  }
}
