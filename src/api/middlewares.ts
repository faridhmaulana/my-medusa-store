import {
  defineMiddlewares,
  validateAndTransformBody,
  authenticate,
} from "@medusajs/framework/http"
import { PostAdminCustomerPointsSchema, PostAdminVariantPointConfigSchema } from "./admin/validators"
import { PostStoreRedeemPointsSchema } from "./store/validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/customers/:id/points",
      method: "POST",
      middlewares: [
        validateAndTransformBody(PostAdminCustomerPointsSchema),
      ],
    },
    {
      matcher: "/admin/variants/:id/point-config",
      method: "POST",
      middlewares: [
        validateAndTransformBody(PostAdminVariantPointConfigSchema),
      ],
    },
    {
      matcher: "/store/customers/me/points",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
    {
      matcher: "/store/customers/me/points/redeem",
      method: "POST",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(PostStoreRedeemPointsSchema),
      ],
    },
  ],
})
