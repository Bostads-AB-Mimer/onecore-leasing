import request from 'supertest'
import Koa from 'koa'
import KoaRouter from '@koa/router'
import bodyParser from 'koa-bodyparser'

import { routes } from '../index'
import * as xpandSoapAdapter from '../adapters/xpand-soap-adapter'
import {
  addApplicantToToWaitingList,
  getWaitingList,
} from '../adapters/xpand-soap-adapter'
import { WaitingList } from '../../../../../onecore-types'

const app = new Koa()
const router = new KoaRouter()
routes(router)
app.use(bodyParser())
app.use(router.routes())





const mockedWaitingList: WaitingList[] = [
  {
    ApplicantCaption: 'Foo Bar',
    ContactCode: 'P12345',
    ContractFromApartment: new Date('2024-02-29T23:00:00.000Z'),
    QueuePoints: 45,
    QueuePointsSocialConnection: 0,
    WaitingListFrom: new Date('2024-01-31T23:00:00.000Z'),
    WaitingListTypeCaption: 'Bostad',
  },
  {
    ApplicantCaption: 'Foo Bar',
    ContactCode: 'P12345',
    ContractFromApartment: new Date('2024-02-29T23:00:00.000Z'),
    QueuePoints: 45,
    QueuePointsSocialConnection: 0,
    WaitingListFrom: new Date('2024-01-31T23:00:00.000Z'),
    WaitingListTypeCaption: 'Bilplats (intern)',
  },
]
describe('GET contact/waitingList', () => {
  it('should return success', async () => {
    const xpandAdapterSpy = jest
      .spyOn(xpandSoapAdapter, 'getWaitingList')
      .mockResolvedValue(mockedWaitingList)

    const result = await request(app.callback()).get('/contact/waitingList/123')

    expect(xpandAdapterSpy).toHaveBeenCalled()
    expect(result.status).toEqual(200)
  })
})

describe('POST contact/waitingList', () => {
  it('should return success', async () => {
    const xpandAdapterSpy = jest
      .spyOn(xpandSoapAdapter, 'addApplicantToToWaitingList')
      .mockResolvedValue()

    const result = await request(app.callback()).post(
      '/contact/waitingList/123'
    )

    expect(xpandAdapterSpy).toHaveBeenCalled()
    expect(result.status).toEqual(201)
  })
})
