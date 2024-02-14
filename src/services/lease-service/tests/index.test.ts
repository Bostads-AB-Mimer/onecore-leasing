import request from 'supertest'
import Koa from 'koa'
import KoaRouter from '@koa/router'
import bodyParser from 'koa-bodyparser'
import { routes } from '../index'
import * as tenantLeaseAdapter from '../adapters/tenant-lease-adapter'
import { Lease } from 'onecore-types'

const app = new Koa()
const router = new KoaRouter()
routes(router)
app.use(bodyParser())
app.use(router.routes())

describe('lease-service', () => {
  let leaseMock: Array<Lease>

  // Mock until this bug is fixed: https://github.com/kulshekhar/ts-jest/issues/3397
  const LeaseStatus = {
    Active: 0,
  }

  beforeEach(() => {
    leaseMock = [
      {
        leaseId: '406-097-11-0201/06',
        leaseNumber: '06',
        leaseStartDate: new Date('2023-09-07T00:00:00.000Z'),
        leaseEndDate: new Date('2024-09-07T00:00:00.000Z'),
        status: LeaseStatus.Active,
        tenantContactIds: ['P174958'],
        tenants: [
          {
            contactCode: 'P174958',
            contactKey: 'P124854',
            firstName: 'Kalle',
            lastName: 'Testsson',
            fullName: 'Testsson Kalle',
            leaseIds: '406-097-11-0201/06',
            nationalRegistrationNumber: '200009092388',
            birthDate: new Date('2000-09-09T00:00:00.000Z'),
            address: {
              street: 'Bovägen',
              number: '12',
              postalCode: '12345',
              city: 'Westeros',
            },
            phoneNumbers: [
              {
                phoneNumber: '+460123456789',
                type: 'mobtel',
                isMainNumber: true,
              },
            ],
            emailAddress: 'kalle.testsson@test.se',
            isTenant: true,
          },
        ],
        address: {
          street: 'Bovägen',
          number: '12',
          postalCode: '12345',
          city: 'Westeros',
        },
        rentalPropertyId: '406-097-11-0201',
        type: 'Bostadskontrakt',
        rentalProperty: undefined,
        rentInfo: undefined,
        noticeGivenBy: '',
        noticeDate: undefined,
        noticeTimeTenant: '3',
        preferredMoveOutDate: undefined,
        terminationDate: undefined,
        contractDate: new Date('2023-08-11T07:45:09.833Z'),
        lastDebitDate: undefined,
        approvalDate: new Date('2023-08-11T07:45:09.833Z'),
      },
      {
        leaseId: '102-008-03-0202/07',
        leaseNumber: '',
        leaseStartDate: new Date('2010-12-01T00:00:00.000Z'),
        leaseEndDate: undefined,
        status: LeaseStatus.Active,
        tenantContactIds: ['P965338'],
        tenants: [
          {
            contactCode: 'P965338',
            contactKey: 'P965432',
            firstName: 'Maj-Britt',
            lastName: 'Lundberg',
            fullName: 'Maj-Britt Lundberg',
            leaseIds: '102-008-03-0202/07',
            nationalRegistrationNumber: '194808075577',
            birthDate: new Date('1948-08-07T00:00:00.000Z'),
            address: {
              street: 'Gatvägen',
              number: '56',
              postalCode: '72266',
              city: 'Västerås',
            },
            phoneNumbers: [
              {
                phoneNumber: '+460759429414',
                type: 'mobtel',
                isMainNumber: true,
              },
            ],
            emailAddress: 'majbritt-123@mimer.nu',
            isTenant: true,
          },
        ],
        address: {
          street: 'Bovägen',
          number: '12',
          postalCode: '12345',
          city: 'Westeros',
        },
        rentalPropertyId: '102-008-03-0202',
        type: 'Bostadskontrakt',
        rentalProperty: undefined,
        rentInfo: undefined,
        noticeGivenBy: '',
        noticeDate: undefined,
        noticeTimeTenant: '3',
        preferredMoveOutDate: undefined,
        terminationDate: undefined,
        contractDate: new Date('2023-08-11T07:45:09.833Z'),
        lastDebitDate: undefined,
        approvalDate: new Date('2023-08-11T07:45:09.833Z'),
      },
      {
        leaseId: '102-008-03-0202/07',
        leaseNumber: '07',
        leaseStartDate: new Date('2010-12-01T00:00:00.000Z'),
        leaseEndDate: undefined,
        status: LeaseStatus.Active,
        tenantContactIds: ['P965339'],
        tenants: [
          {
            contactCode: 'P965339',
            contactKey: 'P624393',
            firstName: 'Erik',
            lastName: 'Lundberg',
            fullName: 'Erik Lundberg',
            leaseIds: '102-008-03-0202/07',
            nationalRegistrationNumber: '194808075577',
            birthDate: new Date('1945-12-12T00:00:00.000Z'),
            address: {
              street: 'Gatvägen',
              number: '56',
              postalCode: '72266',
              city: 'Västerås',
            },
            phoneNumbers: [
              {
                phoneNumber: '+460759429414',
                type: 'mobtel',
                isMainNumber: true,
              },
            ],
            emailAddress: 'erik.lundberg@mimer.nu',
            isTenant: true,
          },
        ],
        address: {
          street: 'Bovägen',
          number: '12',
          postalCode: '12345',
          city: 'Westeros',
        },
        rentalPropertyId: '102-008-03-0202',
        type: 'Bostadskontrakt',
        rentalProperty: undefined,
        rentInfo: undefined,
        noticeGivenBy: '',
        noticeDate: undefined,
        noticeTimeTenant: '3',
        preferredMoveOutDate: undefined,
        terminationDate: undefined,
        contractDate: new Date('2023-08-11T07:45:09.833Z'),
        lastDebitDate: undefined,
        approvalDate: new Date('2023-08-11T07:45:09.833Z'),
      },
    ]
  })

  describe('GET /getLeasesForNationalRegistrationNumber', () => {
    it('responds with an array of leases', async () => {
      const getLeasesSpy = jest
        .spyOn(tenantLeaseAdapter, 'getLeasesForNationRegistrationNumber')
        .mockResolvedValue(leaseMock)

      const res = await request(app.callback()).get('/leases/for/nationalRegistrationNumber/194808075577')
      expect(res.status).toBe(200)
      expect(res.body.data).toBeInstanceOf(Array)
      expect(getLeasesSpy).toHaveBeenCalled()
      expect(res.body.data.length).toBe(3)
    })
  })

  describe('GET /getLeasesForContactCode', () => {
    it('responds with an array of leases', async () => {
      const getLeasesSpy = jest
        .spyOn(tenantLeaseAdapter, 'getLeasesForContactCode')
        .mockResolvedValue(leaseMock)

      const res = await request(app.callback()).get('/leases/for/contactCode/P965339')
      expect(res.status).toBe(200)
      expect(res.body.data).toBeInstanceOf(Array)
      expect(getLeasesSpy).toHaveBeenCalled()
      expect(res.body.data.length).toBe(3)
    })
  })

  describe('GET /leases/:id', () => {
    it('responds with a lease', async () => {
      const getLeaseSpy = jest
        .spyOn(tenantLeaseAdapter, 'getLease')
        .mockResolvedValue(leaseMock[0])

      const res = await request(app.callback()).get('/leases/1337')
      expect(res.status).toBe(200)
      expect(getLeaseSpy).toHaveBeenCalled()

      expect(res.body.data.leaseId).toEqual('406-097-11-0201/06')
    })
  })
})
