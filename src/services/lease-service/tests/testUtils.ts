import { Knex } from 'knex'
import { createDbClient } from '../adapters/db'

export async function clearDb(db: Knex) {
  await db('offer_applicant').del()
  await db('offer').del()
  await db('applicant').del()
  await db('listing').del()
  await db('application_profile_housing_reference').del()
  await db('application_profile').del()
}

export async function withContext(
  callback: (ctx: { db: Knex.Transaction }) => Promise<unknown>
) {
  const db = createDbClient()
  try {
    await db.transaction(async (trx) => {
      await callback({
        db: trx,
      })

      throw 'rollback'
    })
  } catch (e: unknown) {
    if (e === 'rollback') return e
    throw e
  } finally {
    await db.destroy()
  }
}
