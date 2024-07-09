import KoaRouter from '@koa/router'
import { OfferStatus } from 'onecore-types'
import { logger } from 'onecore-utilities'
import { z } from 'zod'

import * as offerAdapter from './../adapters/offer-adapter'
import { parseRequestBody } from '../../../middlewares/parse-request-body'
import swaggerJsdoc from 'swagger-jsdoc'

export const routes = (router: KoaRouter) => {
  const createOfferRequestParams = z.object({
    expiresAt: z.coerce.date(),
    status: z.nativeEnum(OfferStatus),
    selectedApplicants: z.any().array(),
    listingId: z.coerce.number(),
    applicantId: z.number(),
  })

  /**
   * @swagger
   * /offer:
   *   get:
   *     description: Welcome to swagger-jsdoc!
   *     responses:
   *       200:
   *         description: Returns a mysterious string.
   */
  router.post(
    '(.*)/offer',
    parseRequestBody(createOfferRequestParams),
    async (ctx) => {
      try {
        const offer = await offerAdapter.create(ctx.request.body)

        ctx.status = 201
        ctx.body = { data: offer }
      } catch (err) {
        logger.error(err, 'Error creating offer: ')
        ctx.status = 500
      }
    }
  )

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Hello World',
        version: '1.0.0',
      },
    },
    apis: ['./src/services/lease-service/routes/*.ts'],
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  }

  const swaggerSpec = swaggerJsdoc(options)

  router.get('/swagger.json', async function (ctx) {
    ctx.set('Content-Type', 'application/json')
    ctx.body = swaggerSpec
  })
}
