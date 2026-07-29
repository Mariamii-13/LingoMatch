import type { Instrumentation } from 'next'

import { reportServerError } from './lib/observability/report.server'

/**
 * Next calls this for every server error it catches that the application did
 * not handle itself: Server Component renders, Server Actions, uncaught route
 * handler throws and proxy failures.
 *
 * Those are exactly the failures a user sees as "Reference: <digest>" on the
 * error screen. Before this hook existed nothing wrote that digest anywhere an
 * operator could search, so a user could quote it and it matched nothing.
 */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const error = err as Error & { digest?: string }

  reportServerError(`${context.routeType} ${context.routePath || request.path}`, error, {
    digest: error.digest,
    request: {
      path: request.path,
      method: request.method,
      headers: request.headers,
    },
    context: {
      routerKind: context.routerKind,
      routeType: context.routeType,
      routePath: context.routePath,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  })
}
