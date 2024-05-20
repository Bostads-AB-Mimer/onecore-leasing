import request from 'supertest'
import Koa from 'koa'
import KoaRouter from '@koa/router'
import bodyParser from 'koa-bodyparser'

import { routes } from '../offers'
import * as offerAdapter from '../adapters/offer-adapter'
import { OfferFactory } from './factory'

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
        status: offerAdapter.OfferStatus.Active,
        listingId: 1,
        offeredApplicant: 1,
      }

      const res = await request(app.callback()).post('/offer').send(payload)

      expect(res.status).toBe(400)
      expect(res.body.data).toEqual([
        { message: 'Invalid date', path: ['expiresAt'] },
        { message: 'Required', path: ['selectedApplicants'] },
      ])
    })

    it('creates an offer', async () => {
      const offer = OfferFactory.build()
      jest.spyOn(offerAdapter, 'create').mockResolvedValueOnce(offer)

      const payload = {
        status: offerAdapter.OfferStatus.Active,
        listingId: 1,
        offeredApplicant: 1,
        selectedApplicants: [],
        expiresAt: new Date().toISOString(),
      }

      const res = await request(app.callback()).post('/offer').send(payload)
      const expected = { ...offer, expiresAt: offer.expiresAt.toISOString() }

      expect(res.status).toBe(201)
      expect(res.body.data).toEqual(expected)
    })
  })
})
