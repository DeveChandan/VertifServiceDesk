import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "@shared/schema";

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  department?: string;
  skills?: string[];
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    phone: { type: String },
    department: { type: String },
    skills: [{ type: String }],
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>("User", userSchema);
