import { Factory } from 'fishery'
import { ApplicantStatus, LeaseStatus, OfferApplicant } from 'onecore-types'

export const OfferApplicantFactory = Factory.define<OfferApplicant>(
  ({ sequence }) => ({
    id: sequence,
    listingId: 1,
    offerId: 1,
    applicantId: 1,
    priority: null,
    queuePoints: 1,
    status: ApplicantStatus.Active,
    address: 'Testgatan 14',
    applicationType: 'Additional',
    hasParkingSpace: true,
    housingLeaseStatus: LeaseStatus.Current,
    createdAt: new Date(),
    sortOrder: sequence,
    nationalRegistrationNumber: '198103314681',
    contactCode: 'P123456',
    applicationDate: new Date(),
    name: 'Test Testsson',
  })
)
