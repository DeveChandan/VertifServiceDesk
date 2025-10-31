import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, TicketStatus } from "@shared/schema";
import { useLocation } from "wouter";
import { Clock, CheckCircle2, ListTodo } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDashboard() {
  const [, setLocation] = useLocation();

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets/assigned"],
  });

  const stats = tickets
    ? {
        total: tickets.length,
        inProgress: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        completed: tickets.filter(
          (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
        ).length,
      }
    : { total: 0, inProgress: 0, completed: 0 };

  const groupedTickets = {
    assigned: tickets?.filter((t) => t.status === TicketStatus.OPEN) || [],
    inProgress: tickets?.filter((t) => t.status === TicketStatus.IN_PROGRESS) || [],
    completed:
      tickets?.filter(
        (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
      ) || [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-white font-semibold">Employee Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your assigned support tickets
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-in-progress">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.inProgress}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : groupedTickets.assigned.length > 0 ? (
              <div className="space-y-3">
                {groupedTickets.assigned.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="p-3 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/employee/tickets/${ticket._id}`)}
                    data-testid={`ticket-assigned-${ticket._id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{ticket.ticketNumber}
                      </span>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <h4 className="font-medium text-sm mb-1 truncate">{ticket.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {ticket.clientName}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No assigned tickets
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : groupedTickets.inProgress.length > 0 ? (
              <div className="space-y-3">
                {groupedTickets.inProgress.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="p-3 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/employee/tickets/${ticket._id}`)}
                    data-testid={`ticket-in-progress-${ticket._id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{ticket.ticketNumber}
                      </span>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <h4 className="font-medium text-sm mb-1 truncate">{ticket.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {ticket.clientName}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tickets in progress
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : groupedTickets.completed.length > 0 ? (
              <div className="space-y-3">
                {groupedTickets.completed.slice(0, 5).map((ticket) => (
                  <div
                    key={ticket._id}
                    className="p-3 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/employee/tickets/${ticket._id}`)}
                    data-testid={`ticket-completed-${ticket._id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{ticket.ticketNumber}
                      </span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <h4 className="font-medium text-sm mb-1 truncate">{ticket.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {ticket.clientName}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No completed tickets
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
