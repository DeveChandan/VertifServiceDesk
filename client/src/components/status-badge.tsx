import { Badge } from "@/components/ui/badge";
import { TicketStatus, TicketPriority } from "@shared/schema";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    [TicketStatus.OPEN]: {
      label: "Open",
      className: "bg-info/10 text-info border-info/20",
    },
    [TicketStatus.IN_PROGRESS]: {
      label: "In Progress",
      className: "bg-warning/10 text-warning border-warning/20",
    },
    [TicketStatus.RESOLVED]: {
      label: "Resolved",
      className: "bg-success/10 text-success border-success/20",
    },
    [TicketStatus.CLOSED]: {
      label: "Closed",
      className: "bg-muted text-muted-foreground border-muted",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const priorityConfig = {
    [TicketPriority.HIGH]: {
      label: "High",
      className: "bg-error/10 text-error border-error/20",
    },
    [TicketPriority.MEDIUM]: {
      label: "Medium",
      className: "bg-warning/10 text-warning border-warning/20",
    },
    [TicketPriority.LOW]: {
      label: "Low",
      className: "bg-success/10 text-success border-success/20",
    },
  };

  const config = priorityConfig[priority];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
      data-testid={`badge-priority-${priority}`}
    >
      {config.label}
    </Badge>
  );
}
