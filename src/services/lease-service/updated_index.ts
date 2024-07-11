import KoaRouter from '@koa/router'
import { routes as offerRoutes } from './routes/offers'
import { routes as contactRoutes } from './routes/contacts'
import { routes as invoiceRoutes } from './routes/invoices'
import { routes as leaseRoutes } from './routes/leases'
import { routes as listingRoutes } from './routes/listings'
import { routes as applicantsRoutes } from './routes/applicants'

//todo: this is the new index file that should renamed to index.ts before merge
//todo: keeping the old index to not mess to much with merge conflicts

export const routes = (router: KoaRouter) => {
  applicantsRoutes(router)
  offerRoutes(router)
  contactRoutes(router)
  invoiceRoutes(router)
  leaseRoutes(router)
  listingRoutes(router)
}
