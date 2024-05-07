import { Factory } from 'fishery'
import { Lease, LeaseStatus, Listing, ListingStatus } from 'onecore-types'

//todo: remove params?
const LeaseFactory = Factory.define<Lease>(({ sequence, params }) => ({
  leaseId: `${sequence}`,
  leaseNumber: `0${sequence}`,
  leaseStartDate: new Date(2022, 1),
  leaseEndDate: undefined,
  status: LeaseStatus.Active,
  tenantContactIds: undefined,
  tenants: undefined,
  rentalPropertyId: '605-703-00-0014',
  rentalProperty: undefined,
  type: 'P-plats (intern)',
  rentInfo: undefined,
  address: {
    street: 'Testgatan',
    number: '123',
    postalCode: '723 40',
    city: 'Västerås',
  },
  noticeGivenBy: undefined,
  noticeDate: undefined,
  noticeTimeTenant: undefined,
  preferredMoveOutDate: undefined,
  terminationDate: undefined,
  contractDate: new Date(2021, 11),
  lastDebitDate: undefined,
  approvalDate: new Date(2021, 12),
  residentialArea: {
    code: 'MAL',
    caption: 'Malmaberg',
  },
}))

//todo: use properly defined interface
const ApplicantFactory = Factory.define<any, { currentHousingContract: Lease }>(
  ({ sequence, params }) => ({
    id: `${sequence}`,
    name: 'Test Testsson',
    contactCode: `P${158769 + sequence}`,
    applicationDate: new Date().toISOString(),
    applicationType: 'Additional',
    status: 1,
    listingId: 3030, //todo: sequence?
    queuePoints: 6, //todo: rand
    address: {
      street: 'Aromas väg 8B',
      number: '',
      postalCode: '73439',
      city: 'Hallstahammar',
    },
    currentHousingContract: params.currentHousingContract,
    upcomingHousingContract: params.upcomingHousingContract,
    parkingSpaceContracts: [],
    priority: 0,
  })
)

//todo: remove params?
const ListingFactory = Factory.define<Listing>(({ sequence, params }) => ({
  id: sequence + 1,
  rentalObjectCode: `R${sequence + 1000}`,
  address: 'Sample Address',
  monthlyRent: 1000,
  districtCaption: 'Malmaberg',
  districtCode: 'MAL',
  blockCaption: 'LINDAREN 2',
  blockCode: '1401',
  objectTypeCaption: 'Carport',
  objectTypeCode: 'CPORT',
  rentalObjectTypeCaption: 'Standard hyresobjektstyp',
  rentalObjectTypeCode: 'STD',
  publishedFrom: new Date(),
  publishedTo: new Date(),
  vacantFrom: new Date(),
  status: ListingStatus.Active,
  waitingListType: 'Bilplats (intern)',
  applicants: [], //todo: should we supply applicants here? Do we need to validate that applicant relationship actually exists or just trust the database?
}))

export { LeaseFactory, ApplicantFactory, ListingFactory }
