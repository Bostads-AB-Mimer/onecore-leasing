import knex from 'knex'
import { Applicant } from 'onecore-types'

import Config from '../../../common/config'
import * as dbUtils from './utils'

// TODO: Don't use a separate db connection
const db = knex({
  client: 'mssql',
  connection: Config.leasingDatabase,
})

// TODO: Move to onecore-types
enum OfferStatus {
  Active,
  Accepted,
  Declined,
  Expired,
}

// TODO: Move to onecore-types
type Offer = {
  id: number
  sentAt: Date | null
  expiresAt: Date
  answeredAt: Date | null
  selectionSnapshot: Applicant[]
  status: OfferStatus
  listingId: number
  applicantId: number
}

type DbOffer = dbUtils.CamelToPascalObject<Offer>

type AdapterContext = { log: any }

type CreateOfferParams = Omit<Offer, 'id' | 'sentAt' | 'answeredAt'>

export async function create(ctx: AdapterContext, params: CreateOfferParams) {
  try {
    const result = await db<DbOffer>('offer')
      .insert(dbUtils.camelToPascal(params))
      .returning('*')
      .first()

    if (!result) {
      throw new Error('Unexpected error')
    }

    return transformFromDbOffer(result)
  } catch (err) {
    ctx.log.push('Error inserting offer', err)
    throw err
  }
}

const transformFromDbOffer = (v: DbOffer): Offer => dbUtils.pascalToCamel(v)
