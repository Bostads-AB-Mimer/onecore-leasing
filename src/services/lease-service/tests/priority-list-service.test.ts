import { Applicant, Contact, WaitingList } from 'onecore-types'
import {
  getDetailedApplicantInformation,
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
  it('should throw error if no Bostadskontrakt found for applicant', async () => {
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
