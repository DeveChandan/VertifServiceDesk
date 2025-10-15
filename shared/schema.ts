import { z } from "zod";

// User Roles
export enum UserRole {
  ADMIN = "admin",
  EMPLOYEE = "employee",
  CLIENT = "client",
}

// Ticket Status
export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

// Ticket Priority
export enum TicketPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

// Ticket Category
export enum TicketCategory {
  HARDWARE = "hardware",
  SOFTWARE = "software",
  NETWORK = "network",
  OTHER = "other",
}

// Employee Skills
export type EmployeeSkill = "hardware" | "software" | "network";

// User Schema
export const userSchema = z.object({
  _id: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(UserRole),
  phone: z.string().optional(),
  department: z.string().optional(),
  skills: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
});

export const insertUserSchema = userSchema.omit({ _id: true, createdAt: true });
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Ticket Schema
export const ticketSchema = z.object({
  _id: z.string(),
  ticketNumber: z.string(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.nativeEnum(TicketPriority),
  category: z.nativeEnum(TicketCategory),
  status: z.nativeEnum(TicketStatus),
  clientId: z.string(),
  clientName: z.string().optional(),
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  resolvedAt: z.date().optional(),
  closedAt: z.date().optional(),
});

export const insertTicketSchema = ticketSchema.omit({
  _id: true,
  ticketNumber: true,
  clientName: true,
  assignedToName: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  closedAt: true,
}).extend({
  status: z.nativeEnum(TicketStatus).default(TicketStatus.OPEN),
});

export type Ticket = z.infer<typeof ticketSchema>;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

// Comment Schema
export const commentSchema = z.object({
  _id: z.string(),
  ticketId: z.string(),
  userId: z.string(),
  userName: z.string().optional(),
  userRole: z.nativeEnum(UserRole).optional(),
  content: z.string().min(1, "Comment cannot be empty"),
  createdAt: z.date().optional(),
});

export const insertCommentSchema = commentSchema.omit({
  _id: true,
  userName: true,
  userRole: true,
  createdAt: true,
});

export type Comment = z.infer<typeof commentSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// Feedback Schema
export const feedbackSchema = z.object({
  _id: z.string(),
  ticketId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  createdAt: z.date().optional(),
});

export const insertFeedbackSchema = feedbackSchema.omit({
  _id: true,
  createdAt: true,
});

export type Feedback = z.infer<typeof feedbackSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Analytics Types
export type TicketMetrics = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byCategory: {
    hardware: number;
    software: number;
    network: number;
    other: number;
  };
  avgResolutionTime: number;
};

export type EmployeePerformance = {
  employeeId: string;
  employeeName: string;
  totalAssigned: number;
  completed: number;
  inProgress: number;
  avgResolutionTime: number;
};

// Auth Response
export type AuthResponse = {
  user: User;
  token: string;
};
