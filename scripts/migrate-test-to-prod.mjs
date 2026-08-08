/**
 * One-time migration for roadmap #5 (PROJECT_PASSPORT.md §9.3/§12/3.61).
 * Copies every collection (data + indexes) from the `test` database to
 * `lingomatch_prod` on the same Atlas cluster. Read-only against the source;
 * never deletes or modifies anything in `test`. Kept for the historical
 * record — re-running it is safe (idempotent per-collection would need a
 * drop first; it is not designed to be re-run against a non-empty dest).
 * Run: node scripts/migrate-test-to-prod.mjs
 */
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'

const envLines = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.trim().split('=')
  if (key && rest.length && !process.env[key]) {
    process.env[key] = rest.join('=').replace(/^["']|["']$/g, '')
  }
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()

  const source = client.db('test')
  const dest = client.db('lingomatch_prod')

  const collections = await source.listCollections().toArray()
  console.log(`Found ${collections.length} collections in 'test'\n`)

  const report = []

  for (const { name } of collections) {
    const sourceColl = source.collection(name)
    const destColl = dest.collection(name)

    // Indexes first (including the default _id_ index, which createIndexes
    // ignores/no-ops on since every collection already has one).
    const indexes = await sourceColl.indexes()
    const toCreate = indexes.filter((idx) => idx.name !== '_id_')
    if (toCreate.length > 0) {
      await destColl.createIndexes(toCreate.map(({ key, ...rest }) => ({ key, ...rest })))
    }

    const docs = await sourceColl.find({}).toArray()
    if (docs.length > 0) {
      await destColl.insertMany(docs, { ordered: true })
    }

    const sourceCount = await sourceColl.countDocuments()
    const destCount = await destColl.countDocuments()
    const sourceIdx = (await sourceColl.indexes()).length
    const destIdx = (await destColl.indexes()).length

    report.push({ name, sourceCount, destCount, sourceIdx, destIdx })
    console.log(
      `${name}: ${destCount}/${sourceCount} docs, ${destIdx}/${sourceIdx} indexes` +
        (sourceCount === destCount && sourceIdx === destIdx ? ' OK' : ' MISMATCH'),
    )
  }

  const mismatches = report.filter(
    (r) => r.sourceCount !== r.destCount || r.sourceIdx !== r.destIdx,
  )

  console.log('\n' + (mismatches.length === 0 ? 'ALL COLLECTIONS MATCH' : 'MISMATCHES FOUND'))

  await client.close()
  process.exit(mismatches.length === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
