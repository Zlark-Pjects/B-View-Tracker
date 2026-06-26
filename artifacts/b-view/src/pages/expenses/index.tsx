import { useState } from "react";
import { Link } from "wouter";
import { 
  useListExpenses,
  ListExpensesParams
} from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Expenses() {
  const [params, setParams] = useState<ListExpensesParams>({
    page: 1,
    limit: 10,
    search: ""
  });

  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useListExpenses(params, {
    query: {
      queryKey: ["expenses", params],
      keepPreviousData: true
    } as any
  });

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(p => ({ ...p, search: searchInput, page: 1 }));
  };

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground mt-1">Manage and track all institutional expenses</p>
          </div>
          <Link href="/expenses/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Expense
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Expense Records</CardTitle>
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search vendor, category..." 
                    className="pl-9 w-[250px]"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="secondary">Search</Button>
              </form>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !data || data.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-lg font-medium">No expenses found</p>
                <p className="text-sm text-muted-foreground mt-1">Adjust your filters or create a new expense.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((expense) => (
                      <TableRow key={expense.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          <Link href={`/expenses/${expense.id}`} className="block w-full">
                            {format(new Date(expense.date), "MMM dd, yyyy")}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/expenses/${expense.id}`} className="block w-full">
                            {expense.vendor}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.department}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{expense.paymentMethod}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-4 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Showing {data.data.length} of {data.total} results
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={params.page === 1}
                      onClick={() => setParams(p => ({ ...p, page: (p.page || 1) - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={params.page === data.totalPages}
                      onClick={() => setParams(p => ({ ...p, page: (p.page || 1) + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
