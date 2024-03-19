import request from 'supertest'
import Koa from 'koa'
import KoaRouter from '@koa/router'
import bodyParser from 'koa-bodyparser'

import { routes } from '../index'
import * as xpandSoapAdapter from '../adapters/xpand-soap-adapter'
import { addApplicantToToWaitingList } from '../adapters/xpand-soap-adapter'

const app = new Koa()
const router = new KoaRouter()
routes(router)
app.use(bodyParser())
app.use(router.routes())

  describe('POST contact/waitingList', () => {
    it('should return success', async () => {
      const xpandAdapterSpy = jest
        .spyOn(xpandSoapAdapter, 'addApplicantToToWaitingList')
        .mockResolvedValue()

      const result = await request(app.callback()).post('/contact/waitingList/123')

      expect(xpandAdapterSpy).toHaveBeenCalled()
      expect(result.status).toEqual(201)
    })
})
