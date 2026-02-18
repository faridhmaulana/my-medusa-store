import { MedusaService } from "@medusajs/framework/utils"
import PointBalance from "./models/point-balance"
import PointTransaction from "./models/point-transaction"
import VariantPointConfig from "./models/variant-point-config"

class PointBalanceModuleService extends MedusaService({
  PointBalance,
  PointTransaction,
  VariantPointConfig,
}) {
  async getBalance(customerId: string): Promise<number> {
    const balances = await this.listPointBalances({
      customer_id: customerId,
    })
    return balances[0]?.balance || 0
  }

  async getOrCreateBalance(customerId: string) {
    const existing = await this.listPointBalances({
      customer_id: customerId,
    })

    if (existing.length > 0) {
      return existing[0]
    }

    return await this.createPointBalances({
      customer_id: customerId,
      balance: 0,
    })
  }

  async upsertVariantPointConfig(
    variantId: string,
    paymentType: "currency" | "points" | "both",
    pointPrice: number | null
  ) {
    const existing = await this.listVariantPointConfigs({
      variant_id: variantId,
    })

    if (existing.length > 0) {
      return await this.updateVariantPointConfigs({
        id: existing[0].id,
        payment_type: paymentType,
        point_price: pointPrice,
      })
    }

    return await this.createVariantPointConfigs({
      variant_id: variantId,
      payment_type: paymentType,
      point_price: pointPrice,
    })
  }
}

export default PointBalanceModuleService
