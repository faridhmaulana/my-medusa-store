import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, Input, Badge, toast } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"

type VariantPointConfig = {
  variant_id: string
  payment_type: string
  point_price: number | null
}

type PointConfigResponse = {
  point_config: VariantPointConfig
}

const VariantPointConfigRow = ({
  variant,
}: {
  variant: { id: string; title: string; sku: string | null }
}) => {
  const queryClient = useQueryClient()
  const [paymentType, setPaymentType] = useState("currency")
  const [pointPrice, setPointPrice] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  const { data, isLoading } = useQuery<PointConfigResponse>({
    queryFn: () =>
      fetch(`/admin/variants/${variant.id}/point-config`, {
        credentials: "include",
      }).then((r) => r.json()),
    queryKey: ["variant-point-config", variant.id],
  })

  useEffect(() => {
    if (data?.point_config) {
      setPaymentType(data.point_config.payment_type)
      setPointPrice(
        data.point_config.point_price !== null
          ? String(data.point_config.point_price)
          : ""
      )
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: (body: { payment_type: string; point_price: number | null }) =>
      fetch(`/admin/variants/${variant.id}/point-config`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["variant-point-config", variant.id],
      })
      setIsEditing(false)
      toast.success("Point config updated", {
        description: `${variant.title || "Variant"} point pricing has been updated.`,
      })
    },
    onError: () => {
      toast.error("Failed to update", {
        description: `Could not update point config for ${variant.title || "variant"}.`,
      })
    },
  })

  const handleSave = () => {
    const pp = pointPrice ? parseFloat(pointPrice) : null
    mutation.mutate({ payment_type: paymentType, point_price: pp })
  }

  const showPointPrice = paymentType === "points" || paymentType === "both"

  if (isLoading) {
    return (
      <div className="py-2 border-b last:border-b-0">
        <Text size="small">Loading...</Text>
      </div>
    )
  }

  const currentConfig = data?.point_config
  const label =
    currentConfig?.payment_type === "points"
      ? "Points Only"
      : currentConfig?.payment_type === "both"
      ? "Both"
      : "Currency"

  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <div>
          <Text size="small" weight="plus">
            {variant.title || "Default"}
          </Text>
          {variant.sku && (
            <Text size="xsmall" className="text-ui-fg-muted">
              SKU: {variant.sku}
            </Text>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            <Badge size="2xsmall" color={label === "Currency" ? "grey" : "green"}>
              {label}
            </Badge>
            {currentConfig?.point_price !== null &&
              currentConfig?.point_price !== undefined &&
              currentConfig?.payment_type !== "currency" && (
                <Text size="xsmall">{currentConfig.point_price} pts</Text>
              )}
            <Button
              variant="transparent"
              size="small"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          </div>
        )}
      </div>
      {isEditing && (
        <div className="space-y-2 pl-2">
          <div>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm w-full"
            >
              <option value="currency">Currency Only</option>
              <option value="points">Points Only</option>
              <option value="both">Both (Currency or Points)</option>
            </select>
          </div>
          {showPointPrice && (
            <div>
              <Input
                type="number"
                placeholder="Point price, e.g. 500"
                value={pointPrice}
                onChange={(e) => setPointPrice(e.target.value)}
                min={1}
                size="small"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={handleSave}
              isLoading={mutation.isPending}
            >
              Save
            </Button>
            <Button
              variant="transparent"
              size="small"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

type VariantsResponse = {
  variants: { id: string; title: string; sku: string | null }[]
}

const ProductPointConfigWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const { data: variantsData, isLoading: variantsLoading } =
    useQuery<VariantsResponse>({
      queryFn: () =>
        fetch(`/admin/products/${product.id}/variants?fields=id,title,sku`, {
          credentials: "include",
        }).then((r) => r.json()),
      queryKey: ["product-variants", product.id],
    })

  const variants = variantsData?.variants || []

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Point Pricing</Heading>
        <Text size="small" className="text-ui-fg-muted mt-1">
          Configure point pricing per variant
        </Text>
      </div>
      <div className="px-6 py-2">
        {variantsLoading ? (
          <Text size="small" className="py-2">
            Loading variants...
          </Text>
        ) : variants.length === 0 ? (
          <Text size="small" className="py-2">
            No variants found. Add variants first.
          </Text>
        ) : (
          variants.map((variant) => (
            <VariantPointConfigRow
              key={variant.id}
              variant={{
                id: variant.id,
                title: variant.title,
                sku: variant.sku,
              }}
            />
          ))
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductPointConfigWidget
