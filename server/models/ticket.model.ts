import mongoose, { Schema, Document } from "mongoose";
import { TicketStatus, TicketPriority, TicketCategory } from "@shared/schema";

// Interface for assigned employee details
export interface IAssignedEmployee {
  employeeId: string;
  employeeName: string;
  assignedAt: Date;
  isPrimary: boolean;
  department: string;
}

export interface ITicket extends Document {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  department: string; // Added department field
  status: TicketStatus;
  clientId: string;
  clientName?: string;
  companyCode?: string;
  // Single assignment (backward compatibility)
  assignedTo?: string;
  assignedToName?: string;
  
  // Multiple assignment support
  assignedEmployees?: IAssignedEmployee[];
  
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // Virtual fields for convenience
  assignedEmployeeIds: string[];
  assignedEmployeeNames: string[];
  primaryAssignee?: IAssignedEmployee;
}

const assignedEmployeeSchema = new Schema<IAssignedEmployee>({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
  department: { type: String, required: true }
});

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    title: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200 
    },
    description: { 
      type: String, 
      required: true,
      trim: true 
    },
    priority: { 
      type: String, 
      enum: Object.values(TicketPriority), 
      required: true,
      index: true 
    },
    category: { 
      type: String, 
      enum: Object.values(TicketCategory), 
      required: true,
      index: true 
    },
    department: {
      type: String,
      required: true,
      default: "General",
      index: true
    },
    status: { 
      type: String, 
      enum: Object.values(TicketStatus), 
      required: true,
      default: TicketStatus.OPEN,
      index: true 
    },
    clientId: { 
      type: String, 
      required: true,
      index: true 
    },
    clientName: { 
      type: String,
      trim: true 
    },
    companyCode: { 
      type: String,
      index: true 
    },
    // Single assignment (for backward compatibility)
    assignedTo: { 
      type: String,
      index: true 
    },
    assignedToName: { 
      type: String,
      trim: true 
    },
    
    // Multiple assignment support
    assignedEmployees: [assignedEmployeeSchema],
    
    attachments: [{ 
      type: String 
    }],
    resolvedAt: { 
      type: Date 
    },
    closedAt: { 
      type: Date 
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for assigned employee IDs
ticketSchema.virtual('assignedEmployeeIds').get(function(this: ITicket) {
  if (this.assignedEmployees && this.assignedEmployees.length > 0) {
    return this.assignedEmployees.map(emp => emp.employeeId);
  }
  return this.assignedTo ? [this.assignedTo] : [];
});

// Virtual for assigned employee names
ticketSchema.virtual('assignedEmployeeNames').get(function(this: ITicket) {
  if (this.assignedEmployees && this.assignedEmployees.length > 0) {
    return this.assignedEmployees.map(emp => emp.employeeName);
  }
  return this.assignedToName ? [this.assignedToName] : [];
});

// Virtual for primary assignee
ticketSchema.virtual('primaryAssignee').get(function(this: ITicket) {
  if (this.assignedEmployees && this.assignedEmployees.length > 0) {
    return this.assignedEmployees.find(emp => emp.isPrimary) || this.assignedEmployees[0];
  }
  return this.assignedTo ? {
    employeeId: this.assignedTo,
    employeeName: this.assignedToName || 'Unknown',
    assignedAt: this.createdAt,
    isPrimary: true,
    department: this.department
  } : undefined;
});

// Indexes for better query performance
ticketSchema.index({ status: 1, priority: -1 }); // For dashboard queries
ticketSchema.index({ department: 1, status: 1 }); // For department-based queries
ticketSchema.index({ clientId: 1, createdAt: -1 }); // For client ticket history
ticketSchema.index({ "assignedEmployees.employeeId": 1 }); // For employee assignment queries
ticketSchema.index({ createdAt: -1 }); // For recent tickets

// Middleware to sync single assignment with multiple assignment
ticketSchema.pre('save', function(next) {
  // If assignedTo is set but no assignedEmployees, create one
  if (this.assignedTo && (!this.assignedEmployees || this.assignedEmployees.length === 0)) {
    this.assignedEmployees = [{
      employeeId: this.assignedTo,
      employeeName: this.assignedToName || 'Unknown',
      assignedAt: new Date(),
      isPrimary: true,
      department: this.department
    }];
  }
  
  // If assignedEmployees exists but no assignedTo, set the primary as assignedTo
  if (this.assignedEmployees && this.assignedEmployees.length > 0 && !this.assignedTo) {
    const primary = this.assignedEmployees.find(emp => emp.isPrimary) || this.assignedEmployees[0];
    this.assignedTo = primary.employeeId;
    this.assignedToName = primary.employeeName;
  }
  
  // Set resolvedAt when status changes to RESOLVED
  if (this.isModified('status') && this.status === TicketStatus.RESOLVED && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  
  // Set closedAt when status changes to CLOSED
  if (this.isModified('status') && this.status === TicketStatus.CLOSED && !this.closedAt) {
    this.closedAt = new Date();
  }
  
  next();
});

// Static method to find tickets by employee
ticketSchema.statics.findByEmployeeId = function(employeeId: string) {
  return this.find({
    $or: [
      { assignedTo: employeeId },
      { "assignedEmployees.employeeId": employeeId }
    ]
  });
};

// Static method to get department statistics
ticketSchema.statics.getDepartmentStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: "$department",
        totalTickets: { $sum: 1 },
        openTickets: { 
          $sum: { 
            $cond: [{ $eq: ["$status", TicketStatus.OPEN] }, 1, 0] 
          } 
        },
        inProgressTickets: { 
          $sum: { 
            $cond: [{ $eq: ["$status", TicketStatus.IN_PROGRESS] }, 1, 0] 
          } 
        },
        resolvedTickets: { 
          $sum: { 
            $cond: [{ $eq: ["$status", TicketStatus.RESOLVED] }, 1, 0] 
          } 
        }
      }
    },
    { $sort: { totalTickets: -1 } }
  ]);
};

// Instance method to add an employee assignment
ticketSchema.methods.addEmployeeAssignment = function(
  employeeId: string, 
  employeeName: string, 
  department: string, 
  isPrimary: boolean = false
) {
  if (!this.assignedEmployees) {
    this.assignedEmployees = [];
  }
  
  // Check if employee is already assigned
  const existingAssignment = this.assignedEmployees.find(
    emp => emp.employeeId === employeeId
  );
  
  if (existingAssignment) {
    throw new Error('Employee already assigned to this ticket');
  }
  
  this.assignedEmployees.push({
    employeeId,
    employeeName,
    department,
    assignedAt: new Date(),
    isPrimary
  });
  
  // If this is the first assignment or it's primary, update single assignment fields
  if (isPrimary || this.assignedEmployees.length === 1) {
    this.assignedTo = employeeId;
    this.assignedToName = employeeName;
    
    // Update other assignments to not be primary
    this.assignedEmployees.forEach(emp => {
      if (emp.employeeId !== employeeId) {
        emp.isPrimary = false;
      }
    });
  }
  
  // Update status if this is the first assignment
  if (this.assignedEmployees.length === 1) {
    this.status = TicketStatus.IN_PROGRESS;
  }
};

// Instance method to remove an employee assignment
ticketSchema.methods.removeEmployeeAssignment = function(employeeId: string) {
  if (!this.assignedEmployees) {
    throw new Error('No employees assigned to this ticket');
  }
  
  const assignmentIndex = this.assignedEmployees.findIndex(
    emp => emp.employeeId === employeeId
  );
  
  if (assignmentIndex === -1) {
    throw new Error('Employee not assigned to this ticket');
  }
  
  const removedEmployee = this.assignedEmployees[assignmentIndex];
  this.assignedEmployees.splice(assignmentIndex, 1);
  
  // Update single assignment fields if removed employee was the primary
  if (removedEmployee.isPrimary && this.assignedEmployees.length > 0) {
    const newPrimary = this.assignedEmployees[0];
    this.assignedTo = newPrimary.employeeId;
    this.assignedToName = newPrimary.employeeName;
    newPrimary.isPrimary = true;
  } else if (this.assignedEmployees.length === 0) {
    // No employees left, reset single assignment and status
    this.assignedTo = undefined;
    this.assignedToName = undefined;
    this.status = TicketStatus.OPEN;
  }
};

export const TicketModel = mongoose.model<ITicket>("Ticket", ticketSchema);
