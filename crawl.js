const cp = require('child_process')
const fs = require('fs')

const fetchIds = () => {
  const url = "https://citrine-sidecar-938.notion.site/api/v3/queryCollection?src=reset"
  const reqBody = {
    source: {
      type: "collection",
      id: "e734a724-80e4-4118-936f-67b5567a940e",
      spaceId: "26ae6266-6e15-41d5-9031-b499ee31cd69"
    },
    collectionView: {
      id: "665eb123-11be-4d8a-870e-9f3ab5279812",
      spaceId: "26ae6266-6e15-41d5-9031-b499ee31cd69"
    },
    loader: {
      type: "reducer",
      reducers: {
        collection_group_results: {
          type: "results",
          limit: 10000
        }
      },
      sort: [],
      searchQuery: "",
      userTimeZone: "Asia/Taipei"
    }
  }
  const { stdout } = cp.spawnSync("http", [url], { input: JSON.stringify(reqBody) })
  const result = JSON.parse(stdout.toString("utf-8"))
  return result.result.reducerResults.collection_group_results.blockIds
}

const splitArray = (arr, chunkSize) => {
  const result = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize))
  }
  return result
}

const fetchEntries = (ids) => {
  const url = "https://citrine-sidecar-938.notion.site/api/v3/syncRecordValues"
  const reqBody = {
    requests: ids.map(id => ({
      pointer: {
        table: 'block',
        id
      },
      version: -1
    }))
  }
  const { stdout } = cp.spawnSync("http", [url], { input: JSON.stringify(reqBody) })
  const result = JSON.parse(stdout.toString("utf-8"))
  return Object.keys(result.recordMap.block).map(id => {
    const obj = result.recordMap.block[id]
    const e = obj.value.properties
    const check = (key) => {
      if (!e || !e[key] || e[key].length !== 1 || e[key].length !== 1) {
        console.log(`${id} ${key} is irregular`, e)
      }
    }
    const get = (key) => {
      return (e[key] && e[key][0] && e[key][0][0]) || null
    }
    ["title", "xa;q", "v^pV", "oIOY", "e:Fk", "Z=pF"].forEach(check)
    return {
      "id": id,
      "taigi": get("title"),
      "number": get("xa;q"),
      "scientific": get("v^pV"),
      "chinese": get("oIOY"),
      "tailo": get("e:Fk"),
      "english": get("Z=pF")
    }
  })
}

const delay = (second) => new Promise((resolve, reject) => {
  setTimeout(() => resolve(1), second * 1000)
})

// Fetch from server
// const ids = fetchIds()
// fs.writeFileSync("ids.json", JSON.stringify(ids))

// or loading from cache
const ids = JSON.parse(fs.readFileSync("ids.json").toString("utf-8"))

const batch = async (totalIDs) => {
  let result = []
  let page = 1
  for (let ids of splitArray(totalIDs, 100)) {
    console.log(`batch ${page}...`)
    result = result.concat(fetchEntries(ids))
    await delay(2)
    page++
  }
  return result.sort((a, b) => parseInt(a.number) - parseInt(b.number))
}

batch(ids).then(dict => {
  fs.writeFileSync("plant.json", JSON.stringify(dict))
})
