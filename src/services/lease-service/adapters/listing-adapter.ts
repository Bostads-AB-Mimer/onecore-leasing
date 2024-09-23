import { logger } from 'onecore-utilities'
import {
  Applicant,
  Listing,
  ApplicantStatus,
  ListingStatus,
} from 'onecore-types'

import { db } from './db'
import { AdapterResult, DbApplicant, DbListing } from './types'
import { RequestError } from 'tedious'
import { Knex } from 'knex'

function transformFromDbListing(row: DbListing): Listing {
  return {
    id: row.Id,
    rentalObjectCode: row.RentalObjectCode,
    address: row.Address,
    monthlyRent: row.MonthlyRent,
    districtCaption: row.DistrictCaption || undefined,
    districtCode: row.DistrictCode || undefined,
    blockCaption: row.BlockCaption || undefined,
    blockCode: row.BlockCode || undefined,
    objectTypeCaption: row.ObjectTypeCaption || undefined,
    objectTypeCode: row.ObjectTypeCode || undefined,
    rentalObjectTypeCaption: row.RentalObjectTypeCaption || undefined,
    rentalObjectTypeCode: row.RentalObjectTypeCode || undefined,
    publishedFrom: row.PublishedFrom || undefined,
    publishedTo: row.PublishedTo,
    vacantFrom: row.VacantFrom,
    status: row.Status,
    waitingListType: row.WaitingListType || undefined,
    applicants: undefined,
  }
}

function transformDbApplicant(row: DbApplicant): Applicant {
  return {
    id: row.Id,
    name: row.Name,
    nationalRegistrationNumber: row.NationalRegistrationNumber,
    contactCode: row.ContactCode,
    applicationDate: row.ApplicationDate,
    applicationType: row.ApplicationType || undefined,
    status: row.Status,
    listingId: row.ListingId,
  }
}

const createListing = async (
  listingData: Omit<Listing, 'id'>
): Promise<AdapterResult<Listing, 'conflict-active-listing' | 'unknown'>> => {
  try {
    const insertedRow = await db<DbListing>('Listing')
      .insert({
        RentalObjectCode: listingData.rentalObjectCode,
        Address: listingData.address,
        DistrictCaption: listingData.districtCaption,
        DistrictCode: listingData.districtCode,
        BlockCaption: listingData.blockCaption,
        BlockCode: listingData.blockCode,
        MonthlyRent: listingData.monthlyRent,
        ObjectTypeCaption: listingData.objectTypeCaption,
        ObjectTypeCode: listingData.objectTypeCode,
        RentalObjectTypeCaption: listingData.rentalObjectTypeCaption,
        RentalObjectTypeCode: listingData.rentalObjectTypeCode,
        PublishedFrom: listingData.publishedFrom,
        PublishedTo: listingData.publishedTo,
        VacantFrom: listingData.vacantFrom,
        Status: listingData.status,
        WaitingListType: listingData.waitingListType,
      })
      .returning('*')

    return { ok: true, data: transformFromDbListing(insertedRow[0]) }
  } catch (err) {
    if (err instanceof RequestError) {
      if (err.message.includes('unique_rental_object_code_status')) {
        logger.info(
          {
            RentalObjectCode: listingData.rentalObjectCode,
            Status: listingData.status,
          },
          'listingAdapter.createListing - can not insert duplicate active listing'
        )
        return { ok: false, err: 'conflict-active-listing' }
      }

      logger.error(
        {
          RentalObjectCode: listingData.rentalObjectCode,
          err,
        },
        'listingAdapter.createListing'
      )
    }

    return { ok: false, err: 'unknown' }
  }
}

/**
 * Checks if a listing already exists based on unique criteria.
 *
 * @param {string} rentalObjectCode - The rental object code of the listing (originally from xpand)
 * @returns {Promise<Listing>} - Promise that resolves to the existing listing if it exists.
 */
const getListingByRentalObjectCode = async (
  rentalObjectCode: string
): Promise<Listing | undefined> => {
  const listing = await db<DbListing>('Listing')
    .where({
      RentalObjectCode: rentalObjectCode,
    })
    .first()

  if (listing == undefined) {
    return undefined
  }
  return transformFromDbListing(listing)
}

const getListingById = async (
  listingId: number
): Promise<Listing | undefined> => {
  logger.info({ listingId }, 'Getting listing from leasing DB')
  const result = await db
    .from('listing AS l')
    .select<DbListing & { applicants: string | null }>(
      'l.*',
      db.raw(`
      (
        SELECT a.*
        FROM applicant a
        WHERE a.ListingId = l.Id
        FOR JSON PATH
      ) as applicants
    `)
    )
    .where('l.Id', listingId)
    .first()

  const parseApplicantsJson = (applicants: string | null) =>
    applicants ? JSON.parse(applicants) : []

  const parseApplicantsApplicationDate = (applicant: Applicant): Applicant => ({
    ...applicant,
    applicationDate: new Date(applicant.applicationDate),
  })

  const transformListing = (
    row: DbListing & { applicants: Array<DbApplicant> }
  ): Listing => ({
    ...transformFromDbListing(row),
    applicants: row.applicants
      .map(transformDbApplicant)
      .map(parseApplicantsApplicationDate),
  })

  if (!result) {
    logger.info(
      { listingId },
      'Getting listing from leasing DB complete - listing not found'
    )
    return undefined
  }

  logger.info({ listingId }, 'Getting listing from leasing DB complete')

  return transformListing({
    ...result,
    applicants: parseApplicantsJson(result.applicants),
  })
}

/**
 * Gets an applicant by id
 *
 * @param {number} applicantId - The ID of the applicant.
 * @returns {Promise<Applicant | undefined>} - Returns the applicant.
 */
const getApplicantById = async (
  applicantId: number
): Promise<Applicant | undefined> => {
  logger.info({ applicantId }, 'Getting applicant from leasing DB')
  const applicant = await db<DbApplicant>('Applicant')
    .where({
      Id: applicantId,
    })
    .first()

  if (applicant == undefined) {
    logger.info(
      { applicantId },
      'Getting applicant from leasing DB complete - applicant not found'
    )
    return undefined
  }

  logger.info({ applicantId }, 'Getting applicant from leasing DB complete')

  return transformDbApplicant(applicant)
}

const createApplication = async (applicationData: Omit<Applicant, 'id'>) => {
  logger.info(
    { contactCode: applicationData.contactCode },
    'Creating application in listing DB'
  )

  const insertedRow = await db('applicant')
    .insert({
      Name: applicationData.name,
      NationalRegistrationNumber: applicationData.nationalRegistrationNumber,
      ContactCode: applicationData.contactCode,
      ApplicationDate: applicationData.applicationDate,
      ApplicationType: applicationData.applicationType,
      Status: applicationData.status,
      ListingId: applicationData.listingId,
    })
    .returning('*')

  logger.info(
    { contactCode: applicationData.contactCode },
    'Creating application in listing DB complete'
  )
  return transformDbApplicant(insertedRow[0])
}

const updateApplicantStatus = async (
  applicantId: number,
  status: ApplicantStatus,
  dbConnection: Knex<any, unknown[]> = db
): Promise<AdapterResult<null, 'no-update' | 'unknown'>> => {
  try {
    const updateCount = await dbConnection('applicant')
      .where('Id', applicantId)
      .update({
        Status: status,
      })
    if (updateCount === 0) {
      return { ok: false, err: 'no-update' }
    }

    return { ok: true, data: null }
  } catch (error) {
    return { ok: false, err: 'unknown' }
  }
}

const getAllListingsWithApplicants = async (): Promise<Array<Listing>> => {
  const query = db
    .from('listing AS l')
    .select<Array<DbListing & { applicants: string | null }>>(
      'l.*',
      db.raw(`
      (
        SELECT a.*
        FROM applicant a
        WHERE a.ListingId = l.Id
        FOR JSON PATH
      ) as applicants
    `)
    )

  const parseApplicantsJson = (applicants: string | null) =>
    applicants ? JSON.parse(applicants) : []

  const parseApplicantsApplicationDate = (applicant: Applicant): Applicant => ({
    ...applicant,
    applicationDate: new Date(applicant.applicationDate),
  })

  const transformListing = (
    row: DbListing & { applicants: Array<DbApplicant> }
  ): Listing => ({
    ...transformFromDbListing(row),
    applicants: row.applicants
      .map(transformDbApplicant)
      .map(parseApplicantsApplicationDate),
  })

  const result = await query.then((rows) =>
    rows.map((row) => {
      return transformListing({
        ...row,
        applicants: parseApplicantsJson(row.applicants),
      })
    })
  )

  return result
}

/**
 * Gets all applicants by contact code
 *
 * @param {string} contactCode - The applicants contact code
 * @returns {Promise<Applicant | undefined>} - Returns the applicants.
 */

const getApplicantsByContactCode = async (contactCode: string) => {
  const result = await db('Applicant')
    .where({ ContactCode: contactCode })
    .select<Array<DbApplicant>>('*')

  return result.map(transformDbApplicant)
}

/**
 * Gets an applicant by contact code and rental object code
 *
 * @param {string} contactCode - The applicants contact code.
 * @param {string} listingId - The id of the listing that the applicant belongs to.
 * @returns {Promise<Applicant | undefined>} - Returns the applicant.
 */
const getApplicantByContactCodeAndListingId = async (
  contactCode: string,
  listingId: number
) => {
  const result = await db<DbApplicant>('Applicant')
    .where({
      ContactCode: contactCode,
      ListingId: listingId,
    })
    .first()

  if (result == undefined) return undefined

  return transformDbApplicant(result)
}

/**
 * Checks if an applicant has a applied for a listing
 *
 * @param {string} contactCode - The applicants contact code.
 * @param {number} listingId - The ID of the listing the applicant belongs to.
 * @returns {Promise<boolean>} - Returns true if applicant belongs to listing, false if not.
 */
const applicationExists = async (contactCode: string, listingId: number) => {
  const result = await db<DbApplicant>('applicant')
    .where({
      ContactCode: contactCode,
      ListingId: listingId,
    })
    .first()

  if (!result) {
    return false
  }

  return true
}

const getExpiredListings = async () => {
  const currentDate = new Date()
  const listings = await db('listing')
    .where('PublishedTo', '<', currentDate)
    .andWhere('Status', '=', ListingStatus.Active)
  return listings
}

const updateListingStatuses = async (
  listingIds: number[],
  status: ListingStatus,
  dbConnection: Knex<any, unknown[]> = db
): Promise<AdapterResult<null, 'no-update' | 'unknown'>> => {
  try {
    const updateCount = await dbConnection('listing')
      .whereIn('Id', listingIds)
      .update({ Status: status })

    if (updateCount === 0) {
      return { ok: false, err: 'no-update' }
    }
    return { ok: true, data: null }
  } catch (err) {
    logger.error(err, 'listingAdapter.updateListingStatuses')
    return { ok: false, err: 'unknown' }
  }
}

const deleteListing = async (
  listingId: number
): Promise<AdapterResult<null, 'unknown' | 'conflict'>> => {
  try {
    await db('listing').delete().where('Id', listingId)
    return { ok: true, data: null }
  } catch (err) {
    logger.error(err, 'listingAdapter.deleteListing')
    if (err instanceof RequestError) {
      if (err.message.includes('constraint')) {
        return { ok: false, err: 'conflict' }
      }
    }

    return { ok: false, err: 'unknown' }
  }
}

export {
  createListing,
  createApplication,
  getListingById,
  getListingByRentalObjectCode,
  getAllListingsWithApplicants,
  getApplicantById,
  getApplicantsByContactCode,
  getApplicantByContactCodeAndListingId,
  applicationExists,
  updateApplicantStatus,
  getExpiredListings,
  updateListingStatuses,
  deleteListing,
}
