import { createClient } from "@/lib/server"
import { formatBRL } from "@/lib/format"
import { ASSET_CLASS_LABELS, type InvestmentPosition, type InvestmentMovement, type AssetClass } from "@/lib/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function InvestimentosPage() {
  const supabase = await createClient()
  const [{ data: positions }, { data: movements }] = await Promise.all([
    supabase
      .from("investment_positions")
      .select("*")
      .order("asset_name"),
    supabase
      .from("investment_movements")
      .select("*")
      .order("date", { ascending: false })
      .limit(50),
  ])

  const list = (positions ?? []) as InvestmentPosition[]
  const movs = (movements ?? []) as InvestmentMovement[]

  const total = list.reduce(
    (sum, p) => sum + Number(p.quantity) * Number(p.current_price),
    0
  )

  const byClass = new Map<AssetClass, number>()
  for (const p of list) {
    const value = Number(p.quantity) * Number(p.current_price)
    byClass.set(p.asset_class, (byClass.get(p.asset_class) ?? 0) + value)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Investimentos</h1>
        <p className="text-sm text-muted-foreground">
          Posições e movimentos importados do C6 Invest.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Patrimônio investido</CardDescription>
            <CardTitle className="text-2xl">{formatBRL(total)}</CardTitle>
          </CardHeader>
        </Card>
        {[...byClass.entries()].map(([cls, value]) => (
          <Card key={cls}>
            <CardHeader>
              <CardDescription>{ASSET_CLASS_LABELS[cls]}</CardDescription>
              <CardTitle className="text-xl">{formatBRL(value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posições</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ativo</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Preço médio</TableHead>
                <TableHead className="text-right">Preço atual</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const value = Number(p.quantity) * Number(p.current_price)
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.ticker ? (
                        <span className="font-medium">{p.ticker} </span>
                      ) : null}
                      {p.asset_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ASSET_CLASS_LABELS[p.asset_class]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{Number(p.quantity)}</TableCell>
                    <TableCell className="text-right">
                      {formatBRL(Number(p.avg_price))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(Number(p.current_price))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(value)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma posição. Importe um extrato de investimentos.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentos recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.type}</Badge>
                  </TableCell>
                  <TableCell>{m.description ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatBRL(Number(m.amount))}
                  </TableCell>
                </TableRow>
              ))}
              {movs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Sem movimentos.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
