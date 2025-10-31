import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ticket, TicketStatus } from "@shared/schema";
import { useLocation } from "wouter";
import { Plus, Ticket as TicketIcon, CheckCircle2, Clock, XCircle } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientUserDashboard() {
  const [, setLocation] = useLocation();

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets/my-tickets"],
  });

  const stats = tickets
    ? {
        total: tickets.length,
        open: tickets.filter((t) => t.status === TicketStatus.OPEN).length,
        inProgress: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        resolved: tickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
      }
    : { total: 0, open: 0, inProgress: 0, resolved: 0 };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl text-white font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your support tickets
          </p>
        </div>
        <Button onClick={() => setLocation("/clientUser/create-ticket")} data-testid="button-create-ticket">
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <Clock className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-open">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.open}
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
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-resolved">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.resolved}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.slice(0, 5).map((ticket) => (
                <div
                  key={ticket._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/clientUser/tickets/${ticket._id}`)}
                  data-testid={`ticket-${ticket._id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{ticket.ticketNumber}
                      </span>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <h3 className="font-medium truncate">{ticket.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {ticket.description}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tickets yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first support ticket to get started
              </p>
              <Button onClick={() => setLocation("/clientUser/create-ticket")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
