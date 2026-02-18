import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { redeemPointsOnCartWorkflow } from "../../../../../../workflows/loyalty/redeem-points-on-cart"
import { PostStoreRedeemPointsSchemaType } from "../../../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<PostStoreRedeemPointsSchemaType>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Not authenticated" })
    return
  }

  const { cart_id } = req.validatedBody

  const { result } = await redeemPointsOnCartWorkflow(req.scope).run({
    input: {
      cart_id,
      customer_id: customerId,
    },
  })

  res.json({ cart: result })
}
