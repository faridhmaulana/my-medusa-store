import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { POINT_BALANCE_MODULE } from "../../../modules/pointBalance"
import PointBalanceModuleService from "../../../modules/pointBalance/service"

export type UpsertVariantPointConfigStepInput = {
  variant_id: string
  payment_type: "currency" | "points" | "both"
  point_price: number | null
}

export const upsertVariantPointConfigStep = createStep(
  "upsert-variant-point-config",
  async (input: UpsertVariantPointConfigStepInput, { container }) => {
    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    const existing = await service.listVariantPointConfigs({
      variant_id: input.variant_id,
    })
    const previousConfig = existing[0] || null

    const result = await service.upsertVariantPointConfig(
      input.variant_id,
      input.payment_type,
      input.point_price
    )

    return new StepResponse(result, {
      config_id: result.id,
      previous_payment_type: previousConfig?.payment_type || null,
      previous_point_price: previousConfig?.point_price || null,
      was_new: !previousConfig,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    if (compensationData.was_new) {
      await service.deleteVariantPointConfigs(compensationData.config_id)
    } else {
      await service.updateVariantPointConfigs({
        id: compensationData.config_id,
        payment_type: compensationData.previous_payment_type as "currency" | "points" | "both",
        point_price: compensationData.previous_point_price,
      })
    }
  }
)
