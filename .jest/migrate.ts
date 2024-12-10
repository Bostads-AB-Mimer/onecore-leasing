import { createDbClient } from '../src/services/lease-service/adapters/db'

export default async function migrate() {
  const db = createDbClient()

  await db.migrate
    .latest()
    .then(() => {
      console.log('Migrations applied')
    })
    .catch((error) => {
      console.error('Error applying migrations', error)
    })

  await db.destroy()
}
