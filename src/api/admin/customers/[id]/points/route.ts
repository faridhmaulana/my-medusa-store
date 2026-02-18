import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { POINT_BALANCE_MODULE } from "../../../../../modules/pointBalance"
import PointBalanceModuleService from "../../../../../modules/pointBalance/service"
import { addPointsWorkflow } from "../../../../../workflows/loyalty/add-points"
import { deductPointsWorkflow } from "../../../../../workflows/loyalty/deduct-points"
import { PostAdminCustomerPointsSchemaType } from "../../../validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id: customer_id } = req.params
  const service: PointBalanceModuleService = req.scope.resolve(
    POINT_BALANCE_MODULE
  )

  const balance = await service.getBalance(customer_id)
  const transactions = await service.listPointTransactions(
    { customer_id },
    { order: { created_at: "DESC" }, take: 50 }
  )

  res.json({ balance, transactions })
}

export async function POST(
  req: AuthenticatedMedusaRequest<PostAdminCustomerPointsSchemaType>,
  res: MedusaResponse
) {
  const { id: customer_id } = req.params
  const { action, points, reason } = req.validatedBody

  if (action === "add") {
    const { result } = await addPointsWorkflow(req.scope).run({
      input: { customer_id, points, reason },
    })
    res.json({ balance: result })
  } else {
    const { result } = await deductPointsWorkflow(req.scope).run({
      input: { customer_id, points, reason },
    })
    res.json({ balance: result })
  }
}
