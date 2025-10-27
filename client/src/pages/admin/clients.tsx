import { useQuery, useMutation } from "@tanstack/react-query";
import { User, UserRole, insertClientSchema, Client } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, Search, Trash2, UserCog, Edit, Eye, Mail, Phone, Calendar, Building } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<User | null>(null);

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/users/clients"],
  });

  // Default form values
  const defaultFormValues: Partial<Client> = {
    role: UserRole.CLIENT,
    phone: "",
    company: "",
    industry: "",
    clientType: "individual",
    clientId: "",
    contactPerson: "",
    billingAddress: {
      street: "",
      city: "",
      state: "",
      country: "",
      zipCode: ""
    },
    shippingAddress: {
      street: "",
      city: "",
      state: "",
      country: "",
      zipCode: ""
    },
    clientDetails: {
      since: new Date().toISOString().split('T')[0],
      contractValue: undefined,
      paymentTerms: "net30",
      accountManager: ""
    },
    isActive: true
  };

  // Create form
  const createForm = useForm<Client>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      ...defaultFormValues,
      name: "",
      email: "",
      password: "",
    } as Client,
  });

  // Edit form
  const editForm = useForm<Client>({
    resolver: zodResolver(insertClientSchema.partial()),
    defaultValues: {
      ...defaultFormValues,
      name: "",
      email: "",
      password: "",
    } as Client,
  });

  const createClientMutation = useMutation({
    mutationFn: async (userData: Client) => {
      console.log("Mutation data:", userData);
      const res = await apiRequest("POST", "/api/users", userData);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/clients"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Client created",
        description: "New client has been added successfully.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Create client error:", error);
      toast({
        title: "Failed to create client",
        description: error.message || "Unable to create client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/clients"] });
      setIsEditDialogOpen(false);
      setSelectedClient(null);
      toast({
        title: "Client updated",
        description: "Client details have been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Update client error:", error);
      toast({
        title: "Failed to update client",
        description: error.message || "Unable to update client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/clients"] });
      setClientToDelete(null);
      toast({
        title: "Client deactivated",
        description: "Client has been deactivated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Delete client error:", error);
      toast({
        title: "Failed to deactivate client",
        description: error.message || "Unable to deactivate client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reactivateClientMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("PATCH", `/api/users/${userId}/reactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/clients"] });
      toast({
        title: "Client reactivated",
        description: "Client has been reactivated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Reactivate client error:", error);
      toast({
        title: "Failed to reactivate client",
        description: error.message || "Unable to reactivate client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredClients = clients?.filter((client) => {
    const q = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q) ||
      (client.company && client.company.toLowerCase().includes(q)) ||
      (client.industry && client.industry.toLowerCase().includes(q)) ||
      (client.contactPerson && client.contactPerson.toLowerCase().includes(q))
    );
  });

  const onCreateSubmit = (data: Client) => {
    console.log("Form data (JSON):", JSON.stringify(data, null, 2));
    createClientMutation.mutate(data);
  };

  const onEditSubmit = (data: Partial<Client>) => {
    if (selectedClient) {
      updateClientMutation.mutate({ id: selectedClient._id, data });
    }
  };

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setIsViewDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    editForm.reset(client);
    setIsEditDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) {
      return "N/A";
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage client accounts and relationships
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-client">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client account with complete details. Fill all tabs for complete client profile.
              </DialogDescription>
            </DialogHeader>
            <ClientForm
              form={createForm}
              onSubmit={onCreateSubmit}
              isSubmitting={createClientMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, email, company, industry, or contact person..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredClients && filteredClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company & Industry</TableHead>
                  <TableHead>Client Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client._id} data-testid={`client-${client._id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client.profileImage} />
                          <AvatarFallback className="text-xs">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{client.name}</div>
                          {client.contactPerson && (
                            <div className="text-xs text-muted-foreground">
                              Contact: {client.contactPerson}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.company && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="h-3 w-3" />
                            {client.company}
                          </div>
                        )}
                        {client.industry && (
                          <Badge variant="outline">{client.industry}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {client.clientId && (
                          <div>ID: {client.clientId}</div>
                        )}
                        {client.clientType && (
                          <Badge variant="secondary" className="capitalize">
                            {client.clientType}
                          </Badge>
                        )}
                        {client.clientDetails?.contractValue && (
                          <div className="text-muted-foreground">
                            {formatCurrency(client.clientDetails.contractValue)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? "default" : "secondary"}>
                        {client.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewClient(client)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClient(client)}
                          title="Edit client"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {client.isActive ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setClientToDelete(client)}
                            title="Deactivate client"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reactivateClientMutation.mutate(client._id)}
                            title="Reactivate client"
                            disabled={reactivateClientMutation.isPending}
                          >
                            <UserCog className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No clients found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Client Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <ClientDetails client={selectedClient} formatCurrency={formatCurrency} />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information and details
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            form={editForm}
            onSubmit={onEditSubmit}
            isSubmitting={updateClientMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {clientToDelete?.name}? 
              They will no longer be able to access the system, but their data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clientToDelete && deleteClientMutation.mutate(clientToDelete._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClientMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Client Details Component
function ClientDetails({ client, formatCurrency }: { client: Client; formatCurrency: (amount: number | undefined) => string }) {
  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="business">Business</TabsTrigger>
        <TabsTrigger value="address">Address</TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic" className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={client.profileImage} />
            <AvatarFallback className="text-lg">
              {client.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{client.name}</h3>
            <p className="text-muted-foreground">{client.contactPerson ? `Contact: ${client.contactPerson}` : "Primary Contact"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{client.email}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Phone</label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{client.phone || "N/A"}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Client Type</label>
            <Badge variant="outline" className="capitalize">
              {client.clientType || "individual"}
            </Badge>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Badge variant={client.isActive ? "default" : "secondary"}>
              {client.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="business" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Company</label>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{client.company || "N/A"}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Industry</label>
            <div>{client.industry || "N/A"}</div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Client ID</label>
            <div>{client.clientId || "N/A"}</div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Contact Person</label>
            <div>{client.contactPerson || "N/A"}</div>
          </div>
        </div>

        {client.clientDetails && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <label className="text-sm font-medium">Client Since</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{client.clientDetails.since ? new Date(client.clientDetails.since).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Contract Value</label>
              <div>{client.clientDetails.contractValue ? formatCurrency(client.clientDetails.contractValue) : "N/A"}</div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Payment Terms</label>
              <Badge variant="outline" className="capitalize">
                {client.clientDetails.paymentTerms || "net30"}
              </Badge>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Account Manager</label>
              <div>{client.clientDetails.accountManager || "N/A"}</div>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="address" className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Billing Address</h4>
          {client.billingAddress ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Street</label>
                <div>{client.billingAddress.street || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City</label>
                <div>{client.billingAddress.city || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">State</label>
                <div>{client.billingAddress.state || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">ZIP Code</label>
                <div>{client.billingAddress.zipCode || "N/A"}</div>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Country</label>
                <div>{client.billingAddress.country || "N/A"}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No billing address information available
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-lg">Shipping Address</h4>
          {client.shippingAddress ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Street</label>
                <div>{client.shippingAddress.street || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City</label>
                <div>{client.shippingAddress.city || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">State</label>
                <div>{client.shippingAddress.state || "N/A"}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">ZIP Code</label>
                <div>{client.shippingAddress.zipCode || "N/A"}</div>
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Country</label>
                <div>{client.shippingAddress.country || "N/A"}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No shipping address information available
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

// Client Form Component
function ClientForm({
  form,
  onSubmit,
  isSubmitting,
}: {
  form: any;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const mode = form.getValues()._id ? "edit" : "create";
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mode === "create" && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Smith (if different from name)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input placeholder="CLI-1001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="business" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="Technology" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientDetails.since"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Since</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientDetails.paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="net15">Net 15</SelectItem>
                        <SelectItem value="net30">Net 30</SelectItem>
                        <SelectItem value="net45">Net 45</SelectItem>
                        <SelectItem value="net60">Net 60</SelectItem>
                        <SelectItem value="dueOnReceipt">Due on Receipt</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientDetails.contractValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientDetails.accountManager"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Manager</FormLabel>
                    <FormControl>
                      <Input placeholder="Manager Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="address" className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Billing Address</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billingAddress.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingAddress.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingAddress.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingAddress.zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingAddress.country"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-lg">Shipping Address</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shippingAddress.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shippingAddress.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shippingAddress.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shippingAddress.zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shippingAddress.country"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
