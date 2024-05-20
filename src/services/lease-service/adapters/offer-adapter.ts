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
  selectedApplicants: Array<Applicant>
  status: OfferStatus
  listingId: number
  offeredApplicant: number
}

type DbOffer = {
  Id: number
  SentAt: Date | null
  ExpiresAt: Date
  AnsweredAt: Date | null
  SelectionSnapshot: string
  Status: OfferStatus
  ListingId: number
  ApplicantId: number
}

type CreateOfferParams = Omit<Offer, 'id' | 'sentAt' | 'answeredAt'>

export async function create(params: CreateOfferParams) {
  const { selectedApplicants, offeredApplicant: applicantId, ...rest } = params
  const values = {
    ...rest,
    applicantId,
    selectionSnapshot: JSON.stringify(selectedApplicants),
  }

  const result = await db<DbOffer>('offer')
    .insert(dbUtils.camelToPascal(values))
    .returning('*')
    .first()

  if (!result) {
    throw new Error('Unexpected error')
  }

  return transformFromDbOffer(result)
}

const transformFromDbOffer = (v: DbOffer): Offer => {
  const {
    selectionSnapshot: selectedApplicants,
    applicantId: offeredApplicant,
    ...offer
  } = dbUtils.pascalToCamel(v)

  return {
    ...offer,
    selectedApplicants: JSON.parse(selectedApplicants),
    offeredApplicant,
  }
}
