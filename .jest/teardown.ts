import { createDbClient } from '../src/services/lease-service/adapters/db'

export default async function teardown() {
  const db = createDbClient()
  try {
    await db.migrate.rollback().then(() => {
      console.log('Migrations rolled back')
    })
  } catch (error) {
    console.error('Error rolling back migrations:', error)
  }

  await db.destroy()
}
