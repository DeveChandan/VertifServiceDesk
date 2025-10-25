import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "@shared/schema";

export interface IComment extends Document {
  _id: string;
  ticketId: string;
  userId: string;
  userName?: string;
  userRole?: UserRole;
  content: string;
  attachments: string[]; // Add this line
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    ticketId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String },
    userRole: { type: String, enum: Object.values(UserRole) },
    content: { type: String, required: true },
    attachments: { 
      type: [String], // Array of strings
      default: [] // Default empty array
    }
  },
  { timestamps: true }
);

export const CommentModel = mongoose.model<IComment>("Comment", commentSchema);
