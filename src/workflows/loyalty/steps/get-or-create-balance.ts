import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { POINT_BALANCE_MODULE } from "../../../modules/pointBalance"
import PointBalanceModuleService from "../../../modules/pointBalance/service"

export type GetOrCreateBalanceStepInput = {
  customer_id: string
  points: number
  reason?: string
}

export const getOrCreateBalanceStep = createStep(
  "get-or-create-balance",
  async (input: GetOrCreateBalanceStepInput, { container }) => {
    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    const balance = await service.getOrCreateBalance(input.customer_id)
    const previousBalance = balance.balance

    const updated = await service.updatePointBalances({
      id: balance.id,
      balance: previousBalance + input.points,
    })

    await service.createPointTransactions({
      customer_id: input.customer_id,
      type: "earn",
      points: input.points,
      reason: input.reason || "Admin adjustment (add)",
      reference_type: "admin_adjustment",
    })

    return new StepResponse(updated, {
      balance_id: balance.id,
      previous_balance: previousBalance,
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
