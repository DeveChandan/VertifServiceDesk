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
  // Client-specific fields
  company?: string;
  industry?: string;
  clientType?: "individual" | "business" | "enterprise";
  clientId?: string;
  contactPerson?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  clientDetails?: {
    since: Date;
    contractValue?: number;
    paymentTerms?: string;
    accountManager?: string;
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
      unique: true, // This creates an index automatically
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
      unique: true, // This creates an index automatically
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
      reportsTo: { type: String, trim: true }
    },
    // Client-specific fields
    company: { 
      type: String,
      trim: true
    },
    industry: { 
      type: String,
      trim: true
    },
    clientType: { 
      type: String, 
      enum: ["individual", "business", "enterprise"],
      default: "individual"
    },
    clientId: { 
      type: String,
      unique: true, // This creates an index automatically
      sparse: true
    },
    contactPerson: { 
      type: String,
      trim: true
    },
    billingAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true }
    },
    shippingAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true }
    },
    clientDetails: {
      since: { type: Date },
      contractValue: { type: Number },
      paymentTerms: { type: String, trim: true },
      accountManager: { type: String, trim: true }
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    lastLoginAt: { 
      type: Date 
    }
  },
  { 
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password;
        return ret;
      }
    }
  }
);

// Generate employee ID or client ID before saving
userSchema.pre('save', function(next) {
  // Generate employee ID for employees
  if (this.role === UserRole.EMPLOYEE && !this.employeeId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.employeeId = `EMP-${timestamp}-${random}`;
  }
  
  // Generate client ID for clients
  if (this.role === UserRole.CLIENT && !this.clientId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.clientId = `CLI-${timestamp}-${random}`;
  }

  // Set appropriate department based on role if not provided
  if (!this.department) {
    if (this.role === UserRole.CLIENT) {
      this.department = "Clients";
    } else if (this.role === UserRole.EMPLOYEE) {
      this.department = "General";
    } else if (this.role === UserRole.ADMIN) {
      this.department = "Administration";
    }
  }
  
  next();
});

// Only define indexes for fields that don't have 'unique: true'
// Remove the duplicate index definitions for email, employeeId, and clientId
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ department: 1 });
userSchema.index({ "employmentDetails.hireDate": 1 });
userSchema.index({ "clientDetails.since": 1 });

// Compound indexes for better query performance
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ department: 1, isActive: 1 });
userSchema.index({ "employmentDetails.employmentType": 1, isActive: 1 });
userSchema.index({ clientType: 1, isActive: 1 });

// Static method to find employees
userSchema.statics.findEmployees = function() {
  return this.find({ role: UserRole.EMPLOYEE });
};

// Static method to find clients
userSchema.statics.findClients = function() {
  return this.find({ role: UserRole.CLIENT });
};

// Static method to find active users
userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

// Static method to find by email
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Instance method to get user profile (without sensitive data)
userSchema.methods.getProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  if (this.address) {
    const { street, city, state, zipCode, country } = this.address;
    const parts = [street, city, state, zipCode, country].filter(part => part && part.trim());
    return parts.join(', ').trim();
  }
  return '';
});

// Virtual for full billing address
userSchema.virtual('fullBillingAddress').get(function() {
  if (this.billingAddress) {
    const { street, city, state, zipCode, country } = this.billingAddress;
    const parts = [street, city, state, zipCode, country].filter(part => part && part.trim());
    return parts.join(', ').trim();
  }
  return '';
});

// Virtual for full shipping address
userSchema.virtual('fullShippingAddress').get(function() {
  if (this.shippingAddress) {
    const { street, city, state, zipCode, country } = this.shippingAddress;
    const parts = [street, city, state, zipCode, country].filter(part => part && part.trim());
    return parts.join(', ').trim();
  }
  return '';
});

// Virtual for age (if dateOfBirth is provided)
userSchema.virtual('age').get(function() {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  return null;
});

// Virtual for tenure (if employmentDetails.hireDate is provided)
userSchema.virtual('tenure').get(function() {
  if (this.employmentDetails?.hireDate) {
    const today = new Date();
    const hireDate = new Date(this.employmentDetails.hireDate);
    const years = today.getFullYear() - hireDate.getFullYear();
    const months = today.getMonth() - hireDate.getMonth();
    
    let totalMonths = years * 12 + months;
    if (today.getDate() < hireDate.getDate()) {
      totalMonths--;
    }
    
    const tenureYears = Math.floor(totalMonths / 12);
    const tenureMonths = totalMonths % 12;
    
    if (tenureYears === 0) {
      return `${tenureMonths} month${tenureMonths !== 1 ? 's' : ''}`;
    } else if (tenureMonths === 0) {
      return `${tenureYears} year${tenureYears !== 1 ? 's' : ''}`;
    } else {
      return `${tenureYears} year${tenureYears !== 1 ? 's' : ''} ${tenureMonths} month${tenureMonths !== 1 ? 's' : ''}`;
    }
  }
  return null;
});

// Virtual for client relationship duration (if clientDetails.since is provided)
userSchema.virtual('clientSinceDuration').get(function() {
  if (this.clientDetails?.since) {
    const today = new Date();
    const sinceDate = new Date(this.clientDetails.since);
    const years = today.getFullYear() - sinceDate.getFullYear();
    const months = today.getMonth() - sinceDate.getMonth();
    
    let totalMonths = years * 12 + months;
    if (today.getDate() < sinceDate.getDate()) {
      totalMonths--;
    }
    
    const durationYears = Math.floor(totalMonths / 12);
    const durationMonths = totalMonths % 12;
    
    if (durationYears === 0) {
      return `${durationMonths} month${durationMonths !== 1 ? 's' : ''}`;
    } else if (durationMonths === 0) {
      return `${durationYears} year${durationYears !== 1 ? 's' : ''}`;
    } else {
      return `${durationYears} year${durationYears !== 1 ? 's' : ''} ${durationMonths} month${durationMonths !== 1 ? 's' : ''}`;
    }
  }
  return null;
});

export const UserModel = mongoose.model<IUser>("User", userSchema);
