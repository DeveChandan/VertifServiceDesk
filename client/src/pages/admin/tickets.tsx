import { useQuery, useMutation } from "@tanstack/react-query";
import { Ticket, TicketStatus, User, UserRole } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { useLocation } from "wouter";
import { useState } from "react";
import { Search, Users, UserPlus, UserMinus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

export default function AdminTicketsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assignTo, setAssignTo] = useState<string>("");
  const [assignMode, setAssignMode] = useState<"single" | "multiple">("single");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: employees } = useQuery<User[]>({
    queryKey: ["/api/users/employees"],
  });

  // Single assignment mutation
  const assignTicketMutation = useMutation({
    mutationFn: async ({ ticketId, employeeId }: { ticketId: string; employeeId: string }) => {
      return await apiRequest("PATCH", `/api/tickets/${ticketId}/assign`, { employeeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setSelectedTicket(null);
      setAssignTo("");
      toast({
        title: "Ticket assigned",
        description: "Ticket has been assigned successfully.",
      });
    },
  });

  // Multiple assignment mutation
  const assignMultipleMutation = useMutation({
    mutationFn: async ({ ticketId, employeeIds }: { ticketId: string; employeeIds: string[] }) => {
      return await apiRequest("PATCH", `/api/tickets/${ticketId}/assign`, { employeeIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setSelectedTicket(null);
      setSelectedEmployees([]);
      toast({
        title: "Ticket assigned",
        description: "Ticket has been assigned to multiple employees.",
      });
    },
  });

  // Add employee to existing assignment
  const addEmployeeMutation = useMutation({
    mutationFn: async ({ ticketId, employeeId }: { ticketId: string; employeeId: string }) => {
      return await apiRequest("PATCH", `/api/tickets/${ticketId}/add-employee`, { employeeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setSelectedTicket(null);
      setAssignTo("");
      toast({
        title: "Employee added",
        description: "Employee has been added to the ticket.",
      });
    },
  });

  // Remove employee from assignment
  const removeEmployeeMutation = useMutation({
    mutationFn: async ({ ticketId, employeeId }: { ticketId: string; employeeId: string }) => {
      return await apiRequest("PATCH", `/api/tickets/${ticketId}/remove-employee`, { employeeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/employees"] });
      toast({
        title: "Employee removed",
        description: "Employee has been removed from the ticket.",
      });
    },
  });

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(search.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEmployeeSelect = (employeeId: string) => {
    if (assignMode === "single") {
      setAssignTo(employeeId);
    } else {
      setSelectedEmployees(prev =>
        prev.includes(employeeId)
          ? prev.filter(id => id !== employeeId)
          : [...prev, employeeId]
      );
    }
  };

  const getAssignedEmployeesCount = (ticket: Ticket) => {
    return ticket.assignedEmployees?.length || (ticket.assignedTo ? 1 : 0);
  };

  const getAssignedEmployeeNames = (ticket: Ticket) => {
    if (ticket.assignedEmployees && ticket.assignedEmployees.length > 0) {
      return ticket.assignedEmployees.map(emp => emp.employeeName).join(', ');
    }
    return ticket.assignedToName || '';
  };

  const isEmployeeAssigned = (ticket: Ticket, employeeId: string) => {
    if (ticket.assignedEmployees) {
      return ticket.assignedEmployees.some(emp => emp.employeeId === employeeId);
    }
    return ticket.assignedTo === employeeId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">All Tickets</h1>
        <p className="text-muted-foreground mt-1">
          Manage and assign tickets to employees
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredTickets && filteredTickets.length > 0 ? (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`ticket-${ticket._id}`}
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setLocation(`/admin/tickets/${ticket._id}`)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{ticket.ticketNumber}
                      </span>
                      <PriorityBadge priority={ticket.priority} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {ticket.category}
                      </span>
                      {ticket.department && (
                        <Badge variant="outline" className="text-xs">
                          {ticket.department}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium mb-1">{ticket.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-muted-foreground">
                        Client: {ticket.clientName}
                      </p>
                      {getAssignedEmployeesCount(ticket) > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Assigned to: {getAssignedEmployeeNames(ticket)}
                            {getAssignedEmployeesCount(ticket) > 1 && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                +{getAssignedEmployeesCount(ticket) - 1}
                              </Badge>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <StatusBadge status={ticket.status} />
                    <div className="flex flex-col gap-2">
                      {getAssignedEmployeesCount(ticket) === 0 ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                            setAssignMode("single");
                          }}
                          data-testid={`button-assign-${ticket._id}`}
                        >
                          Assign
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                              setAssignMode("multiple");
                            }}
                            title="Add another employee"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                              setAssignMode("manage");
                            }}
                            title="Manage assignments"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={!!selectedTicket && assignMode !== "manage"} onOpenChange={() => {
        setSelectedTicket(null);
        setAssignTo("");
        setSelectedEmployees([]);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assignMode === "single" ? "Assign Ticket" : "Assign Multiple Employees"}
            </DialogTitle>
            <DialogDescription>
              {assignMode === "single" 
                ? "Assign this ticket to an employee"
                : "Assign multiple employees to this ticket"
              }
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium mb-1">
                  #{selectedTicket.ticketNumber} - {selectedTicket.title}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  Category: {selectedTicket.category} | Department: {selectedTicket.department}
                </p>
              </div>

              {/* Assignment Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={assignMode === "single" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAssignMode("single")}
                >
                  Single
                </Button>
                <Button
                  variant={assignMode === "multiple" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAssignMode("multiple")}
                >
                  Multiple
                </Button>
              </div>

              {/* Employee Selection */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Select Employee(s)</p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {employees?.map((emp) => (
                    <div
                      key={emp._id}
                      className={`flex items-center justify-between p-2 border rounded-lg cursor-pointer transition-colors ${
                        (assignMode === "single" && assignTo === emp._id) ||
                        (assignMode === "multiple" && selectedEmployees.includes(emp._id))
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleEmployeeSelect(emp._id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.department} • {emp.skills?.join(', ')}
                        </p>
                      </div>
                      {(assignMode === "single" && assignTo === emp._id) ||
                       (assignMode === "multiple" && selectedEmployees.includes(emp._id)) ? (
                        <Badge variant="secondary">Selected</Badge>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => {
                  if (assignMode === "single" && assignTo) {
                    assignTicketMutation.mutate({
                      ticketId: selectedTicket._id,
                      employeeId: assignTo,
                    });
                  } else if (assignMode === "multiple" && selectedEmployees.length > 0) {
                    assignMultipleMutation.mutate({
                      ticketId: selectedTicket._id,
                      employeeIds: selectedEmployees,
                    });
                  }
                }}
                disabled={
                  (assignMode === "single" && !assignTo) ||
                  (assignMode === "multiple" && selectedEmployees.length === 0) ||
                  assignTicketMutation.isPending ||
                  assignMultipleMutation.isPending
                }
                className="w-full"
                data-testid="button-confirm-assign"
              >
                {assignTicketMutation.isPending || assignMultipleMutation.isPending
                  ? "Assigning..."
                  : `Assign ${assignMode === "multiple" ? `(${selectedEmployees.length})` : ''}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Assignments Dialog */}
      <Dialog open={!!selectedTicket && assignMode === "manage"} onOpenChange={() => {
        setSelectedTicket(null);
        setAssignMode("single");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Assignments</DialogTitle>
            <DialogDescription>
              Manage employees assigned to this ticket
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium mb-1">
                  #{selectedTicket.ticketNumber} - {selectedTicket.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Currently assigned to {getAssignedEmployeesCount(selectedTicket)} employee(s)
                </p>
              </div>

              {/* Current Assignments */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Assigned Employees</p>
                {selectedTicket.assignedEmployees && selectedTicket.assignedEmployees.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTicket.assignedEmployees.map((emp, index) => (
                      <div
                        key={emp.employeeId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {emp.employeeName}
                            {emp.isPrimary && (
                              <Badge variant="default" className="ml-2 text-xs">
                                Primary
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {emp.department} • Assigned {new Date(emp.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            removeEmployeeMutation.mutate({
                              ticketId: selectedTicket._id,
                              employeeId: emp.employeeId,
                            });
                          }}
                          disabled={removeEmployeeMutation.isPending}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : selectedTicket.assignedTo ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{selectedTicket.assignedToName}</p>
                      <p className="text-xs text-muted-foreground">Single assignment</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        removeEmployeeMutation.mutate({
                          ticketId: selectedTicket._id,
                          employeeId: selectedTicket.assignedTo!,
                        });
                      }}
                      disabled={removeEmployeeMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No employees assigned
                  </p>
                )}
              </div>

              {/* Add More Employees */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Add More Employees</p>
                <Select onValueChange={(value) => setAssignTo(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      ?.filter(emp => !isEmployeeAssigned(selectedTicket, emp._id))
                      .map((emp) => (
                        <SelectItem key={emp._id} value={emp._id}>
                          {emp.name} {emp.department && `(${emp.department})`}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (assignTo) {
                      addEmployeeMutation.mutate({
                        ticketId: selectedTicket._id,
                        employeeId: assignTo,
                      });
                    }
                  }}
                  disabled={!assignTo || addEmployeeMutation.isPending}
                  className="w-full"
                >
                  {addEmployeeMutation.isPending ? "Adding..." : "Add Employee"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
