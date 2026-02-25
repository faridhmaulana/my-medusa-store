import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import {
  useQueryGraphStep,
  createPromotionsStep,
  updateCartsStep,
  acquireLockStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"
import { updateCartPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { PromotionActions } from "@medusajs/framework/utils"
import { classifyCartItemsStep } from "./steps/classify-cart-items"

type RedeemPointsOnCartWorkflowInput = {
  cart_id: string
  customer_id: string
  variant_ids?: string[]
}

const CUSTOMER_ID_RULE_ATTR = "customer.id"

const cartFields = [
  "id",
  "customer.*",
  "items.*",
  "items.product.*",
  "items.unit_price",
  "promotions.*",
  "promotions.application_method.*",
  "promotions.rules.*",
  "promotions.rules.values.*",
  "currency_code",
  "total",
  "metadata",
]

export const redeemPointsOnCartWorkflow = createWorkflow(
  "redeem-points-on-cart",
  function (input: RedeemPointsOnCartWorkflowInput) {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: cartFields,
      filters: {
        id: input.cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const itemsData = transform({ carts }, (data) => {
      const cart = data.carts[0] as any
      return {
        items: cart.items.map((item: any) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      }
    })

    const classificationResult = classifyCartItemsStep({
      items: itemsData.items,
      customer_id: input.customer_id,
      selected_variant_ids: input.variant_ids,
    })

    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    const promoToCreate = transform(
      { carts, classificationResult },
      (data) => {
        const cart = data.carts[0] as any
        const randomStr = Math.random().toString(36).substring(2, 8)
        const uniqueId = ("COINS-" + randomStr).toUpperCase()

        return {
          code: uniqueId,
          type: "standard" as const,
          status: "active" as const,
          application_method: {
            type: "fixed" as const,
            value: data.classificationResult.coin_items_currency_total,
            target_type: "order" as const,
            currency_code: cart.currency_code,
            allocation: "across" as const,
          },
          rules: [
            {
              attribute: CUSTOMER_ID_RULE_ATTR,
              operator: "eq" as const,
              values: [cart.customer!.id],
            },
          ],
          campaign: {
            name: uniqueId,
            description: "Coin redemption",
            campaign_identifier: uniqueId,
            budget: {
              type: "usage" as const,
              limit: 1,
            },
          },
        }
      }
    )

    const loyaltyPromo = createPromotionsStep([promoToCreate] as any)

    const updatePromoData = transform(
      { carts, promoToCreate, loyaltyPromo },
      (data) => {
        const cart = data.carts[0] as any
        const existingCodes = (
          cart.promotions
            ?.map((promo: any) => promo?.code)
            .filter(Boolean) || []
        ) as string[]

        return {
          cart_id: cart.id,
          promo_codes: [...existingCodes, data.promoToCreate.code],
          action: PromotionActions.ADD,
        }
      }
    )

    updateCartPromotionsWorkflow.runAsStep({
      input: updatePromoData,
    })

    const cartMetadata = transform(
      { carts, loyaltyPromo, classificationResult },
      (data) => {
        const cart = data.carts[0] as any
        return {
          ...(cart.metadata || {}),
          points_promo_id: data.loyaltyPromo[0].id,
          points_cost: data.classificationResult.total_point_cost,
          redeemed_variant_ids: data.classificationResult.coin_variant_ids,
        }
      }
    )

    updateCartsStep([
      {
        id: input.cart_id,
        metadata: cartMetadata,
      },
    ])

    const { data: updatedCarts } = useQueryGraphStep({
      entity: "cart",
      fields: cartFields,
      filters: { id: input.cart_id },
    }).config({ name: "retrieve-updated-cart" })

    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse(updatedCarts)
  }
)
