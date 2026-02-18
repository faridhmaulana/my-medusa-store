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
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Not authenticated" })
    return
  }

  const service: PointBalanceModuleService = req.scope.resolve(
    POINT_BALANCE_MODULE
  )

  const balance = await service.getBalance(customerId)
  const transactions = await service.listPointTransactions(
    { customer_id: customerId },
    { order: { created_at: "DESC" }, take: 20 }
  )

  res.json({ points: balance, transactions })
}
