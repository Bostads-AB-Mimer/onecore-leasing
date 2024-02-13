/**
 * Self-contained service, ready to be extracted into a microservice if appropriate.
 *
 * All adapters such as database clients etc. should go into subfolders of the service,
 * not in a general top-level adapter folder to avoid service interdependencies (but of
 * course, there are always exceptions).
 */
import KoaRouter from '@koa/router'
import {
  getLeasesFor,
  getContact,
  getLease,
} from './adapters/tenant-lease-adapter'

export const routes = (router: KoaRouter) => {
  /**
   * Returns leases for a national registration number with populated sub objects
   */
  router.get('(.*)/leases/for/:pnr', async (ctx) => {
    const responseData = await getLeasesFor(ctx.params.pnr)

    ctx.body = {
      data: responseData,
    }
  })

  /**
   * Returns a lease with populated sub objects
   */
  router.get('(.*)/leases/:id', async (ctx) => {
    const responseData = await getLease(ctx.params.id)

    ctx.body = {
      data: responseData,
    }
  })

  //todo: determine if this endpoint is needed
  //todo: getting ALL contracts is not feasible in the xpand context
  //todo: passing a list of ids is not really suitable as query params?
  //todo: koa-querystring lib could solve the above problem
  /**
   * Returns all leases with populated sub objects
   */
  // router.get('(.*)/leases', async (ctx) => {
  //   const leases = await getLeases(leaseIds)
  //
  //   ctx.body = {
  //     data: leases,
  //   }
  // })

  router.get('/example', async (ctx) => {
    // Retrieve the list from the query parameter
    const list = ctx.query.list;

    // Check if the list is provided
    if (!list) {
      ctx.throw(400, 'List parameter is required');
      return;
    }

    // Split the comma-separated string into an array
    const listArray = list.split(',');

    ctx.body = {
      list: listArray
    };
  });

  /**
   * Gets a person.
   */

  router.get('(.*)/contact/:pnr', async (ctx: any) => {
    const responseData = await getContact(ctx.params.pnr)

    ctx.body = {
      data: responseData,
    }
  })
}
