import { useState } from "react";
import { useLocation } from "wouter";
import {
  useCreateExpense,
  useListCategories,
  useListDepartments,
  CreateExpenseBodyPaymentMethod,
} from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";

const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "GHS", "KES", "ZAR"];
const PAYMENT_METHODS = Object.values(CreateExpenseBodyPaymentMethod);

export default function NewExpense() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: categories } = useListCategories();
  const { data: departments } = useListDepartments();

  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    currency: "NGN",
    vendor: "",
    category: "",
    department: "",
    description: "",
    paymentMethod: "" as CreateExpenseBodyPaymentMethod | "",
    personResponsible: "",
    documentUrl: "",
  });

  const createMutation = useCreateExpense();

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.date || !form.amount || !form.vendor || !form.category || !form.department || !form.description || !form.paymentMethod || !form.personResponsible) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    createMutation.mutate(
      {
        data: {
          date: form.date,
          amount: parseFloat(form.amount),
          currency: form.currency,
          vendor: form.vendor,
          category: form.category,
          department: form.department,
          description: form.description,
          paymentMethod: form.paymentMethod as CreateExpenseBodyPaymentMethod,
          personResponsible: form.personResponsible,
          documentUrl: form.documentUrl || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Expense created", description: "The expense record has been saved." });
          setLocation("/expenses");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.response?.data?.message || "Failed to create expense.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/expenses")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Expense</h1>
            <p className="text-muted-foreground mt-1">Record a new institutional expense</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
              <CardDescription>All fields marked with * are required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor / Payee *</Label>
                  <Input
                    id="vendor"
                    placeholder="e.g. Zenith Bank, EEDC..."
                    value={form.vendor}
                    onChange={(e) => handleChange("vendor", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
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
                </div>
                <div className="space-y-2">
                  <Label>Department *</Label>
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => handleChange("paymentMethod", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>{m.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personResponsible">Person Responsible *</Label>
                  <Input
                    id="personResponsible"
                    placeholder="Full name"
                    value={form.personResponsible}
                    onChange={(e) => handleChange("personResponsible", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about this expense..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentUrl">Document / Receipt URL (optional)</Label>
                <Input
                  id="documentUrl"
                  type="url"
                  placeholder="https://..."
                  value={form.documentUrl}
                  onChange={(e) => handleChange("documentUrl", e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setLocation("/expenses")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Expense
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
