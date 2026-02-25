import { updateCartPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError, PromotionActions } from "@medusajs/framework/utils"

updateCartPromotionsWorkflow.hooks.validate(
  async ({ input, cart }, { container }) => {
    // Only validate when adding or replacing promotions
    if (
      (input.action !== PromotionActions.ADD &&
        input.action !== PromotionActions.REPLACE) ||
      !input.promo_codes ||
      input.promo_codes.length === 0
    ) {
      return
    }

    // Separate coin promotions from regular promotions
    const coinPromoCodes = input.promo_codes.filter((code) =>
      code.startsWith("COINS-")
    )
    const regularPromoCodes = input.promo_codes.filter(
      (code) => !code.startsWith("COINS-")
    )

    // If ONLY coin promotions are being added (no regular promos),
    // this is likely an internal call from redeem-points-on-cart workflow
    // Allow this and skip validation
    if (coinPromoCodes.length > 0 && regularPromoCodes.length === 0) {
      return
    }

    // If there are regular promotions being added, validate

    // Check if cart has coin redemption active
    const pointsCost = cart.metadata?.points_cost as number | undefined

    if (pointsCost && pointsCost > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot apply promotion codes when coins are already redeemed. Please remove coins first.`
      )
    }

    // Block attempts to manually add coin promotions along with regular promotions
    if (coinPromoCodes.length > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Coin promotions are managed automatically and cannot be manually added.`
      )
    }
  }
)
