import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetExpense,
  useUpdateExpense,
  useDeleteExpense,
  useListCategories,
  useListDepartments,
  UpdateExpenseBodyPaymentMethod,
} from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, Loader2, Edit } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "GHS", "KES", "ZAR"];
const PAYMENT_METHODS = Object.values(UpdateExpenseBodyPaymentMethod);

export default function ExpenseDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = user?.role === "Admin" || user?.role === "FinanceOfficer";
  const canDelete = user?.role === "Admin";

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: expense, isLoading, isError } = useGetExpense(id);
  const { data: categories } = useListCategories();
  const { data: departments } = useListDepartments();

  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  useEffect(() => {
    if (expense) {
      setForm({
        date: expense.date.slice(0, 10),
        amount: String(expense.amount),
        currency: expense.currency,
        vendor: expense.vendor,
        category: expense.category,
        department: expense.department,
        description: expense.description,
        paymentMethod: expense.paymentMethod,
        personResponsible: expense.personResponsible,
        documentUrl: expense.documentUrl || "",
      });
    }
  }, [expense]);

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        id,
        data: {
          date: form.date,
          amount: parseFloat(form.amount),
          currency: form.currency,
          vendor: form.vendor,
          category: form.category,
          department: form.department,
          description: form.description,
          paymentMethod: form.paymentMethod as UpdateExpenseBodyPaymentMethod,
          personResponsible: form.personResponsible,
          documentUrl: form.documentUrl || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Expense updated", description: "Changes have been saved." });
          setIsEditing(false);
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.response?.data?.message || "Failed to update expense.", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Expense deleted", description: "The expense has been removed." });
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          setLocation("/expenses");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.response?.data?.message || "Failed to delete expense.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (isError || !expense) {
    return (
      <MainLayout>
        <div className="p-8 text-center">
          <p className="text-lg font-medium">Expense not found</p>
          <Button className="mt-4" onClick={() => setLocation("/expenses")}>Back to Expenses</Button>
        </div>
      </MainLayout>
    );
  }

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(amount);

  return (
    <MainLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/expenses")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Expense #{id}</h1>
              <p className="text-muted-foreground mt-1">
                Recorded on {format(new Date(expense.createdAt), "MMM dd, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <Button variant="outline" className="gap-2" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the expense record. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Expense Details</CardTitle>
                {isEditing && (
                  <Badge variant="secondary" className="text-xs">Editing</Badge>
                )}
              </div>
              {isEditing && <CardDescription>Modify the fields and click Save Changes</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date || ""}
                    onChange={(e) => handleChange("date", e.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor / Payee</Label>
                  <Input
                    id="vendor"
                    value={form.vendor || ""}
                    onChange={(e) => handleChange("vendor", e.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount || ""}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  {isEditing ? (
                    <Select value={form.currency} onValueChange={(v) => handleChange("currency", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.currency || ""} disabled />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  {isEditing ? (
                    <Select value={form.category} onValueChange={(v) => handleChange("category", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="pt-1"><Badge variant="outline">{expense.category}</Badge></div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  {isEditing ? (
                    <Select value={form.department} onValueChange={(v) => handleChange("department", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={expense.department} disabled />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  {isEditing ? (
                    <Select value={form.paymentMethod} onValueChange={(v) => handleChange("paymentMethod", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>{m.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={expense.paymentMethod.replace(/([A-Z])/g, " $1").trim()} disabled />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personResponsible">Person Responsible</Label>
                  <Input
                    id="personResponsible"
                    value={form.personResponsible || ""}
                    onChange={(e) => handleChange("personResponsible", e.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentUrl">Document / Receipt URL</Label>
                <Input
                  id="documentUrl"
                  type={isEditing ? "url" : "text"}
                  placeholder={isEditing ? "https://..." : "No document attached"}
                  value={form.documentUrl || ""}
                  onChange={(e) => handleChange("documentUrl", e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              {isEditing && (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      if (expense) {
                        setForm({
                          date: expense.date.slice(0, 10),
                          amount: String(expense.amount),
                          currency: expense.currency,
                          vendor: expense.vendor,
                          category: expense.category,
                          department: expense.department,
                          description: expense.description,
                          paymentMethod: expense.paymentMethod,
                          personResponsible: expense.personResponsible,
                          documentUrl: expense.documentUrl || "",
                        });
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              )}

              {!isEditing && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Total: <span className="font-semibold text-foreground text-base">{formatCurrency(expense.amount, expense.currency)}</span></span>
                    <span>ID: #{expense.id}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
