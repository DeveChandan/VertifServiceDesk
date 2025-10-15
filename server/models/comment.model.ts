import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "@shared/schema";

export interface IComment extends Document {
  _id: string;
  ticketId: string;
  userId: string;
  userName?: string;
  userRole?: UserRole;
  content: string;
  createdAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    ticketId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String },
    userRole: { type: String, enum: Object.values(UserRole) },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const CommentModel = mongoose.model<IComment>("Comment", commentSchema);
