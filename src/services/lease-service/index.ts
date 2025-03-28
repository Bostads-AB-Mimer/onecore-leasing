import KoaRouter from '@koa/router'
import { routes as offerRoutes } from './routes/offers'
import { routes as contactRoutes } from './routes/contacts'
import { routes as invoiceRoutes } from './routes/invoices'
import { routes as leaseRoutes } from './routes/leases'
import { routes as leaseV2Routes } from './routes/leases-v2'
import { routes as listingRoutes } from './routes/listings'
import { routes as applicantsRoutes } from './routes/applicants'

export const routes = (router: KoaRouter) => {
  applicantsRoutes(router)
  offerRoutes(router)
  contactRoutes(router)
  invoiceRoutes(router)
  leaseV2Routes(router)
  leaseRoutes(router)
  listingRoutes(router)
}
