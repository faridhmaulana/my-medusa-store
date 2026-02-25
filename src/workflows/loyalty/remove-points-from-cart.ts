import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import {
  useQueryGraphStep,
  updateCartsStep,
  updatePromotionsStep,
  acquireLockStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"
import { updateCartPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { PromotionActions } from "@medusajs/framework/utils"
import { getCartPointsPromoStep } from "./steps/get-cart-points-promo"

type RemovePointsFromCartWorkflowInput = {
  cart_id: string
}

const cartFields = [
  "id",
  "customer.*",
  "promotions.*",
  "promotions.application_method.*",
  "promotions.rules.*",
  "promotions.rules.values.*",
  "currency_code",
  "total",
  "metadata",
]

export const removePointsFromCartWorkflow = createWorkflow(
  "remove-points-from-cart",
  function (input: RemovePointsFromCartWorkflowInput) {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: cartFields,
      filters: {
        id: input.cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const cartData = transform({ carts }, (data) => {
      return { cart: data.carts[0] as any }
    })

    const loyaltyPromo = getCartPointsPromoStep(cartData)

    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    const removePromoData = transform(
      { input, loyaltyPromo },
      (data) => {
        return {
          cart_id: data.input.cart_id,
          promo_codes: [data.loyaltyPromo.code],
          action: PromotionActions.REMOVE,
        }
      }
    )

    updateCartPromotionsWorkflow.runAsStep({
      input: removePromoData,
    })

    const newMetadata = transform({ carts }, (data) => {
      const cart = data.carts[0] as any
      const existing = cart.metadata || {}
      return {
        ...existing,
        points_promo_id: null,
        points_cost: null,
        redeemed_variant_ids: null,
      }
    })

    updateCartsStep([
      {
        id: input.cart_id,
        metadata: newMetadata,
      },
    ])

    updatePromotionsStep([
      {
        id: loyaltyPromo.id,
        status: "inactive",
      },
    ])

    const { data: updatedCarts } = useQueryGraphStep({
      entity: "cart",
      fields: cartFields,
      filters: { id: input.cart_id },
    }).config({ name: "retrieve-updated-cart" })

    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse(updatedCarts)
  }
)
