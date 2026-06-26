import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  CreateUserBodyRole,
} from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { UserPlus, Loader2, Shield, User, Eye } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const ROLES = Object.values(CreateUserBodyRole);

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "outline" }> = {
  Admin: { label: "Admin", icon: Shield, variant: "default" },
  FinanceOfficer: { label: "Finance Officer", icon: User, variant: "secondary" },
  Auditor: { label: "Auditor", icon: Eye, variant: "outline" },
};

export default function Settings() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === "Admin";

  const { data: users, isLoading: usersLoading } = useListUsers();
  const createUserMutation = useCreateUser();

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "" as CreateUserBodyRole | "",
  });
  const [showForm, setShowForm] = useState(false);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    createUserMutation.mutate(
      {
        data: {
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role as CreateUserBodyRole,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "User created", description: `${newUser.name} has been added to the system.` });
          setNewUser({ name: "", email: "", password: "", role: "" });
          setShowForm(false);
          queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.response?.data?.message || "Failed to create user.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage system users and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Users with access to B-View Expense Tracker</CardDescription>
              </div>
              {isAdmin && (
                <Button className="gap-2" onClick={() => setShowForm((v) => !v)}>
                  <UserPlus className="h-4 w-4" />
                  {showForm ? "Cancel" : "Add User"}
                </Button>
              )}
            </div>
          </CardHeader>

          {showForm && isAdmin && (
            <>
              <Separator />
              <CardContent className="pt-6">
                <form onSubmit={handleCreateUser}>
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">New User</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newName">Full Name *</Label>
                        <Input
                          id="newName"
                          placeholder="e.g. Mrs. Grace Okeke"
                          value={newUser.name}
                          onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newEmail">Email *</Label>
                        <Input
                          id="newEmail"
                          type="email"
                          placeholder="user@school.edu"
                          value={newUser.email}
                          onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Password *</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="Minimum 8 characters"
                          value={newUser.password}
                          onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role *</Label>
                        <Select value={newUser.role} onValueChange={(v) => setNewUser((u) => ({ ...u, role: v as CreateUserBodyRole }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{r.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                      <Button type="submit" disabled={createUserMutation.isPending} className="gap-2">
                        {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Create User
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
              <Separator />
            </>
          )}

          <CardContent className={showForm ? "pt-0" : "p-0"}>
            {usersLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => {
                    const roleConfig = ROLE_CONFIG[u.role] ?? { label: u.role, icon: User, variant: "outline" as const };
                    const RoleIcon = roleConfig.icon;
                    return (
                      <TableRow key={u.id} className={u.id === currentUser?.id ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {u.name}
                            {u.id === currentUser?.id && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={roleConfig.variant} className="gap-1.5">
                            <RoleIcon className="h-3 w-3" />
                            {roleConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(u.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>What each role can do in B-View</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  role: "Admin",
                  icon: Shield,
                  color: "text-primary",
                  permissions: ["Create & edit expenses", "Delete expenses", "Manage users", "View audit logs", "Export reports", "View summaries"],
                },
                {
                  role: "Finance Officer",
                  icon: User,
                  color: "text-blue-600",
                  permissions: ["Create & edit expenses", "View expenses", "Export reports", "View summaries"],
                },
                {
                  role: "Auditor",
                  icon: Eye,
                  color: "text-green-600",
                  permissions: ["View expenses (read-only)", "View audit logs", "Export reports", "View summaries"],
                },
              ].map(({ role, icon: Icon, color, permissions }) => (
                <div key={role} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="font-semibold text-sm">{role}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {permissions.map((p) => (
                      <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="mt-0.5 text-green-500">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Application version and environment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-muted-foreground">Application</span>
              <span className="font-medium">B-View Expense Tracker</span>
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
              <span className="text-muted-foreground">Environment</span>
              <Badge variant="secondary" className="w-fit">Development</Badge>
              <span className="text-muted-foreground">Database</span>
              <span className="font-medium">PostgreSQL</span>
              <span className="text-muted-foreground">Logged in as</span>
              <span className="font-medium">{currentUser?.name} ({currentUser?.role})</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
