import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "@shared/schema";

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  department: string;
  skills: string[];
  profileImage?: string;
  jobTitle?: string;
  employeeId?: string;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  employmentDetails?: {
    hireDate: Date;
    employmentType: "full-time" | "part-time" | "contract";
    salary?: number;
    reportsTo?: string;
  };
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },
    password: { 
      type: String, 
      required: true 
    },
    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      required: true 
    },
    phone: { 
      type: String,
      trim: true
    },
    department: { 
      type: String, 
      required: true,
      default: "General"
    },
    skills: [{ 
      type: String,
      trim: true 
    }],
    profileImage: { 
      type: String 
    },
    jobTitle: { 
      type: String,
      trim: true 
    },
    employeeId: { 
      type: String,
      unique: true,
      sparse: true
    },
    dateOfBirth: { 
      type: Date 
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true }
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true }
    },
    employmentDetails: {
      hireDate: { type: Date },
      employmentType: { 
        type: String, 
        enum: ["full-time", "part-time", "contract"] 
      },
      salary: { type: Number },
      reportsTo: { type: String }
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    lastLoginAt: { 
      type: Date 
    }
  },
  { timestamps: true }
);

// Generate employee ID before saving
userSchema.pre('save', function(next) {
  if (this.role === UserRole.EMPLOYEE && !this.employeeId) {
    this.employeeId = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
  next();
});

export const UserModel = mongoose.model<IUser>("User", userSchema);
