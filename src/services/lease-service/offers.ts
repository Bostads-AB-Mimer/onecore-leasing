import KoaRouter from '@koa/router'
import { z } from 'zod'

import * as offerAdapter from './adapters/offer-adapter'
import { parseRequestBody } from '../../middlewares/parse-request-body'

export const routes = (router: KoaRouter) => {
  const createOfferRequestParams = z.object({
    expiresAt: z.coerce.date(),
    status: z.nativeEnum(offerAdapter.OfferStatus),
    selectedApplicants: z.any().array(),
    listingId: z.coerce.number(),
    offeredApplicant: z.coerce.number(),
  })

  // TODO: Use response type
  const createSuccessResponse = (data: unknown) => ({ data })

  router.post(
    '(.*)/offer',
    parseRequestBody(createOfferRequestParams),
    async (ctx) => {
      try {
        const offer = await offerAdapter.create(ctx.request.body)

        ctx.status = 201
        ctx.body = createSuccessResponse(offer)
      } catch (err) {
        console.log('Error creating offer: ', JSON.stringify(err, null, 2))
        ctx.status = 500
      }
    }
  )
}
