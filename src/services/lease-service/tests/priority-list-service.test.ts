import { Lease, LeaseStatus } from 'onecore-types'
import {
  addPriorityToApplicantsBasedOnRentalRules,
  assignPriorityToApplicantBasedOnRentalRules,
  isLeaseActiveOrUpcoming,
  parseLeasesForHousingContracts,
  parseLeasesForParkingSpaces,
  sortApplicantsBasedOnRentalRules,
} from '../priority-list-service'
import * as factory from './factories'
import { leaseTypes } from '../../../constants/leaseTypes'

//dynamic dates for active and upcoming contracts
const currentDate = new Date()
const thirtyDaysInThePastDate = new Date()
const thirtyDaysInTheFutureDate = new Date()
thirtyDaysInThePastDate.setDate(currentDate.getDate() + 30)
thirtyDaysInTheFutureDate.setDate(currentDate.getDate() + 30)

describe('parseLeasesForHousingContract', () => {
  it('should return 1 housing contract if only 1 active housing contract', async () => {
    const terminatedHousingContract = factory.lease
      .params({
        type: leaseTypes.housingContract,
        leaseStartDate: new Date('2011-01-01T00:00:00.000Z'),
        noticeDate: new Date('2019-09-04T00:00:00.000Z'),
        contractDate: new Date('2010-12-28T00:00:00.000Z'),
        lastDebitDate: new Date('2019-09-30T00:00:00.000Z'),
        approvalDate: new Date('2010-12-28T00:00:00.000Z'),
        status: LeaseStatus.AboutToEnd,
      })
      .build()

    const activeHousingContract = factory.lease
      .params({
        type: leaseTypes.housingContract,
        leaseStartDate: new Date('2019-10-01T00:00:00.000Z'),
        contractDate: new Date('2019-09-04T00:00:00.000Z'),
        approvalDate: new Date('2019-09-04T00:00:00.000Z'),
        status: LeaseStatus.Current,
      })
      .build()

    const activParkingSpaceContract = factory.lease
      .params({
        type: leaseTypes.parkingspaceContract,
        leaseStartDate: new Date('2022-06-29T00:00:00.000Z'),
        contractDate: new Date('2022-06-29T00:00:00.000Z'),
        approvalDate: new Date('2022-06-29T00:00:00.000Z'),
        status: LeaseStatus.Current,
      })
      .build()

    const leases = [
      terminatedHousingContract,
      activeHousingContract,
      activParkingSpaceContract,
    ]

    const filteredLeases: Lease[] = leases.filter(isLeaseActiveOrUpcoming)

    expect(filteredLeases).toHaveLength(2)

    const result = parseLeasesForHousingContracts(filteredLeases)

    expect(result).toBeDefined()
    if (result) {
      expect(result[0]).toBeDefined()
      expect(result[1]).toBeUndefined()
    }
  })

  it('should return 1 active housing contract and 1 upcoming housing contract', async () => {
    const soonToBeTerminatedHousingContract = factory.lease
      .params({
        type: leaseTypes.housingContract,
        leaseStartDate: new Date('2022-02-01T00:00:00.000Z'),
        noticeGivenBy: 'G',
        noticeDate: thirtyDaysInThePastDate,
        noticeTimeTenant: '3',
        preferredMoveOutDate: thirtyDaysInTheFutureDate,
        terminationDate: thirtyDaysInTheFutureDate,
        contractDate: new Date('2021-09-08T00:00:00.000Z'),
        lastDebitDate: thirtyDaysInTheFutureDate,
        approvalDate: new Date('2021-09-08T00:00:00.000Z'),
        status: LeaseStatus.Current,
      })
      .build()

    const upcomingHousingContract = factory.lease
      .params({
        type: leaseTypes.housingContract,
        leaseStartDate: thirtyDaysInTheFutureDate,
        contractDate: new Date('2024-03-11T00:00:00.000Z'),
        approvalDate: new Date('2024-03-11T00:00:00.000Z'),
        status: LeaseStatus.Upcoming,
      })
      .build()

    const parkingSpaceContract = factory.lease
      .params({
        type: leaseTypes.parkingspaceContract,
        leaseStartDate: new Date('2022-02-01T00:00:00.000Z'),
        contractDate: new Date('2021-12-02T00:00:00.000Z'),
        approvalDate: new Date('2021-12-02T00:00:00.000Z'),
        status: LeaseStatus.Current,
      })
      .build()

    const leases = [
      soonToBeTerminatedHousingContract,
      upcomingHousingContract,
      parkingSpaceContract,
    ]

    const filteredLeases: Lease[] = leases.filter(isLeaseActiveOrUpcoming)
    const result = parseLeasesForHousingContracts(filteredLeases)

    expect(filteredLeases).toHaveLength(3)

    expect(result).toBeDefined()
    if (result) {
      expect(result[0]).toBeDefined()
      expect(result[1]).toBeDefined()
    }
  })

  it('should return empty active housing contract and 1 upcoming housing contract', async () => {
    const upcomingHousingContract = factory.lease
      .params({
        type: leaseTypes.housingContract,
        leaseStartDate: thirtyDaysInTheFutureDate,
        contractDate: new Date('2024-03-11T00:00:00.000Z'),
        approvalDate: new Date('2024-03-11T00:00:00.000Z'),
        status: LeaseStatus.Upcoming,
      })
      .build()

    const leases = [upcomingHousingContract]

    const filteredLeases: Lease[] = leases.filter(isLeaseActiveOrUpcoming)
    const result = parseLeasesForHousingContracts(filteredLeases)

    expect(filteredLeases).toHaveLength(1)

    expect(result).toBeDefined()
    if (result) {
      expect(result[0]).toBeUndefined()
      expect(result[1]).toBeDefined()
    }
  })

  it('should return undefined for leases without housing contract', async () => {
    const result = parseLeasesForHousingContracts([])
    expect(result).toBeUndefined()
  })
})

describe('parseLeasesForParkingSpaces', () => {
  it('should return all parking spaces from leases', async () => {
    const housingContract = factory.lease
      .params({
        type: leaseTypes.housingContract,
        status: LeaseStatus.Current,
      })
      .build()

    const parkingSpacContract1 = factory.lease
      .params({
        type: leaseTypes.parkingspaceContract,
        status: LeaseStatus.Current,
      })
      .build()

    const parkingSpacContract2 = factory.lease
      .params({
        type: leaseTypes.parkingspaceContract,
        status: LeaseStatus.Current,
      })
      .build()

    const leases = [
      { ...housingContract, propertyType: 'foo' },
      { ...parkingSpacContract1, propertyType: 'babps' },
      { ...parkingSpacContract2, propertyType: 'babps' },
    ]

    const result = parseLeasesForParkingSpaces(leases)

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    result?.forEach((lease) => {
      expect(lease.type).toEqual(leaseTypes.parkingspaceContract)
    })
  })

  it('should return empty list for leases without parking spaces', async () => {
    const result = parseLeasesForParkingSpaces([])
    expect(result).toEqual([])
  })
})

describe('assignPriorityToApplicantBasedOnRentalRules', () => {
  it('should throw error if applicant does not belong to the same listing', () => {
    const listing = factory.listing.build({ id: 1 })

    const applicant = factory.detailedApplicant.build({ listingId: 2 })

    expect(() =>
      assignPriorityToApplicantBasedOnRentalRules(listing, applicant)
    ).toThrow()
  })

  it('applicant should get priority 1 if no parking space contract and valid housing contract in same residential area as listing', async () => {
    const listing = factory.listing
      .params({
        districtCode: 'XYZ',
      })
      .build()

    const currentHousingContract = factory.lease
      .params({
        residentialArea: {
          code: 'XYZ',
        },
      })
      .build()

    const applicant = factory.detailedApplicant
      .params({
        currentHousingContract: currentHousingContract,
        listingId: listing.id,
      })
      .build()

    const result = assignPriorityToApplicantBasedOnRentalRules(
      listing,
      applicant
    )

    expect(result.priority).toBe(1)
  })

  it('applicant should get priority 1 if no parking space contract and upcoming housing contract in same residential area as listing', () => {
    const listing = factory.listing
      .params({
        districtCode: 'XYZ',
      })
      .build()

    const currentHousingContract = factory.lease
      .params({
        residentialArea: {
          code: 'ABC',
        },
      })
      .build()

    const upcomingHousingContract = factory.lease
      .params({
        residentialArea: {
          code: 'XYZ',
        },
      })
      .build()

    const applicant = factory.detailedApplicant
      .params({
        currentHousingContract: currentHousingContract,
        upcomingHousingContract: upcomingHousingContract,
        listingId: listing.id,
      })
      .build()

    const result = assignPriorityToApplicantBasedOnRentalRules(
      listing,
      applicant
    )

    expect(result.priority).toBe(1)
  })

  it('applicant should get priority 1 if has active parking space contract and applicationType equals Replace', () => {
    const listing = factory.listing.build()

    const parkingSpaceContract = factory.lease.build()

    const applicant = factory.detailedApplicant
      .params({
        applicationType: 'Replace', //todo: add as enum
        parkingSpaceContracts: [parkingSpaceContract],
        currentHousingContract: factory.lease.params({}).build(),
        listingId: listing.id,
      })
      .build()

    const result = assignPriorityToApplicantBasedOnRentalRules(
      listing,
      applicant
    )

    expect(result.priority).toBe(1)
  })

  it('applicant should get priority 2 if has active parking space contract and applicationType equals Additional', () => {
    const listing = factory.listing.build()

    const parkingSpaceContract = factory.lease.build()

    const applicant = factory.detailedApplicant
      .params({
        applicationType: 'Additional', //todo: add as enum
        parkingSpaceContracts: [parkingSpaceContract],
        currentHousingContract: factory.lease.params({}).build(),
        listingId: listing.id,
      })
      .build()

    const result = assignPriorityToApplicantBasedOnRentalRules(
      listing,
      applicant
    )

    expect(result.priority).toBe(2)
  })

  it('applicant should get priority 2 if has more than 1 active parking space contracts and applicationType equals Replace', () => {
    const listing = factory.listing.build()

    const parkingSpaceContract1 = factory.lease.build()

    const parkingSpaceContract2 = factory.lease.build()

    const applicant = factory.detailedApplicant
      .params({
        applicationType: 'Replace', //todo: add as enum
        parkingSpaceContracts: [parkingSpaceContract1, parkingSpaceContract2],
        currentHousingContract: factory.lease.params({}).build(),
        listingId: listing.id,
      })
      .build()

    const result = assignPriorityToApplicantBasedOnRentalRules(
      listing,
      applicant
    )

    expect(result.priority).toBe(2)
  })

  it('applicant should get priority 3 if has more than 2 active parking space contracts applicationType equals Additional', () => {
    const listing = factory.listing.build()

    const parkingSpaceContract1 = factory.lease.build()

    const parkingSpaceContract2 = factory.lease.build()

    const parkingSpaceContract3 = factory.lease.build()

    const applicant = factory.detailedApplicant
      .params({
        applicationType: 'Additional', //todo: add as enum
        parkingSpaceContracts: [
          parkingSpaceContract1,
          parkingSpaceContract2,
          parkingSpaceContract3,
        ],
        currentHousingContract: factory.lease.build(),
        listingId: listing.id,
      })
      .build()

    const result = assignPriorityToApplicantBasedOnRentalRules(
      listing,
      applicant
    )

    expect(result.priority).toBe(3)
  })

  it('applicant should not get a priority if not eligible for renting in area with specific rental rule', () => {
    const listing = factory.listing
      .params({
        districtCode: 'CEN',
      })
      .build()

    const currentHousingContract = factory.lease
      .params({
        residentialArea: {
          code: 'XYZ',
        },
      })
      .build()

    const applicant = factory.detailedApplicant
      .params({
        currentHousingContract: currentHousingContract,
        listingId: listing.id,
      })
      .build()

    const result = assignPriorityToApplicantBasedOnRentalRules(
      listing,
      applicant
    )
    expect(result.priority).toBe(null)
  })
})

describe('sortApplicantsBasedOnRentalRules', () => {
  it('should sort applicants in expected order based on rental rules', () => {
    const listing = factory.listing
      .params({
        districtCode: 'XYZ',
      })
      .build()

    //priority 1 applicant
    //has no parking space contract and active housing contract in same residential area as listing
    const applicant1HousingContract = factory.lease
      .params({
        residentialArea: {
          code: 'XYZ',
        },
      })
      .build()

    const applicant1 = factory.detailedApplicant
      .params({
        currentHousingContract: applicant1HousingContract,
        listingId: listing.id,
        queuePoints: 10,
      })
      .build()

    //priority 1 applicant
    //no parking space contract and upcoming housing contract in same residential area as listing
    const applicant2CurrentHousingContract = factory.lease
      .params({
        residentialArea: {
          code: 'ABC',
        },
      })
      .build()

    const applicant2UpcomingHousingContract = factory.lease
      .params({
        residentialArea: {
          code: 'XYZ',
        },
      })
      .build()

    const applicant2 = factory.detailedApplicant
      .params({
        currentHousingContract: applicant2CurrentHousingContract,
        upcomingHousingContract: applicant2UpcomingHousingContract,
        listingId: listing.id,
        queuePoints: 20,
      })
      .build()

    //priority 1 applicant
    //active parking space contract and applicationType equals Replace
    const applicant3ParkingSpaceContract = factory.lease.build()

    const applicant3 = factory.detailedApplicant
      .params({
        applicationType: 'Replace', //todo: add as enum
        parkingSpaceContracts: [applicant3ParkingSpaceContract],
        currentHousingContract: factory.lease.build(),
        listingId: listing.id,
        queuePoints: 30,
      })
      .build()

    //priority 2 applicant
    //active parking space contract and applicationType equals Additional
    const applicant4ParkingSpaceContract = factory.lease.build()

    const applicant4 = factory.detailedApplicant
      .params({
        applicationType: 'Additional', //todo: add as enum
        parkingSpaceContracts: [applicant4ParkingSpaceContract],
        currentHousingContract: factory.lease.build(),
        listingId: listing.id,
        queuePoints: 40,
      })
      .build()

    //priority 2 applicant
    //more than 1 active parking space contracts and applicationType equals Replace
    const applicant5ParkingSpaceContract1 = factory.lease.build()
    const applicant5ParkingSpaceContract2 = factory.lease.build()

    const applicant5 = factory.detailedApplicant
      .params({
        applicationType: 'Replace', //todo: add as enum
        parkingSpaceContracts: [
          applicant5ParkingSpaceContract1,
          applicant5ParkingSpaceContract2,
        ],
        currentHousingContract: factory.lease.build(),
        listingId: listing.id,
        queuePoints: 50,
      })
      .build()

    //priority 3 applicant
    //has more than 2 active parking space contracts applicationType equals Additional
    const Applicant6parkingSpaceContract1 = factory.lease.build()
    const Applicant6parkingSpaceContract2 = factory.lease.build()
    const Applicant6parkingSpaceContract3 = factory.lease.build()

    const applicant6 = factory.detailedApplicant
      .params({
        applicationType: 'Additional', //todo: add as enum
        parkingSpaceContracts: [
          Applicant6parkingSpaceContract1,
          Applicant6parkingSpaceContract2,
          Applicant6parkingSpaceContract3,
        ],
        currentHousingContract: factory.lease.build(),
        listingId: listing.id,
        queuePoints: 60,
      })
      .build()

    const applicants = [
      applicant1,
      applicant2,
      applicant3,
      applicant4,
      applicant5,
      applicant6,
    ]

    const applicantsWithPriority = addPriorityToApplicantsBasedOnRentalRules(
      listing,
      applicants
    )
    expect(
      applicantsWithPriority.filter((applicant) => applicant.priority === 1)
    ).toHaveLength(3)
    expect(
      applicantsWithPriority.filter((applicant) => applicant.priority === 2)
    ).toHaveLength(2)
    expect(
      applicantsWithPriority.filter((applicant) => applicant.priority === 3)
    ).toHaveLength(1)

    const sortedApplicantsBasedOnRentalRules = sortApplicantsBasedOnRentalRules(
      applicantsWithPriority
    )

    expect(sortedApplicantsBasedOnRentalRules).toHaveLength(applicants.length)

    expect(sortedApplicantsBasedOnRentalRules[0].contactCode).toEqual(
      applicant3.contactCode
    ) //priority 1 and highest queuePoints
    expect(sortedApplicantsBasedOnRentalRules[1].contactCode).toEqual(
      applicant2.contactCode
    ) //priority 1 and second highest queuePoints
    expect(sortedApplicantsBasedOnRentalRules[2].contactCode).toEqual(
      applicant1.contactCode
    ) //priority 1 and third highest queuePoints
    expect(sortedApplicantsBasedOnRentalRules[3].contactCode).toEqual(
      applicant5.contactCode
    ) //priority 2 and fourth highest queuePoints
    expect(sortedApplicantsBasedOnRentalRules[4].contactCode).toEqual(
      applicant4.contactCode
    ) //priority 2 and fifth highest queuePoints
    expect(sortedApplicantsBasedOnRentalRules[5].contactCode).toEqual(
      applicant6.contactCode
    ) //priority 3 and lowest queuePoints
  })

  it('should handle priority 1 applicants with current and upcoming housing contracts', () => {
    const listing = factory.listing
      .params({
        districtCode: 'XYZ',
      })
      .build()

    //priority 1 applicant
    //has no parking space contract and active housing contract in same residential area as listing
    const applicant1HousingContract = factory.lease
      .params({
        residentialArea: {
          code: 'XYZ',
        },
      })
      .build()

    const applicant1 = factory.detailedApplicant
      .params({
        currentHousingContract: applicant1HousingContract,
        listingId: listing.id,
        queuePoints: 20,
      })
      .build()

    //priority 1 applicant
    //has no parking space contract and upcoming housing contract in same residential area as listing
    const applicant2UpcomingHousingContract = factory.lease
      .params({
        type: leaseTypes.housingContract,
        leaseStartDate: thirtyDaysInTheFutureDate,
        contractDate: new Date('2024-03-11T00:00:00.000Z'),
        approvalDate: new Date('2024-03-11T00:00:00.000Z'),
        status: LeaseStatus.Upcoming,
        residentialArea: {
          code: 'XYZ',
        },
      })
      .build()

    const applicant2 = factory.detailedApplicant
      .params({
        upcomingHousingContract: applicant2UpcomingHousingContract,
        listingId: listing.id,
        queuePoints: 10,
      })
      .build()

    const applicants = [applicant1, applicant2]

    const applicantsWithPriority = addPriorityToApplicantsBasedOnRentalRules(
      listing,
      applicants
    )
    expect(
      applicantsWithPriority.filter((applicant) => applicant.priority === 1)
    ).toHaveLength(2)

    const sortedApplicantsBasedOnRentalRules = sortApplicantsBasedOnRentalRules(
      applicantsWithPriority
    )

    expect(sortedApplicantsBasedOnRentalRules).toHaveLength(applicants.length)

    expect(sortedApplicantsBasedOnRentalRules[0].contactCode).toEqual(
      applicant1.contactCode
    )
    expect(sortedApplicantsBasedOnRentalRules[1].contactCode).toEqual(
      applicant2.contactCode
    )
  })

  it('should handle applicants with undefined priority', () => {
    const listing = factory.listing
      .params({
        districtCode: 'XYZ',
      })
      .build()

    //priority 1 applicant
    //has no parking space contract and active housing contract in same residential area as listing
    const applicant1HousingContract = factory.lease
      .params({
        residentialArea: {
          code: 'XYZ',
        },
      })
      .build()

    const applicant1 = factory.detailedApplicant
      .params({
        currentHousingContract: applicant1HousingContract,
        listingId: listing.id,
        queuePoints: 20,
      })
      .build()

    //priority undefined applicant
    //has no active or upcoming housing contract
    const applicant2 = factory.detailedApplicant
      .params({
        currentHousingContract: undefined,
        upcomingHousingContract: undefined,
        listingId: listing.id,
        queuePoints: 10,
      })
      .build()

    const applicants = [applicant1, applicant2]

    const applicantsWithPriority = addPriorityToApplicantsBasedOnRentalRules(
      listing,
      applicants
    )
    expect(
      applicantsWithPriority.filter((applicant) => applicant.priority === 1)
    ).toHaveLength(1)
    expect(
      applicantsWithPriority.filter((applicant) => applicant.priority === null)
    ).toHaveLength(1)

    const sortedApplicantsBasedOnRentalRules = sortApplicantsBasedOnRentalRules(
      applicantsWithPriority
    )

    expect(sortedApplicantsBasedOnRentalRules).toHaveLength(applicants.length)

    expect(sortedApplicantsBasedOnRentalRules[0].contactCode).toEqual(
      applicant1.contactCode
    )
    expect(sortedApplicantsBasedOnRentalRules[1].contactCode).toEqual(
      applicant2.contactCode
    )
  })

  it('should something', () => {
    const listing = factory.listing.build({
      rentalObjectCode: '307-714-00-0042',
      address: 'Högloftsvägen 1-6',
      monthlyRent: 190.45,
      districtCaption: 'Vallby',
      districtCode: 'VAL',
      objectTypeCaption: 'Parkeringsplats utan el',
      objectTypeCode: 'PPLUEL',
      rentalObjectTypeCaption: 'Standard hyresobjektstyp',
      rentalObjectTypeCode: 'STD',
      publishedFrom: new Date('2024-11-19T15:29:06.000Z'),
      publishedTo: new Date('2024-11-25T23:59:59.000Z'),
      vacantFrom: new Date('2023-06-01T00:00:00.000Z'),
      status: 1,
      waitingListType: 'Bilplats (intern)',
    })

    const detailedApplicant = factory.detailedApplicant
      .params({
        applicationType: 'Replace', //todo: add as enum

        parkingSpaceContracts: [
          {
            leaseId: '705-808-00-0007/07',
            leaseNumber: '07',
            rentalPropertyId: '705-808-00-0007',
            type: 'P-Platskontrakt               ',
            leaseStartDate: new Date('2011-11-01T00:00:00.000Z'),
            leaseEndDate: undefined,
            status: 0,
            tenantContactIds: [],
            tenants: [],
            noticeGivenBy: undefined,
            noticeDate: undefined,
            noticeTimeTenant: '3',
            preferredMoveOutDate: undefined,
            terminationDate: undefined,
            contractDate: new Date('2011-10-21T00:00:00.000Z'),
            lastDebitDate: undefined,
            approvalDate: new Date('2011-10-21T00:00:00.000Z'),
            residentialArea: {
              code: 'MAL',
              caption: 'Malmaberg',
            },
            rentalProperty: undefined,
            rentInfo: undefined,
            address: undefined,
          },
          {
            leaseId: '705-808-00-0002/13',
            leaseNumber: '13',
            rentalPropertyId: '705-808-00-0002',
            type: 'P-Platskontrakt               ',
            leaseStartDate: new Date('2023-03-01T00:00:00.000Z'),
            leaseEndDate: undefined,
            status: 0,
            tenantContactIds: [],
            tenants: [],
            noticeGivenBy: undefined,
            noticeDate: undefined,
            noticeTimeTenant: '3',
            preferredMoveOutDate: undefined,
            terminationDate: undefined,
            contractDate: new Date('2024-10-17T00:00:00.000Z'),
            lastDebitDate: undefined,
            approvalDate: undefined,
            residentialArea: {
              code: 'MAL',
              caption: 'Malmaberg',
            },
            rentalProperty: undefined,
            rentInfo: undefined,
            address: undefined,
          },
          {
            leaseId: '705-709-00-0002/05',
            leaseNumber: '05',
            rentalPropertyId: '705-709-00-0002',
            type: 'P-Platskontrakt               ',
            leaseStartDate: new Date('2023-04-01T00:00:00.000Z'),
            leaseEndDate: undefined,
            status: 0,
            tenantContactIds: [],
            tenants: [],
            noticeGivenBy: undefined,
            noticeDate: undefined,
            noticeTimeTenant: '3',
            preferredMoveOutDate: undefined,
            terminationDate: undefined,
            contractDate: new Date('2024-10-17T00:00:00.000Z'),
            lastDebitDate: undefined,
            approvalDate: undefined,
            residentialArea: {
              code: 'MAL',
              caption: 'Malmaberg',
            },
            rentalProperty: undefined,
            rentInfo: undefined,
            address: undefined,
          },
        ],
        currentHousingContract: {
          leaseId: '705-010-01-0201/05',
          leaseNumber: '05',
          rentalPropertyId: '705-010-01-0201',
          type: 'Bostadskontrakt               ',
          leaseStartDate: new Date('2001-11-01T00:00:00.000Z'),
          leaseEndDate: undefined,
          status: 0,
          tenantContactIds: [],
          tenants: [],
          noticeGivenBy: undefined,
          noticeDate: undefined,
          noticeTimeTenant: '3',
          preferredMoveOutDate: undefined,
          terminationDate: undefined,
          contractDate: new Date('2001-11-01T00:00:00.000Z'),
          lastDebitDate: undefined,
          approvalDate: new Date('2001-11-01T00:00:00.000Z'),
          residentialArea: {
            code: 'MAL',
            caption: 'Malmaberg',
          },
        },
        listingId: listing.id,
        queuePoints: 60,
      })
      .build()

    const result = assignPriorityToApplicantBasedOnRentalRules(
      listing,
      detailedApplicant
    )
    expect(result.priority).toBe(null)
  })
})
