import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeePerformance } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsPage() {
  const { data: performance, isLoading } = useQuery<EmployeePerformance[]>({
    queryKey: ["/api/analytics/employee-performance"],
  });

  const topPerformers = performance?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Employee performance and system insights
        </p>
      </div>

      {topPerformers.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {topPerformers.map((emp, index) => (
            <Card key={emp.employeeId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {index === 0 ? "🥇 Top Performer" : index === 1 ? "🥈 Second" : "🥉 Third"}
                </CardTitle>
                <Trophy className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold mb-1">{emp.employeeName}</div>
                <p className="text-sm text-muted-foreground">
                  {emp.completed} tickets completed
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Employee Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : performance && performance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Total Assigned</TableHead>
                  <TableHead>In Progress</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Avg Resolution Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((emp) => (
                  <TableRow key={emp.employeeId} data-testid={`performance-${emp.employeeId}`}>
                    <TableCell className="font-medium">{emp.employeeName}</TableCell>
                    <TableCell>{emp.totalAssigned}</TableCell>
                    <TableCell>{emp.inProgress}</TableCell>
                    <TableCell>{emp.completed}</TableCell>
                    <TableCell>
                      {emp.avgResolutionTime ? `${emp.avgResolutionTime}h` : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
