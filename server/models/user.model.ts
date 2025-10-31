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
  
  // ✅ Company code only for clients and client users (multi-tenant)
  companyCode?: string;
  
  // ✅ For ClientUsers: reference to the client who created them
  createdByClient?: string;
  
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
  
  // Password reset fields
  resetToken?: string;
  resetTokenExpiry?: Date;
  lastPasswordChange?: Date;
  
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
  
  // Client User specific fields
  clientUserDetails?: {
    permissions: string[];
    accessLevel: "basic" | "standard" | "admin";
    isPrimaryContact?: boolean;
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
      sparse: true
    },
    
    // ✅ COMPANY CODE ONLY FOR CLIENTS AND CLIENT USERS
    companyCode: {
      type: String,
      index: true,
      sparse: true // Allows null values for non-client roles
    },
    
    // ✅ CLIENT USER CREATOR REFERENCE
    createdByClient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    
    // Password reset fields
    resetToken: { 
      type: String 
    },
    resetTokenExpiry: { 
      type: Date 
    },
    lastPasswordChange: { 
      type: Date 
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
    
    // CLIENT USER SPECIFIC FIELDS
    clientUserDetails: {
      permissions: [{ type: String }],
      accessLevel: {
        type: String,
        enum: ["basic", "standard", "admin"],
        default: "basic"
      },
      isPrimaryContact: {
        type: Boolean,
        default: false
      }
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
        delete (ret as any).password;
        delete (ret as any).resetToken;
        return ret;
      }
    }
  }
);

// ✅ Compound unique indexes for multi-tenancy (only for client roles)
userSchema.index({ email: 1, companyCode: 1 }, { 
  unique: true, 
  sparse: true, // Only applies when companyCode exists
  partialFilterExpression: { companyCode: { $exists: true } }
});

userSchema.index({ employeeId: 1, companyCode: 1 }, { 
  unique: true, 
  sparse: true 
});

userSchema.index({ clientId: 1, companyCode: 1 }, { unique: true, partialFilterExpression: { clientId: { $exists: true } } });

// ✅ Generate IDs based on role
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

  // Generate client user ID for client_users
  if (this.role === UserRole.CLIENT_USER && !this.employeeId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.employeeId = `CU-${timestamp}-${random}`;
  }

  if (this.role === UserRole.CLIENT_USER && !this.clientId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.clientId = `DUMMY-${timestamp}-${random}`;
  }

  // Set appropriate department based on role if not provided
  if (!this.department) {
    if (this.role === UserRole.CLIENT || this.role === UserRole.CLIENT_USER) {
      this.department = "Clients";
    } else if (this.role === UserRole.EMPLOYEE) {
      this.department = "General";
    } else if (this.role === UserRole.ADMIN) {
      this.department = "Administration";
    }
  }
  
  // Validate company code requirements
  if ((this.role === UserRole.CLIENT || this.role === UserRole.CLIENT_USER) && !this.companyCode) {
    return next(new Error('companyCode is required for client and client_user roles'));
  }
  
  // For ClientUsers, validate createdByClient
  if (this.role === UserRole.CLIENT_USER && !this.createdByClient) {
    return next(new Error('createdByClient is required for client_user role'));
  }
  
  // For non-client roles, ensure companyCode is not set
  if ((this.role === UserRole.ADMIN || this.role === UserRole.EMPLOYEE) && this.companyCode) {
    this.companyCode = undefined;
  }
  
  next();
});

// ✅ Indexes for better query performance
userSchema.index({ resetToken: 1 });
userSchema.index({ resetTokenExpiry: 1 });
userSchema.index({ isActive: 1, resetTokenExpiry: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ department: 1 });
userSchema.index({ "employmentDetails.hireDate": 1 });
userSchema.index({ "clientDetails.since": 1 });
userSchema.index({ "clientUserDetails.accessLevel": 1 });

// ✅ Compound indexes for multi-tenant queries (only for client roles)
userSchema.index({ companyCode: 1, role: 1 }, { sparse: true });
userSchema.index({ companyCode: 1, isActive: 1 }, { sparse: true });
userSchema.index({ companyCode: 1, department: 1 }, { sparse: true });
userSchema.index({ companyCode: 1, role: 1, isActive: 1 }, { sparse: true });
userSchema.index({ companyCode: 1, email: 1 }, { sparse: true });
userSchema.index({ companyCode: 1, createdByClient: 1 }, { sparse: true });

// ✅ Enhanced static methods with role-based company code handling
userSchema.statics.findByResetToken = function(token: string, companyCode?: string) {
  const query: any = { 
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
    isActive: true 
  };
  
  if (companyCode) {
    query.companyCode = companyCode;
  }
  
  return this.findOne(query);
};

// ✅ Find users with company code awareness
userSchema.statics.findEmployees = function(companyCode?: string) {
  const query: any = { role: UserRole.EMPLOYEE };
  // Employees don't have companyCode, so we exclude if companyCode is provided
  if (companyCode) {
    query.companyCode = { $exists: false };
  }
  return this.find(query);
};

userSchema.statics.findClients = function(companyCode?: string) {
  const query: any = { role: UserRole.CLIENT };
  if (companyCode) {
    query.companyCode = companyCode;
  }
  return this.find(query);
};

userSchema.statics.findClientUsers = function(companyCode: string, createdByClient?: string) {
  const query: any = { 
    role: UserRole.CLIENT_USER, 
    companyCode: companyCode 
  };
  
  if (createdByClient) {
    query.createdByClient = createdByClient;
  }
  
  return this.find(query);
};

userSchema.statics.findActiveUsers = function(companyCode?: string) {
  const query: any = { isActive: true };
  
  if (companyCode) {
    // For clients, filter by companyCode
    query.$or = [
      { role: UserRole.CLIENT, companyCode },
      { role: UserRole.CLIENT_USER, companyCode }
    ];
  } else {
    // For admin, get all active users (including those without companyCode)
    query.companyCode = { $exists: false };
  }
  
  return this.find(query);
};

userSchema.statics.findByEmail = function(email: string, companyCode?: string) {
  const query: any = { email: email.toLowerCase() };
  
  if (companyCode) {
    query.companyCode = companyCode;
  } else {
    // When no companyCode provided, look for admin/employee users
    query.companyCode = { $exists: false };
  }
  
  return this.findOne(query);
};

userSchema.statics.findByCompany = function(companyCode: string, filters = {}) {
  return this.find({ 
    companyCode: companyCode,
    ...filters 
  });
};

userSchema.statics.isEmailExistsInCompany = function(email: string, companyCode?: string) {
  const query: any = { email: email.toLowerCase() };
  
  if (companyCode) {
    query.companyCode = companyCode;
  } else {
    query.companyCode = { $exists: false };
  }
  
  return this.findOne(query).select('_id');
};

userSchema.statics.findByClientCreator = function(_id: string, companyCode: string) {
  return this.find({ 
    createdByClient: _id,
    companyCode: companyCode,
    role: UserRole.CLIENT_USER
  });
};

// ✅ Enhanced instance methods
userSchema.methods.getProfile = function() {
  const userObject = this.toObject();
  delete (userObject as any).password;
  delete (userObject as any).resetToken;
  delete (userObject as any).resetTokenExpiry;
  return userObject;
};

userSchema.methods.setResetToken = function() {
  const crypto = require('crypto');
  this.resetToken = crypto.randomBytes(32).toString('hex');
  this.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  return this.save();
};

userSchema.methods.clearResetToken = function() {
  this.resetToken = undefined;
  this.resetTokenExpiry = undefined;
  this.lastPasswordChange = new Date();
  return this.save();
};

// ✅ Enhanced permission checking
userSchema.methods.belongsToCompany = function(companyCode: string) {
  // Admin and employees don't belong to any company
  if (this.role === UserRole.ADMIN || this.role === UserRole.EMPLOYEE) {
    return false;
  }
  return this.companyCode === companyCode;
};

userSchema.methods.canManageUser = function(targetUser: IUser) {
  // Admin can manage all users (including those without companyCode)
  if (this.role === UserRole.ADMIN) {
    return true;
  }
  
  // Client can manage their own client users
  if (this.role === UserRole.CLIENT) {
    return targetUser.role === UserRole.CLIENT_USER &&
           targetUser.companyCode === this.companyCode &&
           targetUser.createdByClient?.toString() === this._id.toString();
  }
  
  // Employees and client users cannot manage other users
  return false;
};

userSchema.methods.canCreateUsers = function() {
  return this.role === UserRole.ADMIN || this.role === UserRole.CLIENT;
};

userSchema.methods.getAllowedRolesToCreate = function() {
  if (this.role === UserRole.ADMIN) {
    return [UserRole.EMPLOYEE, UserRole.CLIENT];
  }
  if (this.role === UserRole.CLIENT) {
    return [UserRole.CLIENT_USER];
  }
  return [];
};

// ✅ Enhanced authentication helper
userSchema.statics.authenticateUser = async function(email: string, password: string) {
  const user = await this.findOne({ email: email.toLowerCase(), isActive: true });
  
  if (!user) {
    return null;
  }
  
  const bcrypt = require('bcrypt');
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    return null;
  }
  
  // Update last login
  user.lastLoginAt = new Date();
  await user.save();
  
  return user;
};

// Virtuals remain the same
userSchema.virtual('fullAddress').get(function() {
  if (this.address) {
    const { street, city, state, zipCode, country } = this.address;
    const parts = [street, city, state, zipCode, country].filter(part => part && part.trim());
    return parts.join(', ').trim();
  }
  return '';
});

userSchema.virtual('fullBillingAddress').get(function() {
  if (this.billingAddress) {
    const { street, city, state, zipCode, country } = this.billingAddress;
    const parts = [street, city, state, zipCode, country].filter(part => part && part.trim());
    return parts.join(', ').trim();
  }
  return '';
});

userSchema.virtual('fullShippingAddress').get(function() {
  if (this.shippingAddress) {
    const { street, city, state, zipCode, country } = this.shippingAddress;
    const parts = [street, city, state, zipCode, country].filter(part => part && part.trim());
    return parts.join(', ').trim();
  }
  return '';
});

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
