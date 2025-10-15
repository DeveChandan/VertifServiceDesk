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
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminTicketsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assignTo, setAssignTo] = useState<string>("");

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: employees } = useQuery<User[]>({
    queryKey: ["/api/users/employees"],
  });

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

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(search.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
                  className="flex items-start justify-between p-4 border rounded-lg hover-elevate"
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
                    </div>
                    <h3 className="font-medium mb-1">{ticket.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-muted-foreground">
                        Client: {ticket.clientName}
                      </p>
                      {ticket.assignedToName && (
                        <p className="text-xs text-muted-foreground">
                          Assigned to: {ticket.assignedToName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <StatusBadge status={ticket.status} />
                    {!ticket.assignedTo && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                        data-testid={`button-assign-${ticket._id}`}
                      >
                        Assign
                      </Button>
                    )}
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

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Ticket</DialogTitle>
            <DialogDescription>
              Assign this ticket to an employee based on their skills
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium mb-1">
                  #{selectedTicket.ticketNumber} - {selectedTicket.title}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  Category: {selectedTicket.category}
                </p>
              </div>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger data-testid="select-assign-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.name} {emp.department && `(${emp.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() =>
                  assignTo &&
                  selectedTicket &&
                  assignTicketMutation.mutate({
                    ticketId: selectedTicket._id,
                    employeeId: assignTo,
                  })
                }
                disabled={!assignTo || assignTicketMutation.isPending}
                className="w-full"
                data-testid="button-confirm-assign"
              >
                {assignTicketMutation.isPending ? "Assigning..." : "Assign Ticket"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
