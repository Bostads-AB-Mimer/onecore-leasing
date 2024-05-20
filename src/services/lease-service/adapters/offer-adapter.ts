import { Applicant } from 'onecore-types'
import { db } from './db'

import * as dbUtils from './utils'

// TODO: Move to onecore-types
export enum OfferStatus {
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

type CreateOfferParams = Omit<Offer, 'id' | 'sentAt' | 'answeredAt'>

export async function create(params: CreateOfferParams) {
  const result = await db<DbOffer>('offer')
    .insert(dbUtils.camelToPascal(params))
    .returning('*')
    .first()

  if (!result) {
    throw new Error('Unexpected error')
  }

  return transformFromDbOffer(result)
}

const transformFromDbOffer = (v: DbOffer): Offer => dbUtils.pascalToCamel(v)
