import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Ticket {
  _id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export default function ClientUserTickets() {
  const params = useParams();
  const userId = params.userId as string;
  const [location, setLocation] = useLocation();

  const { data: tickets, isLoading, error, refetch } = useQuery<Ticket[]>({
    queryKey: ["clientUserTickets", userId],
    queryFn: async () => {
      return await apiRequest("GET", `/api/tickets/by-user/${userId}`);
    },
    enabled: !!userId,
  });

  console.log("Fetched tickets:", tickets);

  const getStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    switch (status) {
      case "open":
        variant = "default";
        break;
      case "in_progress":
        variant = "outline";
        break;
      case "resolved":
        variant = "secondary";
        break;
      case "closed":
        variant = "destructive";
        break;
    }
    return <Badge variant={variant} className="capitalize">{status.replace("_", " ")}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    switch (priority) {
      case "low":
        variant = "default";
        break;
      case "medium":
        variant = "outline";
        break;
      case "high":
        variant = "destructive";
        break;
    }
    return <Badge variant={variant} className="capitalize">{priority}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Failed to load tickets. Please try again.</p>
              <Button onClick={() => refetch()} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => setLocation("/client/clientUserManagement")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl text-white font-bold tracking-tight">Tickets by Client User</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets Created by User ID: {userId}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : tickets && tickets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket._id}>
                    <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{ticket.category}</TableCell>
                    <TableCell>{ticket.createdByName}</TableCell>
                    <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setLocation(`/ticket-detail/${ticket._id}`)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No tickets found for this user.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
