import { OfferWithRentalObjectCodeFactory } from '../factories/offer'

jest.mock('onecore-utilities', () => {
  return {
    logger: {
      info: () => {
        return
      },
      error: () => {
        return
      },
    },
  }
})

import request from 'supertest'
import Koa from 'koa'
import KoaRouter from '@koa/router'
import bodyParser from 'koa-bodyparser'
import { OfferStatus } from 'onecore-types'

import { routes } from '../../routes/offers'
import * as offerAdapter from '../../adapters/offer-adapter'
import * as factory from '../factories'
import { detailedApplicant, offerWithRentalObjectCode } from '../factories'

const app = new Koa()
const router = new KoaRouter()
routes(router)
app.use(bodyParser())
app.use(router.routes())

describe('offers', () => {
  describe('POST /offer', () => {
    it('responds with 400 if request params are missing', async () => {
      const res = await request(app.callback()).post('/offer')
      expect(res.status).toBe(400)
    })

    it('responds with 400 if request params are invalid', async () => {
      const payload = {
        status: 'foo',
        listingId: 1,
        applicantId: 1,
        selectedApplicants: [],
        expiresAt: new Date().toISOString(),
      }

      const res = await request(app.callback()).post('/offer').send(payload)

      expect(res.status).toBe(400)
      expect(res.body.data).toEqual([
        {
          message: "Invalid enum value. Expected 1 | 2 | 3 | 4, received 'foo'",
          path: ['status'],
        },
      ])
    })

    it('creates an offer', async () => {
      const offer = factory.offer.build()
      jest.spyOn(offerAdapter, 'create').mockResolvedValueOnce(offer)

      const payload = {
        status: OfferStatus.Active,
        listingId: 1,
        applicantId: 1,
        selectedApplicants: [],
        expiresAt: new Date().toISOString(),
      }

      const res = await request(app.callback()).post('/offer').send(payload)
      const expected = {
        ...offer,
        expiresAt: offer.expiresAt.toISOString(),
        createdAt: offer.createdAt.toISOString(),
      }

      expect(res.status).toBe(201)
      expect(res.body.data.createdAt).toBeDefined()
      expect(res.body.data.listingId).toEqual(expected.listingId)
      expect(res.body.data.expiresAt).toEqual(expected.expiresAt)
    })
  })
  describe('GET /contacts/:contactCode/offers', () => {
    it('responds with 404 if contact not found', async () => {
      jest.spyOn(offerAdapter, 'getOffersForContact').mockResolvedValueOnce([])
      const res = await request(app.callback()).get(
        '/contacts/NON_EXISTING_CONTACT_CODE/offers'
      )
      expect(res.status).toBe(404)
      expect(res.body.data).toBeUndefined()
    })

    it('responds with 200 if contact not found', async () => {
      const applicant = factory.detailedApplicant.build()
      const offer = factory.offerWithRentalObjectCode.build({
        offeredApplicant: applicant,
      })

      jest
        .spyOn(offerAdapter, 'getOffersForContact')
        .mockResolvedValueOnce([offer])
      const res = await request(app.callback()).get(
        `/contacts/${applicant.contactCode}/offers`
      )
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(1)
      expect(res.body.data[0].listingId).toEqual(offer.listingId)
      expect(res.body.data[0].offeredApplicant.contactCode).toEqual(
        offer.offeredApplicant.contactCode
      )
    })
  })
})
