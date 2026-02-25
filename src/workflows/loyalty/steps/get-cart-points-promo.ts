import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type GetCartPointsPromoStepInput = {
  cart: {
    metadata?: Record<string, any> | null
  }
}

export type GetCartPointsPromoStepOutput = {
  id: string
  code: string
}

export const getCartPointsPromoStep = createStep(
  "get-cart-points-promo",
  async (
    input: GetCartPointsPromoStepInput,
    { container }
  ): Promise<StepResponse<GetCartPointsPromoStepOutput>> => {
    const promoId = input.cart.metadata?.points_promo_id

    if (!promoId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No coin redemption found on this cart"
      )
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: promotions } = await query.graph({
      entity: "promotion",
      fields: ["id", "code"],
      filters: { id: promoId },
    })

    const promo = promotions[0]

    if (!promo || !promo.code) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Coin promotion not found"
      )
    }

    return new StepResponse({
      id: promo.id,
      code: promo.code,
    })
  }
)
