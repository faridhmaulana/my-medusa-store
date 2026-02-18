import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { POINT_BALANCE_MODULE } from "../../../modules/pointBalance"
import PointBalanceModuleService from "../../../modules/pointBalance/service"

export type CalculateCartPointTotalStepInput = {
  items: { variant_id: string; quantity: number }[]
}

export const calculateCartPointTotalStep = createStep(
  "calculate-cart-point-total",
  async (input: CalculateCartPointTotalStepInput, { container }) => {
    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    let totalPoints = 0
    for (const item of input.items) {
      const configs = await service.listVariantPointConfigs({
        variant_id: item.variant_id,
      })
      const config = configs[0]
      if (config?.point_price) {
        totalPoints += config.point_price * item.quantity
      }
    }

    return new StepResponse(totalPoints)
  }
)
