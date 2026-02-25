import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { POINT_BALANCE_MODULE } from "../../../modules/pointBalance"
import PointBalanceModuleService from "../../../modules/pointBalance/service"

export type AddBalanceStepInput = {
  customer_id: string
  points: number
  reason?: string
  reference_id?: string
  reference_type?: string
}

export const addBalanceStep = createStep(
  "add-balance",
  async (input: AddBalanceStepInput, { container }) => {
    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    const balance = await service.getOrCreateBalance(input.customer_id)

    const updated = await service.updatePointBalances({
      id: balance.id,
      balance: balance.balance + input.points,
    })

    await service.createPointTransactions({
      customer_id: input.customer_id,
      type: "earn",
      points: input.points,
      reason: input.reason || "Admin adjustment (add)",
      reference_id: input.reference_id,
      reference_type: input.reference_type || "admin_adjustment",
    })

    return new StepResponse(updated, {
      balance_id: balance.id,
      previous_balance: balance.balance,
      points_added: input.points,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData) return

    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    // Rollback: restore previous balance
    await service.updatePointBalances({
      id: compensationData.balance_id,
      balance: compensationData.previous_balance,
    })
  }
)
