import { useQuery, useMutation } from "@tanstack/react-query";
import { User, UserRole, InsertUser } from "@shared/schema";
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
import { Plus, Search, Trash2, UserCog, Edit, Eye, Mail, Phone, Calendar } from "lucide-react";
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

// Extended type for form data
interface EmployeeFormData {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  department?: string;
  skills?: string[];
  skillsString?: string;
  jobTitle?: string;
  employeeId?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  employmentDetails?: {
    hireDate?: string;
    employmentType?: "full-time" | "part-time" | "contract";
    salary?: number;
    reportsTo?: string;
  };
  isActive?: boolean;
}

export default function EmployeesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);

  const { data: employees, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/employees"],
  });

  // Default form values
  const defaultFormValues: Partial<EmployeeFormData> = {
    role: UserRole.EMPLOYEE,
    phone: "",
    department: "",
    skills: [],
    skillsString: "",
    jobTitle: "",
    employeeId: "",
    dateOfBirth: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      zipCode: ""
    },
    emergencyContact: {
      name: "",
      relationship: "",
      phone: ""
    },
    employmentDetails: {
      hireDate: new Date().toISOString().split('T')[0],
      employmentType: "full-time",
      salary: undefined,
      reportsTo: ""
    },
    isActive: true
  };

  // Create form
  const createForm = useForm<EmployeeFormData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      ...defaultFormValues,
      name: "",
      email: "",
      password: "",
    } as EmployeeFormData,
  });

  // Edit form
  const editForm = useForm<EmployeeFormData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      ...defaultFormValues,
      name: "",
      email: "",
      password: "",
    } as EmployeeFormData,
  });

  // Helper function to recursively clean data
  const deepClean = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return undefined;
    }

    if (Array.isArray(obj)) {
      const cleanedArray = obj.map(deepClean).filter(v => v !== undefined);
      return cleanedArray.length > 0 ? cleanedArray : undefined;
    }

    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const cleanedObject: { [key: string]: any } = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          if (value !== '' && value !== undefined && value !== null) {
            const cleanedValue = deepClean(value);
            if (cleanedValue !== undefined) {
              cleanedObject[key] = cleanedValue;
            }
          }
        }
      }
      return Object.keys(cleanedObject).length > 0 ? cleanedObject : undefined;
    }

    return obj;
  };

  // Helper function to format form data for API
  const formatEmployeeData = (data: EmployeeFormData, mode: "create" | "edit") => {
    console.log("🔍 RAW FORM DATA:", data);

    // Start with a copy of the data
    let formattedData: any = { ...data };

    // Handle skills conversion from string to array
    if (formattedData.skillsString && formattedData.skillsString.trim()) {
      formattedData.skills = formattedData.skillsString
        .split(',')
        .map((skill: string) => skill.trim())
        .filter(Boolean);
    }
    // We don't need the string version anymore
    delete formattedData.skillsString;

    // Ensure role is always EMPLOYEE for this page
    formattedData.role = UserRole.EMPLOYEE;

    // For creation, ensure isActive is true
    if (mode === 'create') {
      formattedData.isActive = true;
    }

    // Remove password field if it's empty or in edit mode
    if (mode === "edit" || !formattedData.password) {
      delete formattedData.password;
    }
    
    // Convert salary to a number if it exists
    if (formattedData.employmentDetails?.salary) {
        formattedData.employmentDetails.salary = Number(formattedData.employmentDetails.salary);
    }

    // Recursively remove all empty/null/undefined values
    const cleanedData = deepClean(formattedData);

    console.log("🎯 FINAL FORMATTED DATA:", cleanedData);
    return cleanedData;
  };

  const createEmployeeMutation = useMutation({
    mutationFn: async (userData: EmployeeFormData) => {
      const formattedData = formatEmployeeData(userData, "create");

      console.group("🚀 CREATE employee payload");
      console.log("Formatted data:", formattedData);
      console.log("JSON:", JSON.stringify(formattedData, null, 2));
      console.groupEnd();

      const res = await apiRequest("POST", "/api/users", formattedData);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/employees"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Employee created",
        description: "New employee has been added successfully.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Create employee error:", error);
      toast({
        title: "Failed to create employee",
        description: error.message || "Unable to create employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployeeFormData }) => {
      const formattedData = formatEmployeeData(data, "edit");

      console.group(`✏️ UPDATE employee payload (id=${id})`);
      console.log("Formatted data:", formattedData);
      console.log("JSON:", JSON.stringify(formattedData, null, 2));
      console.groupEnd();

      const res = await apiRequest("PATCH", `/api/users/${id}`, formattedData);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/employees"] });
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      toast({
        title: "Employee updated",
        description: "Employee details have been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Update employee error:", error);
      toast({
        title: "Failed to update employee",
        description: error.message || "Unable to update employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/employees"] });
      setEmployeeToDelete(null);
      toast({
        title: "Employee deactivated",
        description: "Employee has been deactivated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Delete employee error:", error);
      toast({
        title: "Failed to deactivate employee",
        description: error.message || "Unable to deactivate employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reactivateEmployeeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("PATCH", `/api/users/${userId}/reactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/employees"] });
      toast({
        title: "Employee reactivated",
        description: "Employee has been reactivated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("❌ Reactivate employee error:", error);
      toast({
        title: "Failed to reactivate employee",
        description: error.message || "Unable to reactivate employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees = employees?.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      (emp.department && emp.department.toLowerCase().includes(q)) ||
      String((emp as any).jobTitle || "").toLowerCase().includes(q)
    );
  });

  const onCreateSubmit = (data: EmployeeFormData) => {
    console.log("📝 CREATE form submitted:", data);
    createEmployeeMutation.mutate(data);
  };

  const onEditSubmit = (data: EmployeeFormData) => {
    console.log("📝 EDIT form submitted:", data);
    if (selectedEmployee) {
      updateEmployeeMutation.mutate({ id: selectedEmployee._id, data });
    }
  };

  const handleViewEmployee = (employee: User) => {
    setSelectedEmployee(employee);
    setIsViewDialogOpen(true);
  };

  const handleEditEmployee = (employee: User) => {
    setSelectedEmployee(employee);
    
    // Format the data for the edit form
    const formData: EmployeeFormData = {
      name: employee.name,
      email: employee.email,
      password: "", // Not used in edit
      role: employee.role,
      phone: employee.phone || "",
      department: employee.department || "",
      skills: employee.skills || [],
      skillsString: employee.skills?.join(', ') || "",
      jobTitle: employee.jobTitle || "",
      employeeId: employee.employeeId || "",
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : "",
      address: employee.address || defaultFormValues.address,
      emergencyContact: employee.emergencyContact || defaultFormValues.emergencyContact,
      employmentDetails: employee.employmentDetails || defaultFormValues.employmentDetails,
      isActive: employee.isActive
    };

    editForm.reset(formData);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Employees</h1>
          <p className="text-muted-foreground mt-1">
            Manage employee accounts and assignments
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-employee">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Create a new employee account with complete details. Fill all tabs for complete employee profile.
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm
              form={createForm}
              onSubmit={onCreateSubmit}
              isSubmitting={createEmployeeMutation.isPending}
              mode="create"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Rest of your component remains the same */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name, email, department, or job title..."
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
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Department & Role</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee._id} data-testid={`employee-${employee._id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={employee.profileImage} />
                          <AvatarFallback className="text-xs">
                            {getInitials(employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          {employee.jobTitle && (
                            <div className="text-xs text-muted-foreground">{employee.jobTitle}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {employee.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">{employee.department || "N/A"}</Badge>
                        <div className="text-xs text-muted-foreground capitalize">
                          {employee.role}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {employee.employeeId && (
                          <div>ID: {employee.employeeId}</div>
                        )}
                        {employee.employmentDetails?.hireDate && (
                          <div className="text-muted-foreground">
                            Since {formatDate(employee.employmentDetails.hireDate)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.isActive ? "default" : "secondary"}>
                        {employee.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewEmployee(employee)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditEmployee(employee)}
                          title="Edit employee"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {employee.isActive ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEmployeeToDelete(employee)}
                            title="Deactivate employee"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reactivateEmployeeMutation.mutate(employee._id)}
                            title="Reactivate employee"
                            disabled={reactivateEmployeeMutation.isPending}
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
              <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No employees found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Employee Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeDetails employee={selectedEmployee} />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information and details
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            form={editForm}
            onSubmit={onEditSubmit}
            isSubmitting={updateEmployeeMutation.isPending}
            mode="edit"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!employeeToDelete} onOpenChange={() => setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {employeeToDelete?.name}? 
              They will no longer be able to access the system, but their data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => employeeToDelete && deleteEmployeeMutation.mutate(employeeToDelete._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmployeeMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Employee Details Component (keep as is)
function EmployeeDetails({ employee }: { employee: User }) {
  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="employment">Employment</TabsTrigger>
        <TabsTrigger value="emergency">Emergency</TabsTrigger>
      </TabsList>
      
      <TabsContent value="personal" className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={employee.profileImage} />
            <AvatarFallback className="text-lg">
              {employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{employee.name}</h3>
            <p className="text-muted-foreground">{employee.jobTitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{employee.email}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Phone</label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{employee.phone || "N/A"}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Department</label>
            <Badge variant="outline">{employee.department || "N/A"}</Badge>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Role</label>
            <Badge variant="secondary" className="capitalize">{employee.role}</Badge>
          </div>
          {employee.dateOfBirth && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Date of Birth</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(employee.dateOfBirth).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        {employee.skills && employee.skills.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Skills</label>
            <div className="flex flex-wrap gap-1">
              {employee.skills.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="employment" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Employee ID</label>
            <div>{employee.employeeId || "N/A"}</div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Badge variant={employee.isActive ? "default" : "secondary"}>
              {employee.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {employee.employmentDetails && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Hire Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.employmentDetails.hireDate ? new Date(employee.employmentDetails.hireDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Employment Type</label>
                <Badge variant="outline" className="capitalize">
                  {employee.employmentDetails.employmentType}
                </Badge>
              </div>
              {employee.employmentDetails.salary && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Salary</label>
                  <div>${employee.employmentDetails.salary.toLocaleString()}</div>
                </div>
              )}
              {employee.employmentDetails.reportsTo && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Reports To</label>
                  <div>{employee.employmentDetails.reportsTo}</div>
                </div>
              )}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="emergency" className="space-y-4">
        {employee.emergencyContact ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Contact Name</label>
              <div>{employee.emergencyContact.name}</div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Relationship</label>
              <div>{employee.emergencyContact.relationship}</div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone</label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{employee.emergencyContact.phone}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No emergency contact information available
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// Employee Form Component - UPDATED WITH ALL FIELDS
function EmployeeForm({ 
  form, 
  onSubmit, 
  isSubmitting, 
  mode 
}: { 
  form: any;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  mode: "create" | "edit";
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="contact">Contact & Emergency</TabsTrigger>
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
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

      <div className="grid grid-cols-2 gap-4">
  <FormField
    control={form.control}
    name="department"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Department *</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
          </FormControl>
          <SelectContent className="max-h-80">
            {/* SAP Departments */}
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">SAP</div>
            <SelectItem value="SAP ABAP">SAP ABAP</SelectItem>
            <SelectItem value="SAP BASIS">SAP BASIS</SelectItem>
            <SelectItem value="SAP FICO">SAP FICO</SelectItem>
            <SelectItem value="SAP MM">SAP MM</SelectItem>
            <SelectItem value="SAP SD">SAP SD</SelectItem>
            <SelectItem value="SAP PP">SAP PP</SelectItem>
            <SelectItem value="SAP WM">SAP WM</SelectItem>
            <SelectItem value="SAP PM">SAP PM</SelectItem>
            <SelectItem value="SAP HR/HCM">SAP HR/HCM</SelectItem>
            <SelectItem value="SAP SuccessFactors">SAP SuccessFactors</SelectItem>
            <SelectItem value="SAP Ariba">SAP Ariba</SelectItem>
            <SelectItem value="SAP S/4HANA">SAP S/4HANA</SelectItem>
            <SelectItem value="SAP BW/BI">SAP BW/BI</SelectItem>
            <SelectItem value="SAP CRM">SAP CRM</SelectItem>
            <SelectItem value="SAP Fiori/UI5">SAP Fiori/UI5</SelectItem>
            <SelectItem value="SAP Cloud Platform">SAP Cloud Platform</SelectItem>
            <SelectItem value="SAP Integration">SAP Integration</SelectItem>
            <SelectItem value="SAP Security">SAP Security</SelectItem>
            
            {/* UI/UX Departments */}
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">UI/UX Design</div>
            <SelectItem value="UI/UX Design">UI/UX Design</SelectItem>
            <SelectItem value="Product Design">Product Design</SelectItem>
            <SelectItem value="Interaction Design">Interaction Design</SelectItem>
            <SelectItem value="Visual Design">Visual Design</SelectItem>
            <SelectItem value="UX Research">UX Research</SelectItem>
            <SelectItem value="Design Systems">Design Systems</SelectItem>
            <SelectItem value="Mobile Design">Mobile Design</SelectItem>
            <SelectItem value="Web Design">Web Design</SelectItem>
            
            {/* Full Stack Development */}
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Full Stack Development</div>
            <SelectItem value="Full Stack Development">Full Stack Development</SelectItem>
            <SelectItem value="Frontend Development">Frontend Development</SelectItem>
            <SelectItem value="Backend Development">Backend Development</SelectItem>
            <SelectItem value="MERN Stack">MERN Stack</SelectItem>
            <SelectItem value="MEAN Stack">MEAN Stack</SelectItem>
            <SelectItem value=".NET Full Stack">.NET Full Stack</SelectItem>
            <SelectItem value="Java Full Stack">Java Full Stack</SelectItem>
            <SelectItem value="Python Full Stack">Python Full Stack</SelectItem>
            
            {/* Mobile Development */}
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Mobile Development</div>
            <SelectItem value="Android Development">Android Development</SelectItem>
            <SelectItem value="iOS Development">iOS Development</SelectItem>
            <SelectItem value="React Native">React Native</SelectItem>
            <SelectItem value="Flutter Development">Flutter Development</SelectItem>
            <SelectItem value="Cross-Platform Mobile">Cross-Platform Mobile</SelectItem>
            <SelectItem value="Mobile App Development">Mobile App Development</SelectItem>
            
            {/* Web Development */}
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Web Development</div>
            <SelectItem value="Web Development">Web Development</SelectItem>
            <SelectItem value="Frontend Web">Frontend Web</SelectItem>
            <SelectItem value="Backend Web">Backend Web</SelectItem>
            <SelectItem value="JavaScript Development">JavaScript Development</SelectItem>
            <SelectItem value="TypeScript Development">TypeScript Development</SelectItem>
            <SelectItem value="React.js Development">React.js Development</SelectItem>
            <SelectItem value="Vue.js Development">Vue.js Development</SelectItem>
            <SelectItem value="Angular Development">Angular Development</SelectItem>
            <SelectItem value="Node.js Development">Node.js Development</SelectItem>
            
            {/* Automation */}
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Automation</div>
            <SelectItem value="Test Automation">Test Automation</SelectItem>
            <SelectItem value="RPA (Robotic Process Automation)">RPA (Robotic Process Automation)</SelectItem>
            <SelectItem value="DevOps Automation">DevOps Automation</SelectItem>
            <SelectItem value="Process Automation">Process Automation</SelectItem>
            <SelectItem value="QA Automation">QA Automation</SelectItem>
            <SelectItem value="Infrastructure Automation">Infrastructure Automation</SelectItem>
            
            {/* Other IT */}
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Other IT</div>
            <SelectItem value="DevOps">DevOps</SelectItem>
            <SelectItem value="Cloud Engineering">Cloud Engineering</SelectItem>
            <SelectItem value="Data Science">Data Science</SelectItem>
            <SelectItem value="Machine Learning">Machine Learning</SelectItem>
            <SelectItem value="Cyber Security">Cyber Security</SelectItem>
            <SelectItem value="Database Administration">Database Administration</SelectItem>
            <SelectItem value="Network Engineering">Network Engineering</SelectItem>
            <SelectItem value="IT Support">IT Support</SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
  <FormField
    control={form.control}
    name="jobTitle"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Job Title *</FormLabel>
        <FormControl>
          <Input placeholder="e.g., Senior SAP ABAP Developer" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input placeholder="EMP-1001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skillsString"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="JavaScript, React, Node.js (comma separated)" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="employment" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employmentDetails.hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employmentDetails.employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full-time">Full Time</SelectItem>
                        <SelectItem value="part-time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
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
                name="employmentDetails.salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary</FormLabel>
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
                name="employmentDetails.reportsTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reports To</FormLabel>
                    <FormControl>
                      <Input placeholder="Manager Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Address Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.street"
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
                  name="address.city"
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
                  name="address.state"
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
                  name="address.zipCode"
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
                  name="address.country"
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
              <h4 className="font-medium text-lg">Emergency Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContact.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact.relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="Spouse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact.phone"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 987-6543" {...field} />
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
            {isSubmitting ? "Saving..." : mode === "create" ? "Create Employee" : "Update Employee"}
          </Button>
        </div>
      </form>
    </Form>
  );
}