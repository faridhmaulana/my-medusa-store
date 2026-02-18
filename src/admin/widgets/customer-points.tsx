import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminCustomer } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, Input, Badge, toast } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type PointsResponse = {
  balance: number
  transactions: {
    id: string
    type: string
    points: number
    reason: string | null
    created_at: string
  }[]
}

const CustomerPointsWidget = ({
  data: customer,
}: DetailWidgetProps<AdminCustomer>) => {
  const queryClient = useQueryClient()
  const [action, setAction] = useState<"add" | "deduct">("add")
  const [points, setPoints] = useState("")
  const [reason, setReason] = useState("")

  const { data, isLoading } = useQuery<PointsResponse>({
    queryFn: () =>
      fetch(`/admin/customers/${customer.id}/points`, {
        credentials: "include",
      }).then((r) => r.json()),
    queryKey: ["customer-points", customer.id],
  })

  const mutation = useMutation({
    mutationFn: async (body: { action: string; points: number; reason?: string }) => {
      const r = await fetch(`/admin/customers/${customer.id}/points`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await r.json()
      if (!r.ok) throw new Error(json.message || "Failed to update points")
      return json
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["customer-points", customer.id],
      })
      setPoints("")
      setReason("")
      const verb = variables.action === "add" ? "added to" : "deducted from"
      toast.success("Points updated", {
        description: `${variables.points} points ${verb} ${customer.first_name || "customer"}.`,
      })
    },
    onError: (error: Error) => {
      toast.error("Failed to update points", {
        description: error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numPoints = parseInt(points, 10)
    if (isNaN(numPoints) || numPoints <= 0) return
    mutation.mutate({ action, points: numPoints, reason: reason || undefined })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Loyalty Points</Heading>
        <Badge color={data?.balance ? "green" : "grey"}>
          {isLoading ? "..." : `${data?.balance ?? 0} pts`}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-4 flex gap-2 items-end">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as "add" | "deduct")}
          className="border rounded px-2 py-1.5 text-sm"
        >
          <option value="add">Add</option>
          <option value="deduct">Deduct</option>
        </select>
        <Input
          type="number"
          placeholder="Points"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          min={1}
        />
        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button type="submit" variant="secondary" isLoading={mutation.isPending}>
          Submit
        </Button>
      </form>

      {data?.transactions && data.transactions.length > 0 && (
        <div className="px-6 py-4">
          <Text size="small" weight="plus" className="mb-2">
            Recent Transactions
          </Text>
          <div className="space-y-1">
            {data.transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="flex justify-between text-sm">
                <span>
                  <Badge
                    color={tx.type === "spend" ? "red" : "green"}
                    className="mr-2"
                  >
                    {tx.type}
                  </Badge>
                  {tx.reason || "-"}
                </span>
                <span
                  className={
                    tx.type === "spend" ? "text-red-600" : "text-green-600"
                  }
                >
                  {tx.type === "spend" ? "-" : "+"}
                  {tx.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.after",
})

export default CustomerPointsWidget
