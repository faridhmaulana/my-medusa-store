import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { POINT_BALANCE_MODULE } from "../../../modules/pointBalance"
import PointBalanceModuleService from "../../../modules/pointBalance/service"

export type ClassifyCartItemsStepInput = {
  items: { variant_id: string; quantity: number; unit_price: number }[]
  customer_id: string
  selected_variant_ids?: string[]
}

export type ClassifyCartItemsStepOutput = {
  total_point_cost: number
  coin_items_currency_total: number
  coin_variant_ids: string[]
}

export const classifyCartItemsStep = createStep(
  "classify-cart-items",
  async (
    input: ClassifyCartItemsStepInput,
    { container }
  ): Promise<StepResponse<ClassifyCartItemsStepOutput>> => {
    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    let totalPointCost = 0
    let coinItemsCurrencyTotal = 0
    const coinVariantIds: string[] = []

    for (const item of input.items) {
      const configs = await service.listVariantPointConfigs({
        variant_id: item.variant_id,
      })
      const config = configs[0]

      // No config or currency-only → skip (stays paid with money)
      if (!config || config.payment_type === "currency") {
        continue
      }

      // "points" items are always coin-eligible (no user choice)
      if (config.payment_type === "points") {
        if (config.point_price === null || config.point_price === undefined) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Variant ${item.variant_id} is coin-eligible but has no coin price set`
          )
        }
        totalPointCost += config.point_price * item.quantity
        coinItemsCurrencyTotal += item.unit_price * item.quantity
        coinVariantIds.push(item.variant_id)
        continue
      }

      // "both" items: include only if explicitly selected
      if (config.payment_type === "both") {
        const isSelected =
          input.selected_variant_ids &&
          input.selected_variant_ids.includes(item.variant_id)

        if (!isSelected) {
          continue
        }

        if (config.point_price === null || config.point_price === undefined) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Variant ${item.variant_id} is coin-eligible but has no coin price set`
          )
        }
        totalPointCost += config.point_price * item.quantity
        coinItemsCurrencyTotal += item.unit_price * item.quantity
        coinVariantIds.push(item.variant_id)
      }
    }

    if (coinVariantIds.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No coin-eligible items in cart"
      )
    }

    const balance = await service.getBalance(input.customer_id)
    if (balance < totalPointCost) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Insufficient coins. Required: ${totalPointCost}, Available: ${balance}`
      )
    }

    return new StepResponse({
      total_point_cost: totalPointCost,
      coin_items_currency_total: coinItemsCurrencyTotal,
      coin_variant_ids: coinVariantIds,
    })
  }
)
