import { Applicant, Listing, ApplicantStatus } from 'onecore-types'

import knex from 'knex'
import Config from '../../../common/config'

const db = knex({
  client: 'mssql',
  connection: Config.leasingDatabase,
})

function transformFromDbListing(row: any): Listing {
  //todo: should handle applicant list if join is performed
  return {
    id: row.Id,
    rentalObjectCode: row.RentalObjectCode,
    address: row.Address,
    monthlyRent: row.MonthlyRent,
    districtCaption: row.DistrictCaption,
    districtCode: row.DistrictCode,
    blockCaption: row.BlockCaption,
    blockCode: row.BlockCode,
    objectTypeCaption: row.ObjectTypeCaption,
    objectTypeCode: row.ObjectTypeCode,
    rentalObjectTypeCaption: row.RentalObjectTypeCaption,
    rentalObjectTypeCode: row.RentalObjectTypeCode,
    publishedFrom: row.PublishedFrom,
    publishedTo: row.PublishedTo,
    vacantFrom: row.VacantFrom,
    status: row.Status,
    waitingListType: row.WaitingListType,
    applicants: undefined, //todo: handle
  }
}

function transformDbApplicant(row: any): Applicant {
  return {
    id: row.Id,
    name: row.Name,
    contactCode: row.ContactCode,
    applicationDate: row.ApplicationDate,
    status: row.Status,
    listingId: row.ListingId,
  }
}

const createListing = async (listingData: Listing) => {
  const insertedRow = await db('Listing')
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

  return transformFromDbListing(insertedRow[0])
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
  //todo: join in applicants?
  const listing = await db('Listing')
    .where({
      RentalObjectCode: rentalObjectCode,
    })
    .first()

  if (listing == undefined) {
    return undefined
  }
  return transformFromDbListing(listing)
}

/**
 * Checks if a listing already exists based on unique criteria.
 *
 * @param {number} listingId - The rental object code of the listing (originally from xpand)
 * @returns {Promise<Listing>} - Promise that resolves to the existing listing if it exists.
 */
const getListingById = async (
  listingId: string
): Promise<Listing | undefined> => {
  const listing = await db('Listing')
    .where({
      Id: listingId,
    })
    .first()

  if (listing == undefined) {
    return undefined
  }

  //todo: write join instead?
  let transformedListing = transformFromDbListing(listing)
  transformedListing.applicants = await getApplicantByListingId(
    transformedListing.id
  )
  return transformedListing
}

//todo: write doc
const createApplication = async (applicationData: Applicant) => {
  await db('applicant').insert({
    Name: applicationData.name,
    ContactCode: applicationData.contactCode,
    ApplicationDate: applicationData.applicationDate,
    ApplicationType: applicationData.applicationType,
    Status: applicationData.status,
    ListingId: applicationData.listingId,
  })
}

/**
 * Updates the status of an existing applicant using the ApplicantStatus enum.
 *
 * @param {number} applicantId - The ID of the applicant to update.
 * @param {ApplicantStatus} newStatus - The new status to set for the applicant.
 * @returns {Promise<boolean>} - Returns true if the update was successful, false otherwise.
 */
const updateApplicantStatus = async (
  applicantId: number,
  status: ApplicantStatus
) => {
  try {
    const updateCount = await db('applicant').where('Id', applicantId).update({
      Status: status,
    })

    return updateCount > 0
  } catch (error) {
    console.error('Error updating applicant status:', error)
    throw error
  }
}

//todo: write doc
const getAllListingsWithApplicants = async () => {
  //todo: add join to applicant instead of separate query?
  const dbListings: Listing[] = await db('Listing').select('*')
  let transformedListings: Listing[] = []

  for (const listing of dbListings) {
    let transformedListing = transformFromDbListing(listing)
    transformedListings.push(transformedListing)
  }

  //todo: possibly remove this
  for (const listing of transformedListings) {
    listing.applicants = await getApplicantByListingId(listing.id)
  }

  return transformedListings
}

const getApplicantsByContactCode = async (contactCode: string) => {
  const result = await db('Applicant')
    .where({ ContactCode: contactCode })
    .select('*')

  if (result == undefined) {
    return undefined
  }

  // Map result array to Applicant objects
  return result.map(transformDbApplicant)
}

//todo: write doc
const getApplicantsByContactCodeAndRentalObjectCode = async (
  contactCode: string,
  rentalObjectCode: string
) => {
  const result = await db('Applicant')
    .where({
      ContactCode: contactCode,
      RentalObjectCode: rentalObjectCode,
    })
    .first()

  if (result == undefined) return undefined

  return transformDbApplicant(result)
}

//todo: write doc
const getApplicantByListingId = async (listingId: number) => {
  const dbApplicants = await db('Applicant')
    .where('ListingId', listingId)
    .select('*')
  console.log(dbApplicants)
  let transformedApplicants: Applicant[] = []
  for (const applicant of dbApplicants) {
    transformedApplicants.push(transformDbApplicant(applicant))
  }

  return transformedApplicants
}

//todo: write doc
const applicationExists = async (contactCode: string, listingId: number) => {
  const result = await db('applicant')
    .where({
      ContactCode: contactCode,
      ListingId: listingId,
    })
    .first()
  return !!result // Convert result to boolean: true if exists, false if not
}

export {
  createListing,
  createApplication,
  getListingById,
  getListingByRentalObjectCode,
  getAllListingsWithApplicants,
  getApplicantsByContactCode,
  getApplicantsByContactCodeAndRentalObjectCode,
  applicationExists,
  updateApplicantStatus,
}
