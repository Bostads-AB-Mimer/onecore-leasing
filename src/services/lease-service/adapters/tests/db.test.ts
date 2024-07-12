import { db, setup, teardown } from '../db'

beforeAll(async () => {
  await setup()
})

afterAll(async () => {
  await teardown()
})

test('select leases', async () => {
  const leases = await db.from('lease').select('*')
  expect(leases.length).toEqual(1)
})