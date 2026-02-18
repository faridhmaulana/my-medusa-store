import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { POINT_BALANCE_MODULE } from "../../../modules/pointBalance"
import PointBalanceModuleService from "../../../modules/pointBalance/service"

export type ValidateCartPointsOnlyStepInput = {
  variant_ids: string[]
  customer_id: string
  total_point_cost: number
}

export const validateCartPointsOnlyStep = createStep(
  "validate-cart-points-only",
  async (input: ValidateCartPointsOnlyStepInput, { container }) => {
    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    for (const variantId of input.variant_ids) {
      const configs = await service.listVariantPointConfigs({
        variant_id: variantId,
      })
      const config = configs[0]

      if (!config) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant ${variantId} does not have a point configuration`
        )
      }

      if (config.payment_type === "currency") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant ${variantId} can only be purchased with currency, not points`
        )
      }

      if (config.point_price === null || config.point_price === undefined) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant ${variantId} does not have a point price set`
        )
      }
    }

    const balance = await service.getBalance(input.customer_id)
    if (balance < input.total_point_cost) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Insufficient points. Required: ${input.total_point_cost}, Available: ${balance}`
      )
    }

    return new StepResponse(true)
  }
)
