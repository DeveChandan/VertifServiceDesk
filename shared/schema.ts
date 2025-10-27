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
  jobTitle: z.string().optional(),
  employeeId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  employmentDetails: z
    .object({
      hireDate: z.string().optional(),
      employmentType: z.enum(["full-time", "part-time", "contract"]).optional(),
      salary: z.number().optional(),
      reportsTo: z.string().optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
  profileImage: z.string().optional(),
  lastLoginAt: z.date().optional(),
  createdAt: z.date().optional(),
});

export const insertUserSchema = userSchema.omit({ _id: true, createdAt: true });

// Client-specific schema
export const clientSchema = userSchema.extend({
  company: z.string().optional(),
  industry: z.string().optional(),
  clientType: z.enum(["individual", "business", "enterprise"]).optional(),
  clientId: z.string().optional(),
  contactPerson: z.string().optional(),
  billingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  shippingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  clientDetails: z
    .object({
      since: z.string().optional(),
      contractValue: z.number().optional(),
      paymentTerms: z.string().optional(),
      accountManager: z.string().optional(),
    })
    .optional(),
});

export const insertClientSchema = insertUserSchema.extend({
  company: z.string().optional(),
  industry: z.string().optional(),
  clientType: z.enum(["individual", "business", "enterprise"]).optional(),
  clientId: z.string().optional(),
  contactPerson: z.string().optional(),
  billingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  shippingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  clientDetails: z
    .object({
      since: z.string().optional(),
      contractValue: z.number().optional(),
      paymentTerms: z.string().optional(),
      accountManager: z.string().optional(),
    })
    .optional(),
});


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
  assignedEmployees: z.array(z.object({
    employeeId: z.string(),
    employeeName: z.string(),
    assignedAt: z.date(),
    isPrimary: z.boolean(),
    department: z.string(),
  })).optional(),
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
