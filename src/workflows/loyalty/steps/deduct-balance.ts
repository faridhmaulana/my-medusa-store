import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { POINT_BALANCE_MODULE } from "../../../modules/pointBalance"
import PointBalanceModuleService from "../../../modules/pointBalance/service"

export type DeductBalanceStepInput = {
  customer_id: string
  points: number
  reason?: string
  reference_id?: string
  reference_type?: string
}

export const deductBalanceStep = createStep(
  "deduct-balance",
  async (input: DeductBalanceStepInput, { container }) => {
    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    const balance = await service.getOrCreateBalance(input.customer_id)

    if (balance.balance < input.points) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Insufficient coins. Required: ${input.points}, Available: ${balance.balance}`
      )
    }

    const updated = await service.updatePointBalances({
      id: balance.id,
      balance: balance.balance - input.points,
    })

    await service.createPointTransactions({
      customer_id: input.customer_id,
      type: "spend",
      points: input.points,
      reason: input.reason || "Admin adjustment (deduct)",
      reference_id: input.reference_id,
      reference_type: input.reference_type || "admin_adjustment",
    })

    return new StepResponse(updated, {
      balance_id: balance.id,
      previous_balance: balance.balance,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    await service.updatePointBalances({
      id: compensationData.balance_id,
      balance: compensationData.previous_balance,
    })
  }
)
