import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Container, Text, Badge } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/client"

type OrderCoinsResponse = {
  coins_used: number
  cart_metadata: {
    points_cost?: number
    points_promo_id?: string
    redeemed_variant_ids?: string[]
  } | null
  transactions: {
    id: string
    type: string
    points: number
    reason: string | null
    created_at: string
  }[]
  items: {
    id: string
    title: string
    variant_title: string
    quantity: number
    coin_price: number
    total_coins: number
  }[]
}

const OrderCoinsWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  const { data, isLoading, error } = useQuery<OrderCoinsResponse>({
    queryFn: () =>
      sdk.client.fetch<OrderCoinsResponse>(
        `/admin/orders/${order.id}/coins`
      ),
    queryKey: ["order-coins", order.id],
  })

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            Loyalty Coins
          </Text>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Loading...
          </Text>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Text size="small" leading="compact" weight="plus">
            Loyalty Coins
          </Text>
          <Text size="small" leading="compact" className="text-ui-fg-error">
            Error loading coin data
          </Text>
        </div>
      </Container>
    )
  }

  const coinsFromMetadata = data?.cart_metadata?.points_cost || 0
  const coinsFromTransactions = data?.coins_used || 0
  const coinsUsed = coinsFromMetadata || coinsFromTransactions

  if (coinsUsed === 0) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Coin Payment
        </Text>
        <Badge color="purple" size="2xsmall">
          {coinsUsed.toLocaleString()} coins
        </Badge>
      </div>

      {data?.items && data.items.length > 0 && (
        <div className="px-6 py-4 flex flex-col gap-3">
          {data.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <Text size="small" leading="compact" className="truncate">
                  {item.title}
                </Text>
                {item.variant_title && (
                  <Text
                    size="xsmall"
                    leading="compact"
                    className="text-ui-fg-muted"
                  >
                    {item.variant_title}
                  </Text>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Text size="small" leading="compact" className="text-ui-fg-muted">
                  {item.coin_price.toLocaleString()} coins × {item.quantity}
                </Text>
                <Text size="small" leading="compact" weight="plus">
                  {item.total_coins.toLocaleString()} coins
                </Text>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-3 border-t">
            <Text size="small" leading="compact" weight="plus">
              Total Coin Payment
            </Text>
            <Text size="small" leading="compact" weight="plus" className="text-purple-600">
              {coinsUsed.toLocaleString()} coins
            </Text>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderCoinsWidget
