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
        fields: ["id", "customer.*", "metadata", "items.*"],
        filters: {
          id: cart.id,
        },
      },
      {
        throwIfKeyNotFound: true,
      }
    )

    const fullCart = carts[0] as any
    const pointsCost = fullCart.metadata?.points_cost

    // Guard: block checkout if cart has points-only items without coin redemption
    for (const item of fullCart.items || []) {
      const configs = await service.listVariantPointConfigs({
        variant_id: item.variant_id,
      })
      const config = configs[0]
      if (config?.payment_type === "points" && !pointsCost) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Cart contains coins-only items. Please redeem coins before checkout."
        )
      }
    }

    if (!pointsCost) {
      return
    }

    const customerId = fullCart.customer?.id
    if (!customerId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer required for coin redemption"
      )
    }

    // Validate only — actual deduction happens in order.placed subscriber
    const balance = await service.getBalance(customerId)
    if (balance < pointsCost) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Insufficient coins. Required: ${pointsCost}, Available: ${balance}`
      )
    }
  }
)
