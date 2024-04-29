import { Applicant, Contact, Lease, LeaseStatus, WaitingList } from 'onecore-types'
import {
  getDetailedApplicantInformation, parseLeasesForHousingContract,
  parseLeasesForParkingSpaces,
  parseWaitingListForInternalParkingSpace,
} from '../priority-list-service'
import * as tenantLeaseAdapter from '../adapters/xpand/tenant-lease-adapter'
import * as xpandSoapAdapter from '../adapters/xpand/xpand-soap-adapter'

const mockedApplicant: Applicant = {
  id: 2004,
  name: 'Sökande Fiktiv',
  contactCode: 'P145241',
  applicationDate: new Date('2024-04-23T10:05:07.244Z'),
  status: 1,
  listingId: 2029,
}

const mockedWaitingListWithInteralParkingSpace: WaitingList[] = [
  {
    applicantCaption: 'Foo Bar',
    contactCode: 'P12345',
    contractFromApartment: new Date('2024-02-29T23:00:00.000Z'),
    queuePoints: 45,
    queuePointsSocialConnection: 0,
    waitingListFrom: new Date('2024-01-31T23:00:00.000Z'),
    waitingListTypeCaption: 'Bostad',
  },
  {
    applicantCaption: 'Foo Bar',
    contactCode: 'P12345',
    contractFromApartment: new Date('2024-02-29T23:00:00.000Z'),
    queuePoints: 45,
    queuePointsSocialConnection: 0,
    waitingListFrom: new Date('2024-01-31T23:00:00.000Z'),
    waitingListTypeCaption: 'Bilplats (intern)',
  },
]

const mockedWaitingListWithoutInternalParkingSpace: WaitingList[] = [
  {
    applicantCaption: 'Foo Bar',
    contactCode: 'P12345',
    contractFromApartment: new Date('2024-02-29T23:00:00.000Z'),
    queuePoints: 45,
    queuePointsSocialConnection: 0,
    waitingListFrom: new Date('2024-01-31T23:00:00.000Z'),
    waitingListTypeCaption: 'Bostad',
  },
]

const mockedLeasesWithHousingAndParkingSpaceContracts: Lease[]  = [
  //Bostadskontrakt
  {
    leaseId: "705-022-04-0201/11",
    leaseNumber: "11",
    rentalPropertyId: "705-022-04-0201",
    rentalProperty: undefined,
    type: "Bostadskontrakt",
    leaseStartDate: new Date("2024-03-01T00:00:00.000Z"),
    leaseEndDate: undefined,
    tenantContactIds: [],
    tenants: [
      {
        contactCode: "P174965",
        contactKey: "_6TK0TGIEWV5PGS",
        firstName: "Stina",
        lastName: "Testsson",
        fullName: "Testsson Stina",
        leaseIds: [],
        nationalRegistrationNumber: "195001182046",
        birthDate: new Date("1950-01-18T00:00:00.000Z"),
        address: {
          street: "Testvägen 25",
          number: "",
          postalCode: "12139",
          city: "JOHANNESHOV"
        },
        phoneNumbers: [
          {
            phoneNumber: "0701231231",
            type: "mobil",
            isMainNumber: true
          }
        ],
        emailAddress: "redacted",
        isTenant: false
      }
    ],
    noticeGivenBy: undefined,
    noticeDate: undefined,
    noticeTimeTenant: '3',
    preferredMoveOutDate: undefined,
    terminationDate: undefined,
    contractDate: new Date("2024-02-01T00:00:00.000Z"),
    lastDebitDate: undefined,
    approvalDate: new Date("2024-02-01T00:00:00.000Z")
  },
  //P-Platskontrakt
  {
    leaseId: "508-713-00-0009/19",
    leaseNumber: "19",
    rentalPropertyId: "508-713-00-0009",
    type: "P-Platskontrakt",
    leaseStartDate: "2024-03-01T00:00:00.000Z",
    leaseEndDate: null,
    tenantContactIds: [],
    tenants: [
      {
        contactCode: "P174965",
        contactKey: "_6TK0TGIEWV5PGS",
        firstName: "Stina",
        lastName: "Testsson",
        fullName: "Testsson Stina",
        leaseIds: [],
        nationalRegistrationNumber: "195001182046",
        birthDate: "1950-01-18T00:00:00.000Z",
        address: {
          street: "Testvägen 25",
          number: "",
          postalCode: "12139",
          city: "JOHANNESHOV"
        },
        phoneNumbers: [
          {
            phoneNumber: "0701231231",
            type: "mobil",
            isMainNumber: 1
          }
        ],
        emailAddress: "redacted",
        isTenant: false
      }
    ],
    noticeGivenBy: null,
    noticeDate: null,
    noticeTimeTenant: 3,
    preferredMoveOutDate: null,
    terminationDate: null,
    contractDate: "2024-02-01T00:00:00.000Z",
    lastDebitDate: null,
    approvalDate: "2024-02-01T00:00:00.000Z"
  },
  //P-Platskontrakt
  {
    leaseId: "216-704-00-0017/02",
    leaseNumber: "02",
    rentalPropertyId: "216-704-00-0017",
    type: "P-Platskontrakt",
    leaseStartDate: new Date("2024-04-02T00:00:00.000Z"),
    leaseEndDate: undefined,
    tenantContactIds: [],
    tenants: [
      {
        contactCode: "P174965",
        contactKey: "_6TK0TGIEWV5PGS",
        firstName: "Stina",
        lastName: "Testsson",
        fullName: "Testsson Stina",
        leaseIds: [],
        nationalRegistrationNumber: "195001182046",
        birthDate: new Date('1950-01-18T00:00:00.000Z'),
        address: {
          street: "Testvägen 25",
          number: "",
          postalCode: "12139",
          city: "JOHANNESHOV"
        },
        phoneNumbers: [
          {
            phoneNumber: "0701231231",
            type: "mobil",
            isMainNumber: true
          }
        ],
        emailAddress: "redacted",
        isTenant: false
      }
    ],
    noticeGivenBy: '',
    noticeDate: new Date(),
    noticeTimeTenant: '3',
    preferredMoveOutDate: new Date(),
    terminationDate: new Date(),
    contractDate: new Date(),
    lastDebitDate: new Date(),
    approvalDate: new Date(),
  }
];

//todo: fake sensitive data
const mockedApplicantFromXpand: Contact = {
  contactCode: 'P145241',
  contactKey: '_5YI0VPRJ5GARYV',
  firstName: 'Fiktiv',
  lastName: 'Sökande',
  fullName: 'Sökande Fiktiv',
  leaseIds: [
    '000-000-00-0001/03M2',
    '209-004-02-0201/12M',
    '105-001-17-0102/03M2',
    '105-002-07-0202/10M2',
    '306-001-01-0101/07',
  ],
  nationalRegistrationNumber: '198912157982',
  birthDate: new Date('1989-12-15T00:00:00.000Z'),
  address: {
    number: '',
    street: 'Fiktiggatan 1',
    postalCode: '72222',
    city: 'VÄSTERÅS',
  },
  phoneNumbers: [
    {
      phoneNumber: '0704657064',
      type: 'mobil',
      isMainNumber: true,
    },
    {
      phoneNumber: '021-13333                     ',
      type: 'telarbete      ',
      isMainNumber: false,
    },
  ],
  emailAddress: 'redacted',
  isTenant: true,
}

describe('getDetailedApplicantInformation', () => {
  it('should throw error if applicant not found from contact query', async () => {
    const getContactByContactCodeSpy = jest
      .spyOn(tenantLeaseAdapter, 'getContactByContactCode')
      .mockResolvedValue(null)

    await expect(() =>
      getDetailedApplicantInformation(mockedApplicant)
    ).rejects.toThrow(
      `Applicant ${mockedApplicant.contactCode} not found in contact query`
    )

    expect(getContactByContactCodeSpy).toHaveBeenCalled()
  })

  it('should throw error if waiting list not found for applicant', async () => {
    const tenantLeaseAdapterSpy = jest
      .spyOn(tenantLeaseAdapter, 'getContactByContactCode')
      .mockResolvedValue(mockedApplicantFromXpand)

    const getWaitingListSpy = jest
      .spyOn(xpandSoapAdapter, 'getWaitingList')
      .mockResolvedValue([])

    await expect(() =>
      getDetailedApplicantInformation(mockedApplicant)
    ).rejects.toThrow(
      `Waiting list for internal parking space not found for applicant ${mockedApplicant.contactCode}`
    )

    expect(tenantLeaseAdapterSpy).toHaveBeenCalled()
    expect(getWaitingListSpy).toHaveBeenCalled()
  })

  it('should throw error if leases not found for applicant', async () => {
    const getContactByContactCodeSpy = jest
      .spyOn(tenantLeaseAdapter, 'getContactByContactCode')
      .mockResolvedValue(mockedApplicantFromXpand)

    const getWaitingListSpy = jest
      .spyOn(xpandSoapAdapter, 'getWaitingList')
      .mockResolvedValue(mockedWaitingListWithInteralParkingSpace)

    const getLeasesForContactCodeSpy = jest
      .spyOn(tenantLeaseAdapter, 'getLeasesForContactCode')
      .mockResolvedValue(undefined)

    await expect(() =>
      getDetailedApplicantInformation(mockedApplicant)
    ).rejects.toThrow(
      `Leases not found for applicant ${mockedApplicant.contactCode}`
    )

    expect(getContactByContactCodeSpy).toHaveBeenCalled()
    expect(getWaitingListSpy).toHaveBeenCalled()
    expect(getLeasesForContactCodeSpy).toHaveBeenCalled()
  })

  //todo: is this test necessary?
  it('should throw error if no housing contract found for applicant', async () => {
  })

  it('should return applicant with necessary data on success', async () => {
    //todo: fully defined result object needs to be defined for this test
  })
})

describe('parseWaitingList', () => {
  it('should return waitingList for internal parking space', async () => {
    const result = parseWaitingListForInternalParkingSpace(
      mockedWaitingListWithInteralParkingSpace
    )

    expect(result).toBeDefined()
    expect(result).toEqual(mockedWaitingListWithInteralParkingSpace[1])
  })

  it('should return undefined for waitingList without internal parking space', async () => {
    const result = parseWaitingListForInternalParkingSpace(
      mockedWaitingListWithoutInternalParkingSpace
    )
    expect(result).toBeUndefined()
  })
})

describe('parseLeasesForHousingContract', () => {
  it('should return housing contract from leases', async () => {
    const result = parseLeasesForHousingContract(
      mockedLeasesWithHousingAndParkingSpaceContracts
    )

    //todo: make assertions when decision on result format decided
  })

  //todo: write test for upcoming housing contract?

  it('should return undefined for leases without housing contract', async () => {
    const result = parseLeasesForHousingContract(
      []
    )
    expect(result).toBeUndefined()
  })
})

describe('parseLeasesForParkingSpaces', () => {
  it('should return all parking spaces from leases', async () => {
    const result = parseLeasesForParkingSpaces(
      mockedLeasesWithHousingAndParkingSpaceContracts
    )

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2)
    result!.forEach((lease, index) => {
      expect(lease.type).toEqual('P-Platskontrakt')
    })
  })

  it('should return empty list for leases without parking spaces', async () => {
      const result = parseLeasesForParkingSpaces(
        []
      )
      expect(result).toEqual([])
  })
})
