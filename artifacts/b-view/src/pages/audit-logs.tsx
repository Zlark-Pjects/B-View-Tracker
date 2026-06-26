import { useState } from "react";
import { 
  useListAuditLogs,
  ListAuditLogsParams
} from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function AuditLogs() {
  const [params, setParams] = useState<ListAuditLogsParams>({
    page: 1,
    limit: 15,
  });

  const { data, isLoading } = useListAuditLogs(params, {
    query: {
      queryKey: ["auditLogs", params],
      keepPreviousData: true
    } as any
  });

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">System activity and expense history tracking</p>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg font-medium">Activity History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !data || data.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-lg font-medium">No activity found</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Expense Ref</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            log.action === "Create" ? "border-green-200 text-green-700 bg-green-50 dark:bg-green-950/20" :
                            log.action === "Update" ? "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/20" :
                            log.action === "Delete" ? "border-red-200 text-red-700 bg-red-50 dark:bg-red-950/20" :
                            "border-gray-200 text-gray-700 bg-gray-50 dark:bg-gray-900"
                          }>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.userName || `User #${log.userId}`}</TableCell>
                        <TableCell>{log.expenseId ? `#${log.expenseId}` : "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate" title={log.details || ""}>
                          {log.details || "-"}
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

// Ensure Button is available
import { Button } from "@/components/ui/button";
