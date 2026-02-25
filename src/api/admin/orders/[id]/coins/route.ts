import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { POINT_BALANCE_MODULE } from "../../../../../modules/pointBalance"
import PointBalanceModuleService from "../../../../../modules/pointBalance/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id: orderId } = req.params
  const query = req.scope.resolve("query")
  const service: PointBalanceModuleService = req.scope.resolve(
    POINT_BALANCE_MODULE
  )

  // Get the order with cart and items
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "cart.*",
      "cart.metadata",
      "cart.items.*",
      "cart.items.variant_id",
      "cart.items.title",
      "cart.items.quantity",
      "cart.items.variant.title",
    ],
    filters: { id: orderId },
  })

  if (!orders.length) {
    res.status(404).json({ message: "Order not found" })
    return
  }

  const order = orders[0] as any
  const cart = order.cart
  const cartMetadata = cart?.metadata || null

  if (!cart?.id) {
    res.json({ coins_used: 0, cart_metadata: null, transactions: [], items: [] })
    return
  }

  // Get variant IDs from cart items
  const variantIds = (cart.items || []).map((item: any) => item.variant_id).filter(Boolean)

  // Get point configs for these variants using remote query
  let pointConfigs: any[] = []
  if (variantIds.length > 0) {
    const { data: configs } = await query.graph({
      entity: "variant_point_config",
      fields: ["id", "variant_id", "payment_type", "point_price"],
      filters: { variant_id: variantIds },
    })
    pointConfigs = configs || []
  }

  // Create a map of variant_id -> point_config
  const configMap = new Map()
  pointConfigs.forEach((config: any) => {
    configMap.set(config.variant_id, config)
  })

  // Filter items paid with coins
  const redeemedVariantIds = cartMetadata?.redeemed_variant_ids || []
  const coinItems = (cart.items || []).filter((item: any) => {
    const pointConfig = configMap.get(item.variant_id)
    if (!pointConfig) return false

    // "points" items are always paid with coins
    if (pointConfig.payment_type === "points") return true

    // "both" items only if redeemed
    if (
      pointConfig.payment_type === "both" &&
      redeemedVariantIds.includes(item.variant_id)
    ) {
      return true
    }

    return false
  })

  // Find point transactions linked to this order's cart
  const transactions = await service.listPointTransactions(
    {
      reference_id: cart.id,
      reference_type: "cart",
    },
    { order: { created_at: "DESC" } }
  )

  const coinsUsed = transactions.reduce((sum, tx) => {
    return tx.type === "spend" ? sum + tx.points : sum
  }, 0)

  res.json({
    coins_used: coinsUsed,
    cart_metadata: cartMetadata,
    transactions,
    items: coinItems.map((item: any) => {
      const pointConfig = configMap.get(item.variant_id)
      const coinPrice = pointConfig?.point_price || 0
      return {
        id: item.id,
        title: item.title,
        variant_title: item.variant?.title || "",
        quantity: item.quantity,
        coin_price: coinPrice,
        total_coins: coinPrice * item.quantity,
      }
    }),
  })
}
