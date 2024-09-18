import {
  OfferWithRentalObjectCode,
  Offer,
  Applicant,
  DetailedOffer,
  OfferStatus,
} from 'onecore-types'

import { db } from './db'
import { AdapterResult, DbApplicant, DbDetailedOffer, DbOffer } from './types'

import * as dbUtils from './utils'
import { logger } from 'onecore-utilities'
import { Knex } from 'knex'

type CreateOfferParams = Omit<
  Offer,
  'id' | 'sentAt' | 'answeredAt' | 'offeredApplicant' | 'createdAt'
> & { applicantId: number }

export async function create(params: CreateOfferParams) {
  const { selectedApplicants, ...rest } = params
  const values = {
    ...rest,
    selectionSnapshot: JSON.stringify(selectedApplicants),
  }

  const applicant = await db<DbApplicant>('applicant')
    .select('*')
    .where('Id', params.applicantId)
    .first()

  if (!applicant) {
    logger.error(
      { applicantId: params.applicantId, listingId: params.listingId },
      'Applicant not found when creating offer'
    )
    throw new Error('Applicant not found when creating offer')
  }

  const [offer] = await db<DbOffer>('offer')
    .insert(dbUtils.camelToPascal(values))
    .returning('*')

  return transformToOfferFromDbOffer(offer, applicant)
}

type GetOffersForContactQueryResult = Array<
  DbOffer & {
    RentalObjectCode: string
    ApplicantApplicantId: number
    ApplicantName: string
    ApplicantNationalRegistrationNumber: string
    ApplicantContactCode: string
    ApplicantApplicationDate: Date
    ApplicantApplicationType: string | null
    ApplicantStatus: Applicant['status']
    ApplicantListingId: number
  }
>

export async function getOffersForContact(
  contactCode: string
): Promise<Array<OfferWithRentalObjectCode>> {
  const rows = await db
    .select<GetOffersForContactQueryResult>(
      'offer.*',
      'listing.RentalObjectCode',
      'applicant.Id as ApplicantApplicantId',
      'applicant.Name as ApplicantName',
      'applicant.NationalRegistrationNumber as ApplicantNationalRegistrationNumber',
      'applicant.ContactCode as ApplicantContactCode',
      'applicant.ApplicationDate as ApplicantApplicationDate',
      'applicant.ApplicationType as ApplicantApplicationType',
      'applicant.Status as ApplicantStatus',
      'applicant.ListingId as ApplicantListingId'
    )
    .from('offer')
    .innerJoin('listing', 'listing.Id', 'offer.ListingId')
    .innerJoin('applicant', 'applicant.Id', 'offer.ApplicantId')
    .where('applicant.ContactCode', contactCode)

  return rows.map((row) => {
    const {
      ApplicantApplicantId,
      ApplicantName,
      ApplicantNationalRegistrationNumber,
      ApplicantApplicationDate,
      ApplicantApplicationType,
      ApplicantContactCode,
      ApplicantStatus,
      ApplicantListingId,
      RentalObjectCode,
      ...offer
    } = row

    return {
      ...transformToOfferFromDbOffer(offer, {
        ApplicationDate: ApplicantApplicationDate,
        ContactCode: ApplicantContactCode,
        Id: ApplicantApplicantId,
        ListingId: ApplicantListingId,
        Name: ApplicantName,
        NationalRegistrationNumber: ApplicantNationalRegistrationNumber,
        Status: ApplicantStatus,
        ApplicationType: ApplicantApplicationType,
      }),
      rentalObjectCode: RentalObjectCode,
    }
  })
}

export async function getOfferByContactCodeAndOfferId(
  contactCode: string,
  offerId: number
): Promise<DetailedOffer | undefined> {
  const row = await db
    .select(
      'offer.Id',
      'offer.SentAt',
      'offer.ExpiresAt',
      'offer.AnsweredAt',
      'offer.Status',
      'offer.ListingId',
      'offer.ApplicantId',
      'offer.CreatedAt',
      'listing.RentalObjectCode',
      'listing.VacantFrom',
      'applicant.Id as ApplicantApplicantId',
      'applicant.Name as ApplicantName',
      'applicant.NationalRegistrationNumber as ApplicantNationalRegistrationNumber',
      'applicant.ContactCode as ApplicantContactCode',
      'applicant.ApplicationDate as ApplicantApplicationDate',
      'applicant.ApplicationType as ApplicantApplicationType',
      'applicant.Status as ApplicantStatus',
      'applicant.ListingId as ApplicantListingId'
    )
    .from('offer')
    .innerJoin('listing', 'listing.Id', 'offer.ListingId')
    .innerJoin('applicant', 'applicant.Id', 'offer.ApplicantId')
    .where('offer.Id', offerId)
    .andWhere('applicant.ContactCode', contactCode)
    .first()

  if (row == undefined) {
    logger.info(
      { offerId },
      'Getting offer from leasing DB complete - offer not found'
    )
    return undefined
  }
  const {
    ApplicantApplicantId,
    ApplicantName,
    ApplicantNationalRegistrationNumber,
    ApplicantApplicationDate,
    ApplicantApplicationType,
    ApplicantContactCode,
    ApplicantStatus,
    ApplicantListingId,
    RentalObjectCode,
    VacantFrom,
    ...offer
  } = row

  return {
    ...transformToDetailedOfferFromDbOffer(offer, {
      ApplicationDate: ApplicantApplicationDate,
      ContactCode: ApplicantContactCode,
      Id: ApplicantApplicantId,
      ListingId: ApplicantListingId,
      Name: ApplicantName,
      NationalRegistrationNumber: ApplicantNationalRegistrationNumber,
      Status: ApplicantStatus,
      ApplicationType: ApplicantApplicationType,
    }),
    rentalObjectCode: RentalObjectCode,
    vacantFrom: VacantFrom,
  }
}

export async function getOfferByOfferId(
  offerId: number
): Promise<AdapterResult<DetailedOffer, 'not-found' | 'unknown'>> {
  try {
    const row = await db
      .select(
        'offer.Id',
        'offer.SentAt',
        'offer.ExpiresAt',
        'offer.AnsweredAt',
        'offer.Status',
        'offer.ListingId',
        'offer.ApplicantId',
        'offer.CreatedAt',
        'listing.RentalObjectCode',
        'listing.VacantFrom',
        'applicant.Id as ApplicantApplicantId',
        'applicant.Name as ApplicantName',
        'applicant.NationalRegistrationNumber as ApplicantNationalRegistrationNumber',
        'applicant.ContactCode as ApplicantContactCode',
        'applicant.ApplicationDate as ApplicantApplicationDate',
        'applicant.ApplicationType as ApplicantApplicationType',
        'applicant.Status as ApplicantStatus',
        'applicant.ListingId as ApplicantListingId'
      )
      .from('offer')
      .innerJoin('listing', 'listing.Id', 'offer.ListingId')
      .innerJoin('applicant', 'applicant.Id', 'offer.ApplicantId')
      .where('offer.Id', offerId)
      .first()

    if (row == undefined) {
      logger.info(
        { offerId },
        'Getting offer from leasing DB complete - offer not found'
      )
      return { ok: false, err: 'not-found' }
    }
    const {
      ApplicantApplicantId,
      ApplicantName,
      ApplicantNationalRegistrationNumber,
      ApplicantApplicationDate,
      ApplicantApplicationType,
      ApplicantContactCode,
      ApplicantStatus,
      ApplicantListingId,
      RentalObjectCode,
      VacantFrom,
      ...offer
    } = row

    return {
      ok: true,
      data: {
        ...transformToDetailedOfferFromDbOffer(offer, {
          ApplicationDate: ApplicantApplicationDate,
          ContactCode: ApplicantContactCode,
          Id: ApplicantApplicantId,
          ListingId: ApplicantListingId,
          Name: ApplicantName,
          NationalRegistrationNumber: ApplicantNationalRegistrationNumber,
          Status: ApplicantStatus,
          ApplicationType: ApplicantApplicationType,
        }),
        rentalObjectCode: RentalObjectCode,
        vacantFrom: VacantFrom,
      },
    }
  } catch (error) {
    logger.error(error, 'Error getting waiting list using Xpand SOAP API')
    return { ok: false, err: 'unknown' }
  }
}

export async function updateOfferStatus(
  status: OfferStatus,
  offerId: number,
  // TODO: What to put as type parameters to knex?
  dbConnection: Knex<any, any> = db
): Promise<AdapterResult<null, 'no-update' | 'unknown'>> {
  try {
    const query = await dbConnection('offer')
      .update({ Status: status })
      .where({ Id: offerId })

    if (query === 0) {
      return { ok: false, err: 'no-update' }
    }
    return { ok: true, data: null }
  } catch (err) {
    return { ok: false, err: 'unknown' }
  }
}

const transformToDetailedOfferFromDbOffer = (
  o: DbDetailedOffer,
  a: DbApplicant
): DetailedOffer => {
  const { applicantId: _applicantId, ...offer } = dbUtils.pascalToCamel(o)
  return {
    ...offer,
    offeredApplicant: {
      ...dbUtils.pascalToCamel(a),
      applicationType: a.ApplicationType || undefined,
    },
  }
}

const transformToOfferFromDbOffer = (o: DbOffer, a: DbApplicant): Offer => {
  const {
    selectionSnapshot: selectedApplicants,
    applicantId: _applicantId,
    ...offer
  } = dbUtils.pascalToCamel(o)

  return {
    ...offer,
    selectedApplicants: JSON.parse(selectedApplicants),
    offeredApplicant: {
      ...dbUtils.pascalToCamel(a),
      applicationType: a.ApplicationType || undefined,
    },
  }
}
