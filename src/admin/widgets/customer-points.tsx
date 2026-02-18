import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminCustomer } from "@medusajs/framework/types"
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
import { useState } from "react"
import { sdk } from "../lib/client"

type CoinsResponse = {
  balance: number
  transactions: {
    id: string
    type: string
    points: number
    reason: string | null
    created_at: string
  }[]
}

const CustomerCoinsWidget = ({
  data: customer,
}: DetailWidgetProps<AdminCustomer>) => {
  const queryClient = useQueryClient()
  const [action, setAction] = useState<"add" | "deduct">("add")
  const [coins, setCoins] = useState("")
  const [reason, setReason] = useState("")

  const { data, isLoading } = useQuery<CoinsResponse>({
    queryFn: () =>
      sdk.client.fetch<CoinsResponse>(
        `/admin/customers/${customer.id}/points`
      ),
    queryKey: ["customer-coins", customer.id],
  })

  const mutation = useMutation({
    mutationFn: (body: { action: string; points: number; reason?: string }) =>
      sdk.client.fetch(`/admin/customers/${customer.id}/points`, {
        method: "POST",
        body,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["customer-coins", customer.id],
      })
      setCoins("")
      setReason("")
      const verb = variables.action === "add" ? "added to" : "deducted from"
      toast.success("Coins updated", {
        description: `${variables.points} coins ${verb} ${customer.first_name || "customer"}.`,
      })
    },
    onError: (error: Error) => {
      toast.error("Failed to update coins", {
        description: error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numCoins = parseInt(coins, 10)
    if (isNaN(numCoins) || numCoins <= 0) return
    mutation.mutate({
      action,
      points: numCoins,
      reason: reason || undefined,
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Loyalty Coins
        </Text>
        <Badge color={data?.balance ? "green" : "grey"}>
          {isLoading ? "..." : `${data?.balance ?? 0} coins`}
        </Badge>
      </div>

      <form
        onSubmit={handleSubmit}
        className="px-6 py-4 flex gap-2 items-end"
      >
        <Select
          value={action}
          onValueChange={(val) => setAction(val as "add" | "deduct")}
          size="small"
        >
          <Select.Trigger className="w-[100px]">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="add">Add</Select.Item>
            <Select.Item value="deduct">Deduct</Select.Item>
          </Select.Content>
        </Select>
        <div className="w-[120px] shrink-0">
          <Input
            type="number"
            placeholder="Coins"
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
            min={1}
          />
        </div>
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="small"
          isLoading={mutation.isPending}
          disabled={mutation.isPending}
        >
          Submit
        </Button>
      </form>

      {data?.transactions && data.transactions.length > 0 && (
        <div>
          <div className="px-6 py-4">
            <Text size="small" leading="compact" weight="plus">
              Recent Transactions
            </Text>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-y border-ui-border-base">
                <th className="px-6 py-2 text-left">
                  <Text size="xsmall" leading="compact" weight="plus" className="text-ui-fg-subtle">
                    Type
                  </Text>
                </th>
                <th className="px-6 py-2 text-left">
                  <Text size="xsmall" leading="compact" weight="plus" className="text-ui-fg-subtle">
                    Date
                  </Text>
                </th>
                <th className="px-6 py-2 text-left">
                  <Text size="xsmall" leading="compact" weight="plus" className="text-ui-fg-subtle">
                    Reason
                  </Text>
                </th>
                <th className="px-6 py-2 text-right">
                  <Text size="xsmall" leading="compact" weight="plus" className="text-ui-fg-subtle">
                    Coins
                  </Text>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.slice(0, 10).map((tx) => (
                <tr key={tx.id} className="border-b border-ui-border-base">
                  <td className="px-6 py-3">
                    <Badge
                      color={tx.type === "spend" ? "red" : tx.type === "earn" ? "green" : "grey"}
                      size="2xsmall"
                    >
                      {tx.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                      {new Date(tx.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </td>
                  <td className="px-6 py-3">
                    <Text size="small" leading="compact">
                      {tx.reason || "-"}
                    </Text>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Text
                      size="small"
                      leading="compact"
                      weight="plus"
                      className={
                        tx.type === "spend"
                          ? "text-ui-fg-error"
                          : "text-ui-fg-interactive"
                      }
                    >
                      {tx.type === "spend" ? "-" : "+"}
                      {tx.points}
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-3">
            <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
              {Math.min(10, data.transactions.length)} of {data.transactions.length} results
            </Text>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.after",
})

export default CustomerCoinsWidget
