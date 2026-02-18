import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { POINT_BALANCE_MODULE } from "../../modules/pointBalance"
import PointBalanceModuleService from "../../modules/pointBalance/service"

completeCartWorkflow.hooks.validate(
  async ({ cart }, { container }) => {
    const query = container.resolve("query")
    const service: PointBalanceModuleService = container.resolve(
      POINT_BALANCE_MODULE
    )

    const { data: carts } = await query.graph(
      {
        entity: "cart",
        fields: ["id", "customer.*", "metadata"],
        filters: {
          id: cart.id,
        },
      },
      {
        throwIfKeyNotFound: true,
      }
    )

    const pointsCost = (carts[0] as any).metadata?.points_cost
    if (!pointsCost) {
      return
    }

    const customerId = (carts[0] as any).customer?.id
    if (!customerId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer required for coin redemption"
      )
    }

    const balance = await service.getBalance(customerId)
    if (balance < pointsCost) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Insufficient coins. Required: ${pointsCost}, Available: ${balance}`
      )
    }

    const balanceRecord = await service.getOrCreateBalance(customerId)
    await service.updatePointBalances({
      id: balanceRecord.id,
      balance: balanceRecord.balance - pointsCost,
    })

    await service.createPointTransactions({
      customer_id: customerId,
      type: "spend",
      points: pointsCost,
      reason: "Coin redemption for order",
      reference_id: cart.id,
      reference_type: "cart",
    })
  }
)
