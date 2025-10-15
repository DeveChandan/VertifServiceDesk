import mongoose, { Schema, Document } from "mongoose";
import { TicketStatus, TicketPriority, TicketCategory } from "@shared/schema";

export interface ITicket extends Document {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  status: TicketStatus;
  clientId: string;
  clientName?: string;
  assignedTo?: string;
  assignedToName?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: Object.values(TicketPriority), required: true },
    category: { type: String, enum: Object.values(TicketCategory), required: true },
    status: { type: String, enum: Object.values(TicketStatus), required: true },
    clientId: { type: String, required: true },
    clientName: { type: String },
    assignedTo: { type: String },
    assignedToName: { type: String },
    attachments: [{ type: String }],
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

export const TicketModel = mongoose.model<ITicket>("Ticket", ticketSchema);
