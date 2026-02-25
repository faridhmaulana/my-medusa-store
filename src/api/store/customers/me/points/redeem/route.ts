import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { redeemPointsOnCartWorkflow } from "../../../../../../workflows/loyalty/redeem-points-on-cart"
import { removePointsFromCartWorkflow } from "../../../../../../workflows/loyalty/remove-points-from-cart"
import {
  PostStoreRedeemPointsSchemaType,
  DeleteStoreRedeemPointsSchemaType,
} from "../../../../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<PostStoreRedeemPointsSchemaType>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Not authenticated" })
    return
  }

  const { cart_id, variant_ids } = req.validatedBody

  const { result } = await redeemPointsOnCartWorkflow(req.scope).run({
    input: {
      cart_id,
      customer_id: customerId,
      variant_ids,
    },
  })

  res.json({ cart: result })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest<DeleteStoreRedeemPointsSchemaType>,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Not authenticated" })
    return
  }

  const { cart_id } = req.validatedBody

  const { result } = await removePointsFromCartWorkflow(req.scope).run({
    input: {
      cart_id,
    },
  })

  res.json({ cart: result })
}
