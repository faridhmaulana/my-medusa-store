import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import {
  Container,
  Text,
  Button,
  Input,
  Badge,
  toast,
  Select,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect, useCallback } from "react"
import { sdk } from "../lib/client"

type VariantPointConfig = {
  variant_id: string
  payment_type: string
  point_price: number | null
}

type PointConfigResponse = {
  point_config: VariantPointConfig
}

type VariantConfig = {
  variantId: string
  title: string
  sku: string | null
  paymentType: string
  coinPrice: string
  isLoaded: boolean
}

const ProductCoinConfigWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [configs, setConfigs] = useState<VariantConfig[]>([])

  const { data: variantsData, isLoading: variantsLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{
        variants: { id: string; title: string; sku: string | null }[]
      }>(`/admin/products/${product.id}/variants?fields=id,title,sku`),
    queryKey: ["product-variants", product.id],
  })

  const variants = variantsData?.variants || []

  const variantIds = variants.map((v) => v.id).join(",")
  const { data: pointConfigs, isLoading: configsLoading } = useQuery({
    queryFn: async () => {
      const results: Record<string, VariantPointConfig> = {}
      for (const variant of variants) {
        const res = await sdk.client.fetch<PointConfigResponse>(
          `/admin/variants/${variant.id}/point-config`
        )
        results[variant.id] = res.point_config
      }
      return results
    },
    queryKey: ["variant-coin-configs", product.id, variantIds],
    enabled: variants.length > 0,
  })

  useEffect(() => {
    if (variants.length > 0 && pointConfigs) {
      setConfigs(
        variants.map((v) => {
          const cfg = pointConfigs[v.id]
          return {
            variantId: v.id,
            title: v.title,
            sku: v.sku,
            paymentType: cfg?.payment_type || "currency",
            coinPrice:
              cfg?.point_price !== null && cfg?.point_price !== undefined
                ? String(cfg.point_price)
                : "",
            isLoaded: true,
          }
        })
      )
    }
  }, [variants, pointConfigs])

  const mutation = useMutation({
    mutationFn: async (
      updates: {
        variant_id: string
        payment_type: string
        point_price: number | null
      }[]
    ) => {
      const results = []
      for (const update of updates) {
        const res = await sdk.client.fetch<{
          point_config: VariantPointConfig
        }>(`/admin/variants/${update.variant_id}/point-config`, {
          method: "POST",
          body: {
            payment_type: update.payment_type,
            point_price: update.point_price,
          },
        })
        results.push(res.point_config)
      }
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["variant-coin-configs", product.id],
      })
      setIsEditing(false)
      toast.success("Coin pricing updated", {
        description: "Coin prices for all variants have been saved.",
      })
    },
    onError: () => {
      toast.error("Failed to update", {
        description: "Could not update coin pricing. Please try again.",
      })
    },
  })

  const handleSaveAll = useCallback(() => {
    const updates = configs.map((cfg) => ({
      variant_id: cfg.variantId,
      payment_type: cfg.paymentType,
      point_price: cfg.coinPrice ? parseFloat(cfg.coinPrice) : null,
    }))
    mutation.mutate(updates)
  }, [configs, mutation])

  const handleCancel = useCallback(() => {
    if (variants.length > 0 && pointConfigs) {
      setConfigs(
        variants.map((v) => {
          const cfg = pointConfigs[v.id]
          return {
            variantId: v.id,
            title: v.title,
            sku: v.sku,
            paymentType: cfg?.payment_type || "currency",
            coinPrice:
              cfg?.point_price !== null && cfg?.point_price !== undefined
                ? String(cfg.point_price)
                : "",
            isLoaded: true,
          }
        })
      )
    }
    setIsEditing(false)
  }, [variants, pointConfigs])

  const updateConfig = useCallback(
    (variantId: string, field: "paymentType" | "coinPrice", value: string) => {
      setConfigs((prev) =>
        prev.map((c) =>
          c.variantId === variantId ? { ...c, [field]: value } : c
        )
      )
    },
    []
  )

  const isLoading = variantsLoading || configsLoading

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Text size="small" leading="compact" weight="plus">
            Coin Pricing
          </Text>
          <Text
            size="small"
            leading="compact"
            className="text-ui-fg-subtle"
          >
            Set coin prices per variant
          </Text>
        </div>
        {!isEditing && !isLoading && variants.length > 0 && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button
              variant="transparent"
              size="small"
              onClick={handleCancel}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={handleSaveAll}
              isLoading={mutation.isPending}
              disabled={mutation.isPending}
            >
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Loading...
            </Text>
          </div>
        ) : variants.length === 0 ? (
          <Text
            size="small"
            leading="compact"
            className="text-ui-fg-subtle"
          >
            No variants found. Add variants first.
          </Text>
        ) : !isEditing ? (
          <div className="flex flex-col gap-y-3">
            {configs.map((cfg) => (
              <div
                key={cfg.variantId}
                className="flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <Text size="small" leading="compact" weight="plus">
                    {cfg.title || "Default"}
                  </Text>
                  {cfg.sku && (
                    <Text
                      size="xsmall"
                      leading="compact"
                      className="text-ui-fg-muted"
                    >
                      SKU: {cfg.sku}
                    </Text>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    size="2xsmall"
                    color={cfg.paymentType === "currency" ? "grey" : "green"}
                  >
                    {cfg.paymentType === "points"
                      ? "Coins Only"
                      : cfg.paymentType === "both"
                        ? "Both"
                        : "Currency"}
                  </Badge>
                  {cfg.paymentType !== "currency" && cfg.coinPrice && (
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle"
                    >
                      {cfg.coinPrice} coins
                    </Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ui-border-base">
                  <th className="pb-2 text-left">
                    <Text
                      size="xsmall"
                      leading="compact"
                      weight="plus"
                      className="text-ui-fg-subtle"
                    >
                      Variant
                    </Text>
                  </th>
                  <th className="pb-2 text-left pl-4">
                    <Text
                      size="xsmall"
                      leading="compact"
                      weight="plus"
                      className="text-ui-fg-subtle"
                    >
                      Payment Type
                    </Text>
                  </th>
                  <th className="pb-2 text-left pl-4">
                    <Text
                      size="xsmall"
                      leading="compact"
                      weight="plus"
                      className="text-ui-fg-subtle"
                    >
                      Coin Price
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {configs.map((cfg) => {
                  const showCoinPrice =
                    cfg.paymentType === "points" || cfg.paymentType === "both"
                  return (
                    <tr
                      key={cfg.variantId}
                      className="border-b border-ui-border-base last:border-b-0"
                    >
                      <td className="py-2 pr-4">
                        <Text size="small" leading="compact" weight="plus">
                          {cfg.title || "Default"}
                        </Text>
                        {cfg.sku && (
                          <Text
                            size="xsmall"
                            leading="compact"
                            className="text-ui-fg-muted"
                          >
                            {cfg.sku}
                          </Text>
                        )}
                      </td>
                      <td className="py-2 pl-4 pr-4">
                        <Select
                          value={cfg.paymentType}
                          onValueChange={(val) =>
                            updateConfig(cfg.variantId, "paymentType", val)
                          }
                          size="small"
                        >
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="currency">
                              Currency Only
                            </Select.Item>
                            <Select.Item value="points">
                              Coins Only
                            </Select.Item>
                            <Select.Item value="both">Both</Select.Item>
                          </Select.Content>
                        </Select>
                      </td>
                      <td className="py-2 pl-4">
                        {showCoinPrice ? (
                          <Input
                            type="number"
                            placeholder="e.g. 500"
                            value={cfg.coinPrice}
                            onChange={(e) =>
                              updateConfig(
                                cfg.variantId,
                                "coinPrice",
                                e.target.value
                              )
                            }
                            min={1}
                            size="small"
                          />
                        ) : (
                          <Text
                            size="small"
                            leading="compact"
                            className="text-ui-fg-muted"
                          >
                            —
                          </Text>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductCoinConfigWidget
