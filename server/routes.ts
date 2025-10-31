import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import { UserModel } from "./models/user.model";
import { TicketModel } from "./models/ticket.model";
import { CommentModel } from "./models/comment.model";
import { authenticateToken, authorizeRoles, generateToken, AuthRequest } from "./middleware/auth";
import { UserRole, TicketStatus, TicketPriority } from "@shared/schema";
import { vertifitEmailService } from './email';
import { connectDB } from "./db";
//new add upload logic
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

export async function registerRoutes(app: Express): Promise<Server> {
  await connectDB();

  // Upload Logic
  // -----------------------------
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const UPLOADS_FOLDER = process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

  // Ensure uploads folder exists
  if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

  const upload = multer({ storage });

  // Prefix upload routes with /api/upload
  const uploadBasePath = "/api/upload";

  // POST: Upload single file
  app.post(`${uploadBasePath}`, upload.single("file"), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      message: "File uploaded successfully",
      fileUrl,
    });
  });

  // GET: List all uploaded files
  app.get(`${uploadBasePath}`, (req: Request, res: Response) => {
    fs.readdir(UPLOADS_FOLDER, (err, files) => {
      if (err) return res.status(500).json({ error: "Unable to read uploads folder" });

      const fileUrls = files.map(file => `/uploads/${file}`);
      res.json(fileUrls);
    });
  });

  // Serve uploads folder statically
  app.use("/uploads", express.static(UPLOADS_FOLDER));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      phone, 
      department, 
      skills,
      jobTitle,
      dateOfBirth,
      address,
      emergencyContact,
      companyCode
    } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role: role || UserRole.CLIENT,
      phone,
      department: department || "General",
      skills: skills || [],
      jobTitle,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
      emergencyContact,
      isActive: true,
      companyCode
    });

    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      companyCode: user.companyCode
    });

    const userResponse = getUserResponse(user);

    res.json({ user: userResponse, token });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      companyCode: user.companyCode,
    });

    const userResponse = getUserResponse(user);

    res.json({ user: userResponse, token });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserModel.findOne({ email, isActive: true });
    
    // Always return success to prevent email enumeration
    const responseMessage = "If an account with that email exists, a password reset link has been sent";

    if (!user) {
      return res.json({ message: responseMessage });
    }

    // Generate secure reset token
    let resetToken;
    try {
      resetToken = crypto.randomBytes(32).toString('hex');
    } catch (cryptoError) {
      // Fallback if crypto fails
      resetToken = Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
    }

    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    console.log('Generated reset token:', resetToken);
    console.log('Token expiry:', resetTokenExpiry);

    // FIX: Use findByIdAndUpdate to ensure the token is saved properly
    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      {
        resetToken: resetToken,
        resetTokenExpiry: resetTokenExpiry
      },
      { new: true } // Return the updated document
    );

    // Verify the token was saved
    if (updatedUser) {
      console.log('Token saved to user:', updatedUser.resetToken);
      console.log('Expiry saved:', updatedUser.resetTokenExpiry);
    } else {
      console.error('Failed to update user with reset token');
    }

    const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

    console.log(`Password reset link for ${user.email}: ${resetUrl}`);

    // Send email (if email service is configured)
    try {
      if (vertifitEmailService && typeof vertifitEmailService.sendEmail === 'function') {
        await vertifitEmailService.sendEmail({
          to: user.email,
          subject: "🔐 Reset Your Password - Vertifit Service Desk",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset Request</h2>
              <p>Hello ${user.name},</p>
              <p>Click the link below to reset your password:</p>
              <a href="${resetUrl}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
              <p><small>This link expires in 1 hour.</small></p>
              <p><small>If you didn't request this, please ignore this email.</small></p>
            </div>
          `,
          text: `Reset your password: ${resetUrl}`
        });
        console.log(`Reset email sent to ${user.email}`);
      } else {
        console.log('EMAIL SERVICE NOT AVAILABLE - Reset URL:', resetUrl);
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ message: responseMessage });
    
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process password reset request" });
  }
});
// Reset Password - Validate token and set new password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    console.log('Reset password request received. Token:', token ? 'Present' : 'Missing');
    console.log('New password length:', newPassword?.length);

    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: "Reset token and new password are required" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters long" 
      });
    }

    // Debug: Check what tokens exist in the database
    const currentTime = new Date();
    console.log('Current time:', currentTime);
    
    // Find user with valid reset token
    const user = await UserModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: currentTime },
      isActive: true
    });

    console.log('User found with valid token:', user ? 'Yes' : 'No');
    
    if (user) {
      console.log('User details:', {
        name: user.name,
        email: user.email,
        resetToken: user.resetToken,
        resetTokenExpiry: user.resetTokenExpiry
      });
    } else {
      // Debug: Check if token exists but expired
      const expiredUser = await UserModel.findOne({
        resetToken: token,
        isActive: true
      });
      
      if (expiredUser) {
        console.log('Token exists but expired. Expiry:', expiredUser.resetTokenExpiry);
        console.log('Current time:', currentTime);
        console.log('Is expired?', expiredUser.resetTokenExpiry < currentTime);
      } else {
        console.log('No user found with this token at all');
        
        // Debug: List all users with reset tokens
        const usersWithTokens = await UserModel.find({
          resetToken: { $exists: true, $ne: null }
        }, 'email resetToken resetTokenExpiry');
        
        console.log('All users with reset tokens:', usersWithTokens);
      }
    }

    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired reset token. Please request a new password reset." 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token using findByIdAndUpdate
    await UserModel.findByIdAndUpdate(
      user._id,
      {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        lastPasswordChange: new Date()
      }
    );

    console.log('Password successfully reset for user:', user.email);

    // Send confirmation email
    try {
      if (vertifitEmailService && typeof vertifitEmailService.sendEmail === 'function') {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
            <div style="background: linear-gradient(135deg, #38a169 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">✅ Password Updated Successfully</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #2d3748; margin-bottom: 20px;">Hello ${user.name},</h2>
              
              <div style="background: #f0fff4; padding: 20px; border-radius: 8px; border-left: 4px solid #38a169; margin-bottom: 20px;">
                <p style="color: #2d3748; margin: 0;">
                  <strong>Your password has been successfully updated.</strong><br>
                  You can now log in to your Vertifit Service Desk account with your new password.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL || 'http://localhost:5000'}/login" 
                   style="background: #38a169; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                  🚀 Log In Now
                </a>
              </div>

              <div style="background: #fed7d7; padding: 15px; border-radius: 6px; border-left: 4px solid #e53e3e;">
                <p style="color: #744210; margin: 0; font-size: 14px;">
                  <strong>Security Tip:</strong> If you didn't make this change, please contact support immediately.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #718096; font-size: 12px;">
              <p>This is an automated message from Vertifit Service Desk</p>
            </div>
          </div>
        `;

        await vertifitEmailService.sendEmail({
          to: user.email,
          subject: "✅ Your Vertifit Service Desk Password Has Been Updated",
          html: emailHtml,
          text: "Your password has been successfully updated. You can now log in with your new password."
        });
        console.log('Confirmation email sent to:', user.email);
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the reset if email fails
    }

    res.json({ 
      message: "Password has been reset successfully. You can now log in with your new password." 
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});
// Get current user profile
app.get("/api/users/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await UserModel.findById(req.user!._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(getUserResponse(user));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update current user profile
app.patch("/api/users/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      phone,
      department,
      skills,
      jobTitle,
      dateOfBirth,
      address,
      emergencyContact
    } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (department) updates.department = department;
    if (skills) updates.skills = skills;
    if (jobTitle) updates.jobTitle = jobTitle;
    if (dateOfBirth) updates.dateOfBirth = new Date(dateOfBirth);
    if (address) updates.address = address;
    if (emergencyContact) updates.emergencyContact = emergencyContact;

    const user = await UserModel.findByIdAndUpdate(
      req.user!._id,
      updates,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(getUserResponse(user));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Change password
app.patch("/api/users/me/change-password", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await UserModel.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Upload profile image
app.patch("/api/users/me/profile-image", authenticateToken, upload.single("profileImage"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const profileImageUrl = `/uploads/${req.file.filename}`;
    
    const user = await UserModel.findByIdAndUpdate(
      req.user!._id,
      { profileImage: profileImageUrl },
      { new: true }
    ).select("-password");

    res.json(getUserResponse(user));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/users/employees", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const employees = await UserModel.find({ 
      role: UserRole.EMPLOYEE,
      isActive: true 
    }).select("-password").sort({ createdAt: -1 });
    res.json(employees.map(getUserResponse));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/users/clients", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const clients = await UserModel.find({ role: UserRole.CLIENT })
      .select("-password")
      .lean();
    
    // Transform the data to ensure all client fields are included
    const clientsWithAllFields = clients.map(client => ({
      ...client,
      company: client.company || null,
      industry: client.industry || null,
      clientType: client.clientType || "individual",
      clientId: client.clientId || null,
      contactPerson: client.contactPerson || null,
      billingAddress: client.billingAddress || null,
      shippingAddress: client.shippingAddress || null,
      clientDetails: client.clientDetails || null,
    }));
    
    res.json(clientsWithAllFields);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
// Client User Routes
// ==================

app.post("/api/users/client-user", authenticateToken, authorizeRoles(UserRole.CLIENT), async (req: AuthRequest, res) => {
  try {
    console.log('🔵 POST /api/users/client-user - Request received');
    console.log('📦 Request Headers:', req.headers);
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('👤 Authenticated User:', req.user);

    const {
      name,
      email,
      phone,
      jobTitle,
      clientUserDetails
    } = req.body;

    const currentClient = req.user;

    // Log authentication details
    console.log('🔐 Authentication Check:');
    console.log('  - Current Client:', currentClient);
    console.log('  - Client ID:', currentClient?._id);
    console.log('  - Client Company Code:', currentClient?.companyCode);

    // Ensure the authenticated user is present and has a companyCode
    if (!currentClient) {
      console.log('❌ Unauthorized: No current client found');
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name || !email) {
      console.log('❌ Validation Failed:');
      console.log('  - Name provided:', !!name, name);
      console.log('  - Email provided:', !!email, email);
      return res.status(400).json({ message: "name and email are required" });
    }

    // Ensure current client has a companyCode before querying
    if (!currentClient.companyCode) {
      console.log('❌ Missing companyCode for client:', currentClient._id);
      return res.status(400).json({ message: "Current client does not have a companyCode" });
    }

    console.log('🔍 Checking for existing user with email:', email.toLowerCase());
    
    // Check if email exists in the same company
    const existingUser = await UserModel.findOne({ 
      email: email.toLowerCase(), 
      companyCode: currentClient.companyCode 
    });
    
    console.log('📊 Existing user check result:', existingUser ? 'User exists' : 'No existing user');
    
    if (existingUser) {
      console.log('❌ Email already registered:', email);
      return res.status(400).json({ message: "Email already registered in your company" });
    }

    console.log('🔑 Generating temporary password...');
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role: UserRole.CLIENT_USER,
      phone,
      companyCode: currentClient.companyCode,
      createdByClient: currentClient._id,
      //clientId: currentClient._id, // ← TEMPORARY FIX - add this line
      clientUserDetails: {
        permissions: clientUserDetails?.permissions || ["read_projects", "create_tickets"],
        accessLevel: clientUserDetails?.accessLevel || "basic",
        isPrimaryContact: clientUserDetails?.isPrimaryContact || false
      },
      jobTitle,
      department: "Clients",
      isActive: true
    };

    console.log('💾 Creating user with data:', JSON.stringify(userData, null, 2));

    const user = await UserModel.create(userData);
    console.log('✅ User created successfully:', user._id);

    // Send welcome email to client user
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">Welcome to Vertifit Service Desk</h1>
        </div>
        <div style="background: white; padding: 30px;">
          <h2>Hello ${user.name},</h2>
          <p>Your Client User account has been created by ${currentClient.name}.</p>
          <p>Company: <strong>${user.companyCode}</strong></p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0;">Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Password:</strong> ${temporaryPassword}</p>
            <p><strong>Login URL:</strong> <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
          </div>
          
          <p>Access Level: <strong>${user.clientUserDetails?.accessLevel}</strong></p>
          <p>Please log in and change your password after first login.</p>
        </div>
      </div>
    `;

    console.log('📧 Attempting to send welcome email to:', user.email);
    try {
      await vertifitEmailService.sendEmail({
        to: user.email,
        subject: "Welcome to Vertifit Service Desk - Your Client User Account",
        html: emailHtml,
        text: `Your Client User account has been created. Email: ${user.email}, Password: ${temporaryPassword}, Login: ${process.env.APP_URL}`
      });
      console.log('✅ Welcome email sent successfully');
    } catch (emailError) {
      console.error("❌ Failed to send welcome email:", emailError);
      // Don't fail the request if email fails
    }

    const userResponse = getUserResponse(user);
    console.log('📤 Sending response with user data');
    
    res.status(201).json(userResponse);
  } catch (error: any) {
    console.error("❌ Create client user error:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error details:", {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ message: error.message });
  } finally {
    console.log('🔚 POST /api/users/client-user - Request completed');
  }
});
// Get all client users for current client
app.get("/api/users/client-user", authenticateToken, authorizeRoles(UserRole.CLIENT), async (req: AuthRequest, res) => {
  try {
    console.log('🔵 GET /api/users/client-user - Request received');
    console.log('📦 Request Headers:', req.headers);
    console.log('🔍 Query Parameters:', req.query);
    console.log('👤 Authenticated User:', req.user);

    const currentClient = req.user;
    if (!currentClient) {
      console.log('❌ Unauthorized: No current client found');
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log('🔐 Client Details:', {
      clientId: currentClient._id,
      companyCode: currentClient.companyCode,
      clientName: currentClient.name
    });

    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status, 
      accessLevel, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    console.log('📊 Query Parameters Parsed:', {
      page, limit, search, status, accessLevel, sortBy, sortOrder
    });

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    console.log('📄 Pagination - Skip:', skip, 'Limit:', limit);

    // Build query
    const query: any = {
      companyCode: currentClient.companyCode,
      role: UserRole.CLIENT_USER,
      createdByClient: currentClient._id
    };

    console.log('🔍 Base Query:', query);

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } }
      ];
      console.log('🔍 Search Filter Applied:', query.$or);
    }

    // Status filter
    if (status) {
      query.isActive = status === 'active';
      console.log('🔍 Status Filter:', { status, isActive: query.isActive });
    }

    // Access level filter
    if (accessLevel) {
      query['clientUserDetails.accessLevel'] = accessLevel;
      console.log('🔍 Access Level Filter:', accessLevel);
    }

    console.log('🔍 Final Query:', JSON.stringify(query, null, 2));

    // Get users with pagination
    console.log('📋 Fetching users from database...');
    const users = await UserModel.find(query)
      .select('-password -resetToken -resetTokenExpiry')
      .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    console.log(`✅ Found ${users.length} users`);

    // Get total count for pagination
    console.log('📊 Counting total documents...');
    const totalUsers = await UserModel.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / parseInt(limit as string));

    console.log('📈 Pagination Summary:', {
      totalUsers,
      totalPages,
      currentPage: parseInt(page as string),
      usersReturned: users.length
    });

    const usersWithTicketCounts = await Promise.all(
      users.map(async (user) => {
        const ticketCount = await TicketModel.countDocuments({ createdBy: user._id });
        return {
          ...getUserResponse(user),
          ticketCount,
        };
      })
    );

    const response = {
      users: usersWithTicketCounts,
      pagination: {
        currentPage: parseInt(page as string),
        totalPages,
        totalUsers,
        hasNext: parseInt(page as string) < totalPages,
        hasPrev: parseInt(page as string) > 1,
      },
    };

    console.log('📤 Sending response with users and ticket counts');
    res.json(response);
  } catch (error: any) {
    console.error("❌ Get client users error:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error details:", {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ message: "Failed to fetch client users" });
  } finally {
    console.log('🔚 GET /api/users/client-user - Request completed');
  }
});

// Get client user statistics
app.get("/api/users/client-user/stats", authenticateToken, authorizeRoles(UserRole.CLIENT), async (req: AuthRequest, res) => {
  try {
    const currentClient = req.user!;

    // Get all client users for this client
    const clientUsers = await UserModel.find({
      companyCode: currentClient.companyCode,
      role: UserRole.CLIENT_USER,
      createdByClient: currentClient._id
    });

    // Calculate statistics
    const stats = {
      totalUsers: clientUsers.length,
      activeUsers: clientUsers.filter(user => user.isActive).length,
      inactiveUsers: clientUsers.filter(user => !user.isActive).length,
      usersByAccessLevel: {
        basic: clientUsers.filter(user => user.clientUserDetails?.accessLevel === 'basic').length,
        standard: clientUsers.filter(user => user.clientUserDetails?.accessLevel === 'standard').length,
        admin: clientUsers.filter(user => user.clientUserDetails?.accessLevel === 'admin').length,
      },
      recentUsers: clientUsers.filter(user => 
        user.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length,
      usersWithRecentLogin: clientUsers.filter(user => 
        user.lastLoginAt && user.lastLoginAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    };
console.log('✅ Client user statistics calculated:', stats);
    res.json(stats);
  } catch (error: any) {
    console.error("Get client user stats error:", error);
    res.status(500).json({ message: "Failed to fetch user statistics" });
  }
});

// Get specific client user
app.get("/api/users/client-user/:id", authenticateToken, authorizeRoles(UserRole.CLIENT), async (req: AuthRequest, res) => {
  try {
    const currentClient = req.user!;
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await UserModel.findOne({
      _id: id,
      companyCode: currentClient.companyCode,
      role: UserRole.CLIENT_USER,
      createdByClient: currentClient._id
    }).select('-password -resetToken -resetTokenExpiry');

    if (!user) {
      return res.status(404).json({ message: "Client user not found" });
    }
console.log('✅ Client user found:', user._id,"all" ,user);
    res.json(getUserResponse(user));
  } catch (error: any) {
    console.error("Get client user error:", error);
    res.status(500).json({ message: "Failed to fetch client user" });
  }
});

// Update client user
app.patch("/api/users/client-user/:id", authenticateToken, authorizeRoles(UserRole.CLIENT), async (req: AuthRequest, res) => {
  try {
    const currentClient = req.user;
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated by client
    delete updateData.password;
    delete updateData.role;
    delete updateData.companyCode;
    delete updateData.createdByClient;
    delete updateData.employeeId;

    const user = await UserModel.findOneAndUpdate(
      {
        _id: id,
        companyCode: currentClient.companyCode,
        role: UserRole.CLIENT_USER,
        createdByClient: currentClient._id
      },
      updateData,
      { new: true, runValidators: true }
    ).select('-password -resetToken -resetTokenExpiry');

    if (!user) {
      return res.status(404).json({ message: "Client user not found" });
    }

    res.json({
      ...getUserResponse(user),
      message: "Client user updated successfully"
    });
  } catch (error: any) {
    console.error("Update client user error:", error);
    res.status(500).json({ message: "Failed to update client user" });
  }
});

// Deactivate client user
app.patch("/api/users/client-user/:id/deactivate", authenticateToken, authorizeRoles(UserRole.CLIENT), async (req: AuthRequest, res) => {
  try {
    const currentClient = req.user;
    const { id } = req.params;

    const user = await UserModel.findOneAndUpdate(
      {
        _id: id,
        companyCode: currentClient.companyCode,
        role: UserRole.CLIENT_USER,
        createdByClient: currentClient._id
      },
      { isActive: false },
      { new: true }
    ).select('-password -resetToken -resetTokenExpiry');

    if (!user) {
      return res.status(404).json({ message: "Client user not found" });
    }

    res.json({
      ...getUserResponse(user),
      message: "Client user deactivated successfully"
    });
  } catch (error: any) {
    console.error("Deactivate client user error:", error);
    res.status(500).json({ message: "Failed to deactivate client user" });
  }
});

// Reactivate client user
app.patch("/api/users/client-user/:id/reactivate", authenticateToken, authorizeRoles(UserRole.CLIENT), async (req: AuthRequest, res) => {
  try {
    const currentClient = req.user;
    const { id } = req.params;

    const user = await UserModel.findOneAndUpdate(
      {
        _id: id,
        companyCode: currentClient.companyCode,
        role: UserRole.CLIENT_USER,
        createdByClient: currentClient._id
      },
      { isActive: true },
      { new: true }
    ).select('-password -resetToken -resetTokenExpiry');

    if (!user) {
      return res.status(404).json({ message: "Client user not found" });
    }

    res.json({
      ...getUserResponse(user),
      message: "Client user reactivated successfully"
    });
  } catch (error: any) {
    console.error("Reactivate client user error:", error);
    res.status(500).json({ message: "Failed to reactivate client user" });
  }
});

// Client Dashboard Statistics
app.get("/api/client/dashboard/stats", authenticateToken, authorizeRoles(UserRole.CLIENT), async (req: AuthRequest, res) => {
  try {
    const currentClient = req.user;

    // Get client users count
    const clientUsers = await UserModel.find({
      companyCode: currentClient.companyCode,
      role: UserRole.CLIENT_USER,
      createdByClient: currentClient._id
    });

    // Get tickets statistics
    const tickets = await TicketModel.find({
      companyCode: currentClient.companyCode
    });

    // Calculate ticket statistics
    const ticketStats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      highPriority: tickets.filter(t => t.priority === 'high').length,
    };

    // Get recent activity
    const recentUsers = await UserModel.find({
      companyCode: currentClient.companyCode,
      role: UserRole.CLIENT_USER,
      createdByClient: currentClient._id,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    const stats = {
      clientInfo: {
        companyName: currentClient.company,
        companyCode: currentClient.companyCode,
        clientSince: currentClient.clientDetails?.since
      },
      userStats: {
        totalUsers: clientUsers.length,
        activeUsers: clientUsers.filter(u => u.isActive).length,
        inactiveUsers: clientUsers.filter(u => !u.isActive).length,
        recentUsers: recentUsers.length,
        usersByAccessLevel: {
          basic: clientUsers.filter(u => u.clientUserDetails?.accessLevel === 'basic').length,
          standard: clientUsers.filter(u => u.clientUserDetails?.accessLevel === 'standard').length,
          admin: clientUsers.filter(u => u.clientUserDetails?.accessLevel === 'admin').length,
        }
      },
      ticketStats,
      recentActivity: {
        lastLogin: currentClient.lastLoginAt,
        usersCreatedThisMonth: recentUsers.length
      }
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// Get all users (admin only)
app.get("/api/users", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const { role, department, isActive } = req.query;
    
    const filter: any = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await UserModel.find(filter).select("-password").sort({ createdAt: -1 });
    res.json(users.map(getUserResponse));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID
app.get("/api/users/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const requestedUserId = req.params.id;
    const currentUser = req.user!;

    let user = await UserModel.findById(requestedUserId).select("-password").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Authorization Logic
    if (currentUser.role === UserRole.ADMIN) {
      // Admin can see all details
      res.json(getUserResponse(user));
    } else if (currentUser.role === UserRole.EMPLOYEE) {
      // Employee can see their own full details, and other employees' basic details
      if (currentUser._id.toString() === requestedUserId) {
        res.json(getUserResponse(user));
      } else if (user.role === UserRole.EMPLOYEE) {
        // Return basic employee details for other employees
        res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          jobTitle: user.jobTitle,
          department: user.department,
          role: user.role,
        });
      } else {
        return res.status(403).json({ message: "Forbidden: You do not have access to this user's details" });
      }
    } else if (currentUser.role === UserRole.CLIENT || currentUser.role === UserRole.CLIENT_USER) {
      // Clients and Client Users can see basic details of Employees
      if (user.role === UserRole.EMPLOYEE) {
        res.json({
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          jobTitle: user.jobTitle,
          department: user.department,
          role: user.role,
        });
      } else {
        return res.status(403).json({ message: "Forbidden: You do not have access to this user's details" });
      }
    } else {
      return res.status(403).json({ message: "Forbidden: You do not have access to this user's details" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/users", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const {
      name,
      email,
      role = UserRole.EMPLOYEE,
      phone,
      department,
      skills,
      skillsString,
      jobTitle,
      dateOfBirth,
      address,
      emergencyContact,
      employmentDetails,
      // Client-specific fields
      company,
      industry,
      clientType,
      clientId,
      contactPerson,
      billingAddress,
      shippingAddress,
      clientDetails,
      // ✅ Multi-tenant fields
      companyCode
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "name and email are required" });
    }

    // ✅ Enhanced email uniqueness check based on role
    let existingUser;
    if (role === UserRole.CLIENT || role === UserRole.CLIENT_USER) {
      // For client roles, check email + companyCode uniqueness
      existingUser = await UserModel.findOne({ 
        email: email.toLowerCase(),
        companyCode: role === UserRole.CLIENT ? companyCode : undefined 
      });
    } else {
      // For admin/employee, check email uniqueness (no company code)
      existingUser = await UserModel.findOne({ 
        email: email.toLowerCase(),
        companyCode: { $exists: false }
      });
    }

    if (existingUser) {
      return res.status(400).json({ 
        message: role === UserRole.CLIENT || role === UserRole.CLIENT_USER 
          ? "Email already registered in this company" 
          : "Email already registered"
      });
    }

    // ✅ Validate company code requirements
    if ((role === UserRole.CLIENT || role === UserRole.CLIENT_USER) && !companyCode) {
      return res.status(400).json({ message: "companyCode is required for client and client_user roles" });
    }

    // ✅ For clients, ensure company code is unique
    if (role === UserRole.CLIENT) {
      const existingClientWithCompanyCode = await UserModel.findOne({ 
        companyCode,
        role: UserRole.CLIENT 
      });
      if (existingClientWithCompanyCode) {
        return res.status(400).json({ message: "Company code already in use" });
      }
    }

    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Common user data
    const userData: any = {
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      isActive: true,
    };

    // Handle employee-specific data
    if (role === UserRole.EMPLOYEE) {
      // Normalize skills coming from UI (either array or skillsString)
      const finalSkills: string[] = Array.isArray(skills)
        ? skills
        : (typeof skillsString === "string" && skillsString.trim().length > 0)
        ? skillsString.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      // Convert dateOfBirth if provided
      const dob = dateOfBirth ? new Date(dateOfBirth) : undefined;

      // Normalize employmentDetails.hireDate if provided
      const normalizedEmploymentDetails = employmentDetails
        ? {
            ...employmentDetails,
            hireDate: employmentDetails.hireDate ? new Date(employmentDetails.hireDate) : undefined,
          }
        : undefined;

      userData.department = department || "General";
      userData.skills = finalSkills;
      userData.jobTitle = jobTitle;
      userData.dateOfBirth = dob;
      userData.address = address;
      userData.emergencyContact = emergencyContact;
      userData.employmentDetails = normalizedEmploymentDetails;
      // employeeId will be auto-generated in pre-save hook
    }

    // Handle client-specific data
    if (role === UserRole.CLIENT) {
      // Normalize clientDetails.since if provided
      const normalizedClientDetails = clientDetails
        ? {
            ...clientDetails,
            since: clientDetails.since ? new Date(clientDetails.since) : undefined,
          }
        : undefined;

      userData.companyCode = companyCode; // ✅ Set company code for clients
      userData.company = company;
      userData.industry = industry;
      userData.clientType = clientType || "business";
      userData.contactPerson = contactPerson;
      userData.billingAddress = billingAddress;
      userData.shippingAddress = shippingAddress;
      userData.clientDetails = normalizedClientDetails;
      // clientId will be auto-generated in pre-save hook
    }

    // ✅ Handle client user creation (admin can create client users for clients)
    if (role === UserRole.CLIENT_USER) {
      if (!companyCode) {
        return res.status(400).json({ message: "companyCode is required for client_user role" });
      }

      // Verify the company code belongs to an existing client
      const existingClient = await UserModel.findOne({
        companyCode,
        role: UserRole.CLIENT
      });

      if (!existingClient) {
        return res.status(400).json({ message: "Invalid company code or client not found" });
      }

      userData.companyCode = companyCode;
      userData.createdByClient = existingClient._id;
      userData.department = department || "Clients";
      userData.jobTitle = jobTitle;
      userData.clientUserDetails = {
        permissions: ["read_projects", "create_tickets"],
        accessLevel: "basic",
        isPrimaryContact: false
      };
      // employeeId will be auto-generated as CU- prefix in pre-save hook
    }

    const user = await UserModel.create(userData);

    // Send welcome email
    let emailHtml;
    let emailSubject = "";

    switch (user.role) {
      case UserRole.EMPLOYEE:
        emailSubject = "Welcome to Vertifit Service Desk - Your Employee Account";
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0;">Welcome to Vertifit Service Desk</h1>
            </div>
            <div style="background: white; padding: 30px;">
              <h2>Hello ${user.name},</h2>
              <p>Your Employee account has been created successfully.</p>
              <p>Your Employee ID is: <strong>${user.employeeId}</strong></p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0;">Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Password:</strong> ${temporaryPassword}</p>
                <p><strong>Login URL:</strong> <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
              </div>
              
              <p>Please log in and change your password after first login.</p>
            </div>
          </div>
        `;
        break;

      case UserRole.CLIENT:
        emailSubject = "Welcome to Vertifit Service Desk - Your Client Account";
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0;">Welcome to Vertifit Service Desk</h1>
            </div>
            <div style="background: white; padding: 30px;">
              <h2>Hello ${user.name},</h2>
              <p>Your Client account has been created successfully.</p>
              <p>Your Client ID is: <strong>${user.clientId}</strong></p>
              <p>Your Company Code: <strong>${user.companyCode}</strong></p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0;">Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Password:</strong> ${temporaryPassword}</p>
                <p><strong>Login URL:</strong> <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
              </div>
              
              <p>You can now create and manage users for your company using your company code.</p>
              <p>Please log in and change your password after first login.</p>
            </div>
          </div>
        `;
        break;

      case UserRole.CLIENT_USER:
        emailSubject = "Welcome to Vertifit Service Desk - Your Client User Account";
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0;">Welcome to Vertifit Service Desk</h1>
            </div>
            <div style="background: white; padding: 30px;">
              <h2>Hello ${user.name},</h2>
              <p>Your Client User account has been created successfully.</p>
              <p>Your User ID is: <strong>${user.employeeId}</strong></p>
              <p>Company: <strong>${user.companyCode}</strong></p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0;">Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Password:</strong> ${temporaryPassword}</p>
                <p><strong>Login URL:</strong> <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
              </div>
              
              <p>Access Level: <strong>${user.clientUserDetails?.accessLevel}</strong></p>
              <p>Please log in and change your password after first login.</p>
            </div>
          </div>
        `;
        break;
    }

    try {
      await vertifitEmailService.sendEmail({
        to: user.email,
        subject: emailSubject,
        html: emailHtml,
        text: `Welcome to Vertifit Service Desk! Your ${user.role} account has been created. Email: ${user.email}, Password: ${temporaryPassword}, Login: ${process.env.APP_URL}`
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the request if email fails
    }

    const userResponse = getUserResponse(user);
    res.status(201).json({
      ...userResponse,
      temporaryPassword: temporaryPassword, // Include in response for admin reference
      message: "User created successfully"
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    
    if (error.code === 11000) {
      // MongoDB duplicate key error
      if (error.keyPattern?.email && error.keyPattern?.companyCode) {
        return res.status(400).json({ message: "Email already exists in this company" });
      } else if (error.keyPattern?.email) {
        return res.status(400).json({ message: "Email already registered" });
      }
    }
    
    res.status(500).json({ message: error.message });
  }
});

// Update user by ID (admin only)
app.patch("/api/users/:id", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const updatesFromBody = req.body;

    // If attempting to change email, ensure uniqueness
    if (updatesFromBody.email) {
      const existing = await UserModel.findOne({ email: updatesFromBody.email, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: "Email already in use by another account" });
      }
    }

    // Prevent password changes through this endpoint
    if (updatesFromBody.password) {
      delete updatesFromBody.password;
    }

    // The $set operator will handle top-level fields and nested objects correctly.
    // For deep merges of nested objects, dot notation is required.
    const updatePayload: { [key: string]: any } = { $set: {} };

    for (const key in updatesFromBody) {
      if (Object.prototype.hasOwnProperty.call(updatesFromBody, key)) {
        const value = updatesFromBody[key];
        
        if (key === 'skills' && Array.isArray(value)) {
          // Use $addToSet to add new skills without duplicates
          if (!updatePayload.$addToSet) updatePayload.$addToSet = {};
          updatePayload.$addToSet.skills = { $each: value };
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // For nested objects (address, employmentDetails, etc.), flatten them with dot notation
          for (const nestedKey in value) {
            if (Object.prototype.hasOwnProperty.call(value, nestedKey)) {
              updatePayload.$set[`${key}.${nestedKey}`] = value[nestedKey];
            }
          }
        } else {
          // For all other fields
          updatePayload.$set[key] = value;
        }
      }
    }

    // Handle date fields specifically if they are strings
    if (typeof updatePayload.$set.dateOfBirth === 'string') {
      updatePayload.$set.dateOfBirth = new Date(updatePayload.$set.dateOfBirth);
    }
    if (typeof updatePayload.$set['employmentDetails.hireDate'] === 'string') {
      updatePayload.$set['employmentDetails.hireDate'] = new Date(updatePayload.$set['employmentDetails.hireDate']);
    }

    const user = await UserModel.findByIdAndUpdate(id, updatePayload, { new: true }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(getUserResponse(user));
  } catch (error: any) {
    console.error("Update user error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Soft delete user (set isActive to false)
app.delete("/api/users/:id", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "User deactivated successfully",
      user: getUserResponse(user)
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Reactivate user
app.patch("/api/users/:id/reactivate", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "User reactivated successfully",
      user: getUserResponse(user)
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to format user response
function getUserResponse(user: any) {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    department: user.department,
    skills: user.skills,
    profileImage: user.profileImage,
    jobTitle: user.jobTitle,
    employeeId: user.employeeId,
    dateOfBirth: user.dateOfBirth,
    address: user.address,
    emergencyContact: user.emergencyContact,
    employmentDetails: user.employmentDetails,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    companyCode: user.companyCode
  };
}
/*
  app.post("/api/tickets", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { title, description, priority, category, attachments } = req.body;

      const ticketCount = await TicketModel.countDocuments();
      const ticketNumber = `TKT-${String(ticketCount + 1).padStart(5, "0")}`;

      const client = await UserModel.findById(req.user!._id);

      const ticket = await TicketModel.create({
        ticketNumber,
        title,
        description,
        priority,
        category,
        status: TicketStatus.OPEN,
        clientId: req.user!._id,
        clientName: client?.name,
        attachments,
      });

      const employees = await UserModel.find({ role: UserRole.EMPLOYEE });
      if (employees.length > 0) {
        const categoryMatch = employees.find(
          (emp) => emp.skills && emp.skills.includes(category.toLowerCase())
        );

        if (categoryMatch) {
          ticket.assignedTo = categoryMatch._id.toString();
          ticket.assignedToName = categoryMatch.name;
          ticket.status = TicketStatus.IN_PROGRESS;
          await ticket.save();
        } else {
          const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
          ticket.assignedTo = randomEmployee._id.toString();
          ticket.assignedToName = randomEmployee.name;
          ticket.status = TicketStatus.IN_PROGRESS;
          await ticket.save();
        }
      }

      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
*/
app.post("/api/tickets", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, description, priority, department, category, attachments } = req.body;

    // 🔹 Identify logged-in user (Client or ClientUser)
    const creator = await UserModel.findById(req.user!._id);
    if (!creator) return res.status(404).json({ message: "User not found" });

    // 🔹 Use companyCode directly (since both client & clientusers have same companyCode)
    const companyCode = creator.companyCode;
    if (!companyCode) return res.status(400).json({ message: "Missing companyCode" });

    // 🔹 Generate ticket number (global or per-company, optional)
    const ticketCount = await TicketModel.countDocuments({ companyCode });
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${companyCode}-${String(
      ticketCount + 1
    ).padStart(5, "0")}-${randomSuffix}`;

    // 🔹 Prepare ticket base data
    const ticketData: any = {
      ticketNumber,
      title,
      description,
      priority,
      category,
      department,
      attachments,
      companyCode,
      status: TicketStatus.OPEN,
      clientId: creator._id, // who created
      clientName: creator.name,
      clientEmail: creator.email,
      createdBy: creator._id,
      createdByName: creator.name,
      createdByRole: creator.role,
      assignedEmployees: [],
    };

    // 🔹 Find employees in same department & company
    const employees = await UserModel.find({
      role: UserRole.EMPLOYEE,
      department,
    //  companyCode,
    });

    let assignedEmployeesDetails: any[] = [];

    if (employees.length > 0) {
      const workloads = await Promise.all(
        employees.map(async (emp) => ({
          emp,
          count: await TicketModel.countDocuments({
            "assignedEmployees.employeeId": emp._id.toString(),
            status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
          }),
        }))
      );

      const available = workloads
        .filter((w) => w.count < 3)
        .sort((a, b) => a.count - b.count)
        .slice(0, 2);

      if (available.length) {
        assignedEmployeesDetails = available.map((w, i) => ({
          employeeId: w.emp._id.toString(),
          employeeName: w.emp.name,
          employeeEmail: w.emp.email,
          assignedAt: new Date(),
          isPrimary: i === 0,
          department: w.emp.department,
        }));

        ticketData.assignedEmployees = assignedEmployeesDetails;
        ticketData.status = TicketStatus.IN_PROGRESS;
        ticketData.assignedTo = assignedEmployeesDetails[0].employeeId;
        ticketData.assignedToName = assignedEmployeesDetails[0].employeeName;
      }
    }

    // 🔹 Create new ticket
    const ticket = await TicketModel.create(ticketData);

    // 🔹 Send notifications
    await sendTicketCreationEmails(ticket, assignedEmployeesDetails,companyCode, creator);

    res.status(201).json({
      message: "✅ Ticket created successfully",
      ticket: ticket,
    });
  } catch (error: any) {
    console.error("Ticket creation error:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

// ✅ Updated Email notification function with client user support
async function sendTicketCreationEmails(ticket: any, assignedEmployees: any[], companyCode: any,  creator: any) {
  try {
    const adminUsers = await UserModel.find({ role: UserRole.ADMIN });
    const adminEmails = adminUsers.map(admin => admin.email);

    const assignedEmployeeNames = assignedEmployees.map(emp => emp.employeeName).join(', ');
    const priorityColor = getPriorityColor(ticket.priority);
    const categoryIcon = getCategoryIcon(ticket.category);

    // Determine creator information for email display
    const createdByText = creator.role === UserRole.CLIENT_USER 
      ? `Created by ${creator.name} (Team Member) on behalf of ${companyCode.name}`
      : `Created by This Company ${companyCode.name}`;

    // Base email template
    const baseEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🎫 New Support Ticket Created</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Ticket Header -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${priorityColor};">
            <h2 style="margin: 0 0 10px 0; color: #2d3748;">${ticket.title}</h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 14px;">
              <span><strong>Ticket #:</strong> ${ticket.ticketNumber}</span>
              <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                ${ticket.priority.toUpperCase()}
              </span>
              <span>${categoryIcon} ${ticket.category}</span>
              <span>🏢 ${ticket.department}</span>
            </div>
            <div style="margin-top: 10px; font-size: 13px; color: #6b7280;">
              👤 ${createdByText}
            </div>
          </div>

          <!-- Ticket Details -->
          <div style="margin-bottom: 20px;">
            <h3 style="color: #4a5568; margin-bottom: 10px;">📋 Description</h3>
            <p style="background: #f7fafc; padding: 15px; border-radius: 6px; border-left: 3px solid #e2e8f0; margin: 0;">
              ${ticket.description}
            </p>
          </div>

          <!-- Assignment Status -->
          <div style="margin-bottom: 20px;">
            <h3 style="color: #4a5568; margin-bottom: 10px;">👥 Assignment</h3>
            ${assignedEmployees.length > 0 
              ? `<p style="color: #38a169; background: #f0fff4; padding: 12px; border-radius: 6px; border-left: 3px solid #38a169;">
                 ✅ Auto-assigned to: <strong>${assignedEmployeeNames}</strong>
                 </p>` 
              : `<p style="color: #e53e3e; background: #fed7d7; padding: 12px; border-radius: 6px; border-left: 3px solid #e53e3e;">
                 ⚠️ Awaiting manual assignment
                 </p>`
            }
          </div>

          <!-- Quick Actions -->
          <div style="background: #edf2f7; padding: 20px; border-radius: 8px; text-align: center;">
            <a href="${process.env.APP_URL}/login" 
               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              📝 View Ticket Details
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #718096; font-size: 12px;">
          <p>This is an automated notification from Vertifit Service Desk</p>
        </div>
      </div>
    `;

    const emailPromises = [];

    // 1. Send to assigned employees
    if (assignedEmployees.length > 0) {
      assignedEmployees.forEach(employee => {
        const employeeEmailHtml = baseEmailHtml.replace(
          '🎫 New Support Ticket Created',
          `🎫 New Ticket Assigned to You - ${ticket.ticketNumber}`
        );
        
        emailPromises.push(
          vertifitEmailService.sendEmail({
            to: employee.employeeEmail,
            subject: `🎫 New Ticket Assigned: ${ticket.ticketNumber} - ${ticket.title}`,
            html: employeeEmailHtml,
            text: `New ticket ${ticket.ticketNumber} has been assigned to you. Title: ${ticket.title}, Priority: ${ticket.priority}, Department: ${ticket.department}. Created by: ${createdByText}`
          })
        );
      });
    }

    // 2. Send to client (organization)
    const clientEmailHtml = baseEmailHtml.replace(
      '🎫 New Support Ticket Created',
      creator.role === UserRole.CLIENT_USER 
        ? `🎫 New Ticket Created by Team Member - ${ticket.ticketNumber}`
        : `🎫 Your Ticket Has Been Created - ${ticket.ticketNumber}`
    );
    
    emailPromises.push(
      vertifitEmailService.sendEmail({
        to: creator.email,
        subject: creator.role === UserRole.CLIENT_USER 
          ? `🎫 New Ticket Created by Team Member: ${ticket.ticketNumber} - ${ticket.title}`
          : `🎫 Ticket Created Successfully: ${ticket.ticketNumber} - ${ticket.title}`,
        html: clientEmailHtml,
        text: creator.role === UserRole.CLIENT_USER 
          ? `A new ticket ${ticket.ticketNumber} has been created by your team member ${creator.name}. Title: ${ticket.title}, Priority: ${ticket.priority}`
          : `Your ticket ${ticket.ticketNumber} has been created successfully. We'll notify you when it's assigned.`
      })
    );

    // 3. Send to creator if it's a client user (different from client email)
    if (creator.role === UserRole.CLIENT_USER && creator.email !== creator.email) {
      const creatorEmailHtml = baseEmailHtml.replace(
        '🎫 New Support Ticket Created',
        `🎫 Your Ticket Has Been Created - ${ticket.ticketNumber}`
      );
      
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: creator.email,
          subject: `🎫 Ticket Created Successfully: ${ticket.ticketNumber} - ${ticket.title}`,
          html: creatorEmailHtml,
          text: `Your support ticket has been created successfully on behalf of this Company ${companyCode.name}. Ticket #: ${ticket.ticketNumber}, Title: ${ticket.title}`
        })
      );
    }

    // 4. Send to all admins
    if (adminEmails.length > 0) {
      const adminEmailHtml = baseEmailHtml.replace(
        '🎫 New Support Ticket Created',
        `🎫 New Ticket Created - ${ticket.ticketNumber}`
      );
      
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: adminEmails,
          subject: `🎫 New Ticket Created: ${ticket.ticketNumber} - ${ticket.title}`,
          html: adminEmailHtml,
          text: `New ticket ${ticket.ticketNumber} created. Title: ${ticket.title}, Department: ${ticket.department}, Created by: ${createdByText}`
        })
      );
    }

    // Send all emails concurrently
    await Promise.allSettled(emailPromises);
    console.log(`✅ Email notifications sent for ticket ${ticket.ticketNumber}`);

  } catch (emailError) {
    console.error("❌ Failed to send email notifications:", emailError);
    // Don't throw error - ticket creation should succeed even if emails fail
  }
}

// Helper functions (keep your existing ones)
function getPriorityColor(priority: string): string {
  const colors = {
    low: '#38a169',
    medium: '#ed8936',
    high: '#e53e3e',
    urgent: '#9f2fbf'
  };
  return colors[priority as keyof typeof colors] || '#718096';
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    hardware: '💻',
    software: '📱',
    network: '🌐',
    other: '📄'
  };
  return icons[category as keyof typeof icons] || '📄';
}
 app.get("/api/tickets", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tickets = await TicketModel.find().sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/tickets/my-tickets", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tickets = await TicketModel.find({ clientId: req.user!._id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Updated assigned tickets endpoint to check both single and multiple assignments
app.get("/api/tickets/assigned", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!._id;
    
    // Find tickets where user is assigned (either in assignedTo or assignedEmployees)
    const tickets = await TicketModel.find({
      $or: [
        { assignedTo: userId },
        { "assignedEmployees.employeeId": userId }
      ]
    }).sort({ createdAt: -1 });
    
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/tickets/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Authorization check
    const currentUser = req.user!;
     console.log('currentuser deatls ',currentUser,currentUser.role,'ticketcomanycode',ticket.companyCode ,'compaycode',currentUser.companyCode);
    if (
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.EMPLOYEE ||
      (currentUser.role === UserRole.CLIENT && ticket.companyCode === currentUser.companyCode) ||
      (currentUser.role === UserRole.CLIENT_USER && ticket.companyCode === currentUser.companyCode)
     
    ) {
      
      res.json(ticket);
    } else {
      return res.status(403).json({ message: "Forbidden: You do not have access to this ticket" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get tickets created by a specific user
app.get("/api/tickets/by-user/:userId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const currentClient = req.user;

    if (!currentClient || !currentClient.companyCode) {
      return res.status(401).json({ message: "Unauthorized or missing company code" });
    }

    // Verify user exists in company
    const targetUser = await UserModel.findOne({
      _id: userId,
      companyCode: currentClient.companyCode,
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found in your company" });
    }

    // PRIMARY QUERY: Based on your actual data structure
    const tickets = await TicketModel.find({
      companyCode: currentClient.companyCode,
      $or: [
        { clientId: userId },  // User created the ticket (based on your data)
        { "assignedEmployees.employeeId": userId }  // User is assigned to ticket
      ]
    })
    .sort({ createdAt: -1 })
    .populate('assignedEmployees.employeeId', 'name email') // Optional: populate assignee details
    .lean();

    res.json(tickets);
  } catch (error: any) {
    console.error("Get tickets by user error:", error);
    res.status(500).json({ message: "Failed to fetch tickets for user" });
  }
});

// Update ticket status with email notifications
app.patch("/api/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const { status } = req.body;
      const updates: any = { status };

      if (status === TicketStatus.RESOLVED) {
        updates.resolvedAt = new Date();
      } else if (status === TicketStatus.CLOSED) {
        updates.closedAt = new Date();
      }

      const oldTicket = await TicketModel.findById(req.params.id);
      const ticket = await TicketModel.findByIdAndUpdate(req.params.id, updates, { new: true });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Send status update emails
      await sendTicketStatusUpdateEmails(oldTicket, ticket);

      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

// Assign multiple employees to a ticket with email notifications
app.patch("/api/tickets/:id/assign", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ message: "employeeIds must be an array" });
    }

    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Get employee details
    const employees = await UserModel.find({ 
      _id: { $in: employeeIds },
      role: UserRole.EMPLOYEE 
    });

    if (employees.length !== employeeIds.length) {
      return res.status(404).json({ message: "Some employees not found" });
    }

    // Check workload for each employee
    const employeesWithWorkload = await Promise.all(
      employees.map(async (employee) => {
        const activeTicketCount = await TicketModel.countDocuments({
          "assignedEmployees.employeeId": employee._id.toString(),
          status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
        });
        return {
          employee,
          activeTicketCount,
          isAvailable: activeTicketCount < 5
        };
      })
    );

    // Check if any employee is overloaded
    const overloadedEmployees = employeesWithWorkload.filter(emp => !emp.isAvailable);
    if (overloadedEmployees.length > 0) {
      return res.status(400).json({
        message: "Some employees have too many active tickets",
        overloadedEmployees: overloadedEmployees.map(emp => ({
          employeeName: emp.employee.name,
          currentWorkload: emp.activeTicketCount
        }))
      });
    }

    // Create assigned employees array
    const assignedEmployeesDetails = employees.map((employee, index) => ({
      employeeId: employee._id.toString(),
      employeeName: employee.name,
      employeeEmail: employee.email,
      assignedAt: new Date(),
      isPrimary: index === 0,
      department: employee.department || ticket.department
    }));

    // Store old assignments for email comparison
    const oldAssignments = ticket.assignedEmployees || [];

    // Update ticket
    ticket.assignedEmployees = assignedEmployeesDetails;
    ticket.assignedTo = assignedEmployeesDetails[0].employeeId;
    ticket.assignedToName = assignedEmployeesDetails[0].employeeName;
    ticket.status = TicketStatus.IN_PROGRESS;

    await ticket.save();

    // Send assignment emails
    await sendAssignmentEmails(ticket, assignedEmployeesDetails, oldAssignments);

    res.json({
      message: `Ticket assigned to ${assignedEmployeesDetails.map(emp => emp.employeeName).join(', ')}`,
      ticket,
      assignedEmployees: assignedEmployeesDetails
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Add additional employee to ticket with email notifications
app.patch("/api/tickets/:id/add-employee", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const { employeeId } = req.body;

    const employee = await UserModel.findById(employeeId);
    if (!employee || employee.role !== UserRole.EMPLOYEE) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if employee is already assigned
    if (ticket.assignedEmployees?.some(emp => emp.employeeId === employeeId)) {
      return res.status(400).json({ message: "Employee already assigned to this ticket" });
    }

    // Check workload
    const activeTicketCount = await TicketModel.countDocuments({
      "assignedEmployees.employeeId": employeeId,
      status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
    });

    if (activeTicketCount >= 5) {
      return res.status(400).json({ 
        message: "Employee has too many active tickets (5 max)",
        currentWorkload: activeTicketCount
      });
    }

    // Store old assignments
    const oldAssignments = ticket.assignedEmployees || [];

    // Add employee to assignment
    const newAssignment = {
      employeeId: employee._id.toString(),
      employeeName: employee.name,
      employeeEmail: employee.email,
      assignedAt: new Date(),
      isPrimary: false,
      department: employee.department || ticket.department
    };

    if (!ticket.assignedEmployees) {
      ticket.assignedEmployees = [newAssignment];
      newAssignment.isPrimary = true;
      ticket.assignedTo = newAssignment.employeeId;
      ticket.assignedToName = newAssignment.employeeName;
      ticket.status = TicketStatus.IN_PROGRESS;
    } else {
      ticket.assignedEmployees.push(newAssignment);
    }

    await ticket.save();

    // Send employee added email
    await sendEmployeeAddedEmail(ticket, newAssignment, oldAssignments);

    res.json({
      message: `Employee ${employee.name} added to ticket`,
      ticket,
      newAssignment
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Remove employee from ticket with email notifications
app.patch("/api/tickets/:id/remove-employee", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const { employeeId } = req.body;

    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (!ticket.assignedEmployees || ticket.assignedEmployees.length === 0) {
      return res.status(400).json({ message: "No employees assigned to this ticket" });
    }

    const employeeIndex = ticket.assignedEmployees.findIndex(
      emp => emp.employeeId === employeeId
    );

    if (employeeIndex === -1) {
      return res.status(400).json({ message: "Employee not assigned to this ticket" });
    }

    const removedEmployee = ticket.assignedEmployees[employeeIndex];
    
    // Store old assignments for email
    const oldAssignments = [...ticket.assignedEmployees];
    
    ticket.assignedEmployees.splice(employeeIndex, 1);

    // Update primary assignment if needed
    if (removedEmployee.isPrimary && ticket.assignedEmployees.length > 0) {
      ticket.assignedEmployees[0].isPrimary = true;
      ticket.assignedTo = ticket.assignedEmployees[0].employeeId;
      ticket.assignedToName = ticket.assignedEmployees[0].employeeName;
    } else if (ticket.assignedEmployees.length === 0) {
      ticket.assignedTo = undefined;
      ticket.assignedToName = undefined;
      ticket.status = TicketStatus.OPEN;
    }

    await ticket.save();

    // Send employee removed email
    await sendEmployeeRemovedEmail(ticket, removedEmployee, oldAssignments);

    res.json({
      message: `Employee ${removedEmployee.employeeName} removed from ticket`,
      ticket
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ========== EMAIL NOTIFICATION FUNCTIONS ==========

// Send status update emails
async function sendTicketStatusUpdateEmails(oldTicket: any, updatedTicket: any) {
  try {
    const adminUsers = await UserModel.find({ role: UserRole.ADMIN });
    const adminEmails = adminUsers.map(admin => admin.email);
    
    const client = await UserModel.findById(updatedTicket.clientId);
    const assignedEmployees = updatedTicket.assignedEmployees || [];

    const statusConfig: Record<TicketStatus, { color: string; icon: string; action: string }> = {
      [TicketStatus.OPEN]: { color: '#3182ce', icon: '🔓', action: 'reopened' },
      [TicketStatus.IN_PROGRESS]: { color: '#ed8936', icon: '🔄', action: 'in progress' },
      [TicketStatus.RESOLVED]: { color: '#38a169', icon: '✅', action: 'resolved' },
      [TicketStatus.CLOSED]: { color: '#718096', icon: '🔒', action: 'closed' }
    };

    const config = statusConfig[updatedTicket.status as TicketStatus] || { color: '#718096', icon: '📝', action: 'updated' };

    // Define interfaces for configuration and ticket data
    interface StatusConfig {
      color: string;
      icon: string;
      action: string;
    }

    interface AssignedEmployee {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
      assignedAt: Date;
      isPrimary: boolean;
      department?: string;
    }

    interface TicketData {
      _id: string;
      title: string;
      ticketNumber: string;
      status: string;
      department: string;
      resolvedAt?: Date;
      closedAt?: Date;
    }

        const baseEmailHtml: string = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
            <div style="background: linear-gradient(135deg, ${config.color} 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">${config.icon} Ticket Status Updated</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Ticket Header -->
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${config.color};">
                <h2 style="margin: 0 0 10px 0; color: #2d3748;">${updatedTicket.title}</h2>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 14px;">
                  <span><strong>Ticket #:</strong> ${updatedTicket.ticketNumber}</span>
                  <span style="background: ${config.color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                    ${updatedTicket.status.toUpperCase()}
                  </span>
                  <span>🏢 ${updatedTicket.department}</span>
                </div>
              </div>

              <!-- Status Update -->
              <div style="margin-bottom: 20px;">
                <h3 style="color: #4a5568; margin-bottom: 10px;">📊 Status Change</h3>
                <p style="background: #f0fff4; padding: 15px; border-radius: 6px; border-left: 3px solid ${config.color}; margin: 0;">
                  <strong>Status changed from ${oldTicket.status} to ${updatedTicket.status}</strong>
                  ${updatedTicket.resolvedAt ? `<br>✅ Resolved on: ${new Date(updatedTicket.resolvedAt).toLocaleString()}` : ''}
                  ${updatedTicket.closedAt ? `<br>🔒 Closed on: ${new Date(updatedTicket.closedAt).toLocaleString()}` : ''}
                </p>
              </div>

              <!-- Current Assignees -->
              ${assignedEmployees.length > 0 ? `
                <div style="margin-bottom: 20px;">
                  <h3 style="color: #4a5568; margin-bottom: 10px;">👥 Assigned Team</h3>
                  <p style="background: #f7fafc; padding: 12px; border-radius: 6px;">
                    ${assignedEmployees.map((emp: AssignedEmployee) => 
                      `<span style="display: inline-block; background: #e2e8f0; padding: 4px 8px; margin: 2px; border-radius: 4px;">${emp.employeeName}</span>`
                    ).join('')}
                  </p>
                </div>
              ` : ''}

              <!-- Quick Actions -->
              <div style="background: #edf2f7; padding: 20px; border-radius: 8px; text-align: center;">
                <a href="${process.env.APP_URL}/login" 
                   style="background: ${config.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  📝 View Ticket Details
                </a>
              </div>
            </div>
          </div>
        `;

    const emailPromises = [];

    // Send to client
    if (client) {
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: client.email,
          subject: `${config.icon} Ticket ${updatedTicket.ticketNumber} Status Updated to ${updatedTicket.status.toUpperCase()}`,
          html: baseEmailHtml,
          text: `Your ticket ${updatedTicket.ticketNumber} status has been updated to ${updatedTicket.status}`
        })
      );
    }

    // Send to assigned employees
    interface Employee {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
      assignedAt: Date;
      isPrimary: boolean;
      department?: string;
    }

    assignedEmployees.forEach((employee: Employee) => {
      emailPromises.push(
      vertifitEmailService.sendEmail({
        to: employee.employeeEmail,
        subject: `${config.icon} Ticket ${updatedTicket.ticketNumber} Status Updated to ${updatedTicket.status.toUpperCase()}`,
        html: baseEmailHtml,
        text: `Ticket ${updatedTicket.ticketNumber} status updated to ${updatedTicket.status}`
      })
      );
    });

    // Send to admins
    if (adminEmails.length > 0) {
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: adminEmails,
          subject: `${config.icon} Ticket ${updatedTicket.ticketNumber} Status Updated to ${updatedTicket.status.toUpperCase()}`,
          html: baseEmailHtml,
          text: `Ticket ${updatedTicket.ticketNumber} status updated to ${updatedTicket.status}`
        })
      );
    }

    await Promise.allSettled(emailPromises);
    console.log(`✅ Status update emails sent for ticket ${updatedTicket.ticketNumber}`);

  } catch (error) {
    console.error("❌ Failed to send status update emails:", error);
  }
}

// Send assignment emails
async function sendAssignmentEmails(ticket: any, newAssignments: any[], oldAssignments: any[]) {
  try {
    const adminUsers = await UserModel.find({ role: UserRole.ADMIN });
    const adminEmails = adminUsers.map(admin => admin.email);
    const client = await UserModel.findById(ticket.clientId);

    const newlyAssigned = newAssignments.filter(newEmp => 
      !oldAssignments.some(oldEmp => oldEmp.employeeId === newEmp.employeeId)
    );

    const assignmentEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #38a169 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">👥 Ticket Assignment Update</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Ticket Header -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #38a169;">
            <h2 style="margin: 0 0 10px 0; color: #2d3748;">${ticket.title}</h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 14px;">
              <span><strong>Ticket #:</strong> ${ticket.ticketNumber}</span>
              <span style="background: #38a169; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                ASSIGNED
              </span>
              <span>🏢 ${ticket.department}</span>
            </div>
          </div>

          <!-- Assignment Details -->
          <div style="margin-bottom: 20px;">
            <h3 style="color: #4a5568; margin-bottom: 10px;">📋 Assignment Details</h3>
            <p style="background: #f0fff4; padding: 15px; border-radius: 6px; border-left: 3px solid #38a169; margin: 0;">
              <strong>Ticket has been assigned to:</strong><br>
              ${newAssignments.map(emp => 
                `• ${emp.employeeName} ${emp.isPrimary ? '(Primary)' : ''}`
              ).join('<br>')}
            </p>
          </div>

          ${newlyAssigned.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #4a5568; margin-bottom: 10px;">🎯 New Assignments</h3>
              <p style="background: #e6fffa; padding: 12px; border-radius: 6px;">
                ${newlyAssigned.map(emp => 
                  `<span style="display: inline-block; background: #38b2ac; color: white; padding: 4px 8px; margin: 2px; border-radius: 4px;">${emp.employeeName}</span>`
                ).join('')}
              </p>
            </div>
          ` : ''}

          <!-- Quick Actions -->
          <div style="background: #edf2f7; padding: 20px; border-radius: 8px; text-align: center;">
            <a href="${process.env.APP_URL}/login" 
               style="background: #38a169; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              📝 View Ticket Details
            </a>
          </div>
        </div>
      </div>
    `;

    const emailPromises = [];

    // Send to newly assigned employees
    newlyAssigned.forEach(employee => {
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: employee.employeeEmail,
          subject: `🎯 You've Been Assigned to Ticket ${ticket.ticketNumber}`,
          html: assignmentEmailHtml,
          text: `You have been assigned to ticket ${ticket.ticketNumber}: ${ticket.title}`
        })
      );
    });

    // Send to client
    if (client) {
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: client.email,
          subject: `👥 Team Assigned to Your Ticket ${ticket.ticketNumber}`,
          html: assignmentEmailHtml,
          text: `A team has been assigned to your ticket ${ticket.ticketNumber}`
        })
      );
    }

    // Send to admins
    if (adminEmails.length > 0) {
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: adminEmails,
          subject: `👥 Ticket ${ticket.ticketNumber} Assignment Updated`,
          html: assignmentEmailHtml,
          text: `Ticket ${ticket.ticketNumber} has been assigned to team members`
        })
      );
    }

    await Promise.allSettled(emailPromises);
    console.log(`✅ Assignment emails sent for ticket ${ticket.ticketNumber}`);

  } catch (error) {
    console.error("❌ Failed to send assignment emails:", error);
  }
}

// Send employee added email
async function sendEmployeeAddedEmail(ticket: any, newEmployee: any, oldAssignments: any[]) {
  try {
    const adminUsers = await UserModel.find({ role: UserRole.ADMIN });
    const adminEmails = adminUsers.map(admin => admin.email);
    const client = await UserModel.findById(ticket.clientId);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #4299e1 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">➕ Team Member Added</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4299e1;">
            <h2 style="margin: 0 0 10px 0; color: #2d3748;">${ticket.title}</h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 14px;">
              <span><strong>Ticket #:</strong> ${ticket.ticketNumber}</span>
              <span>🏢 ${ticket.department}</span>
            </div>
          </div>

          <div style="text-align: center; padding: 20px;">
            <div style="background: #ebf8ff; padding: 20px; border-radius: 8px; display: inline-block;">
              <h3 style="color: #2b6cb0; margin: 0 0 10px 0;">➕ New Team Member</h3>
              <p style="font-size: 18px; color: #2d3748; margin: 0;">
                <strong>${newEmployee.employeeName}</strong><br>
                <span style="color: #718096;">has been added to the ticket</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    const emailPromises = [];

    // Send to newly added employee
    emailPromises.push(
      vertifitEmailService.sendEmail({
        to: newEmployee.employeeEmail,
        subject: `➕ You've Been Added to Ticket ${ticket.ticketNumber}`,
        html: emailHtml,
        text: `You have been added to ticket ${ticket.ticketNumber}: ${ticket.title}`
      })
    );

    // Send to client
    if (client) {
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: client.email,
          subject: `➕ Team Member Added to Your Ticket ${ticket.ticketNumber}`,
          html: emailHtml,
          text: `A new team member has been added to your ticket ${ticket.ticketNumber}`
        })
      );
    }

    // Send to admins
    if (adminEmails.length > 0) {
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: adminEmails,
          subject: `➕ Team Member Added to Ticket ${ticket.ticketNumber}`,
          html: emailHtml,
          text: `A team member has been added to ticket ${ticket.ticketNumber}`
        })
      );
    }

    await Promise.allSettled(emailPromises);
    console.log(`✅ Employee added email sent for ticket ${ticket.ticketNumber}`);

  } catch (error) {
    console.error("❌ Failed to send employee added email:", error);
  }
}

// Send employee removed email
async function sendEmployeeRemovedEmail(ticket: any, removedEmployee: any, oldAssignments: any[]) {
  try {
    const adminUsers = await UserModel.find({ role: UserRole.ADMIN });
    const adminEmails = adminUsers.map(admin => admin.email);
    const client = await UserModel.findById(ticket.clientId);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <div style="background: linear-gradient(135deg, #e53e3e 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">➖ Team Member Removed</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #e53e3e;">
            <h2 style="margin: 0 0 10px 0; color: #2d3748;">${ticket.title}</h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 14px;">
              <span><strong>Ticket #:</strong> ${ticket.ticketNumber}</span>
              <span>🏢 ${ticket.department}</span>
            </div>
          </div>

          <div style="text-align: center; padding: 20px;">
            <div style="background: #fed7d7; padding: 20px; border-radius: 8px; display: inline-block;">
              <h3 style="color: #c53030; margin: 0 0 10px 0;">➖ Team Member Removed</h3>
              <p style="font-size: 18px; color: #2d3748; margin: 0;">
                <strong>${removedEmployee.employeeName}</strong><br>
                <span style="color: #718096;">has been removed from the ticket</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    const emailPromises = [];

    // Send to removed employee
    emailPromises.push(
      vertifitEmailService.sendEmail({
        to: removedEmployee.employeeEmail,
        subject: `➖ You've Been Removed from Ticket ${ticket.ticketNumber}`,
        html: emailHtml,
        text: `You have been removed from ticket ${ticket.ticketNumber}: ${ticket.title}`
      })
    );

    // Send to client
    if (client) {
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: client.email,
          subject: `➖ Team Member Removed from Your Ticket ${ticket.ticketNumber}`,
          html: emailHtml,
          text: `A team member has been removed from your ticket ${ticket.ticketNumber}`
        })
      );
    }

    // Send to admins
    if (adminEmails.length > 0) {
      emailPromises.push(
        vertifitEmailService.sendEmail({
          to: adminEmails,
          subject: `➖ Team Member Removed from Ticket ${ticket.ticketNumber}`,
          html: emailHtml,
          text: `A team member has been removed from ticket ${ticket.ticketNumber}`
        })
      );
    }

    await Promise.allSettled(emailPromises);
    console.log(`✅ Employee removed email sent for ticket ${ticket.ticketNumber}`);

  } catch (error) {
    console.error("❌ Failed to send employee removed email:", error);
  }
}
 app.get("/api/tickets/:id/comments", async (req, res) => {
  try {
    const comments = await CommentModel.find({ ticketId: req.params.id })
      .sort({ createdAt: 1 });
    
    // Ensure attachments are included in each comment
    const commentsWithAttachments = comments.map(comment => ({
      ...comment.toObject(),
      attachments: comment.attachments || [] // Ensure attachments field exists
    }));

    res.json(commentsWithAttachments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/tickets/:id/comments", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content, attachments } = req.body;

    console.log("=== BACKEND DEBUG ===");
    console.log("Received comment creation request:");
    console.log("Content:", content);
    console.log("Attachments:", attachments);
    console.log("Attachments type:", typeof attachments);
    console.log("Attachments length:", attachments?.length);
    console.log("=====================");

    const user = await UserModel.findById(req.user!._id);

    const commentData = {
      ticketId: req.params.id,
      userId: req.user!._id,
      userName: user?.name,
      userRole: user?.role,
      content,
      attachments: attachments || [], // Ensure it's always an array
    };

    console.log("Creating comment with data:", commentData);

    const comment = await CommentModel.create(commentData);

    console.log("Comment created successfully:", comment);
    console.log("=====================");

    res.json(comment);
  } catch (error: any) {
    console.error("Error creating comment:", error);
    res.status(500).json({ message: error.message });
  }
});
  app.get("/api/analytics/metrics", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
      const tickets = await TicketModel.find();

      const metrics = {
        total: tickets.length,
        open: tickets.filter((t) => t.status === TicketStatus.OPEN).length,
        inProgress: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        resolved: tickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
        closed: tickets.filter((t) => t.status === TicketStatus.CLOSED).length,
        byPriority: {
          high: tickets.filter((t) => t.priority === TicketPriority.HIGH).length,
          medium: tickets.filter((t) => t.priority === TicketPriority.MEDIUM).length,
          low: tickets.filter((t) => t.priority === TicketPriority.LOW).length,
        },
        byCategory: {
          hardware: tickets.filter((t) => t.category === "hardware").length,
          software: tickets.filter((t) => t.category === "software").length,
          network: tickets.filter((t) => t.category === "network").length,
          other: tickets.filter((t) => t.category === "other").length,
        },
        avgResolutionTime: 0,
      };

      const resolvedTickets = tickets.filter((t) => t.resolvedAt);
      if (resolvedTickets.length > 0) {
        const totalTime = resolvedTickets.reduce((sum, t) => {
          const diff = t.resolvedAt!.getTime() - t.createdAt.getTime();
          return sum + diff;
        }, 0);
        metrics.avgResolutionTime = Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60));
      }

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/employee-performance", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
      const employees = await UserModel.find({ role: UserRole.EMPLOYEE });
      const performance = await Promise.all(
        employees.map(async (emp) => {
          const tickets = await TicketModel.find({ assignedTo: emp._id.toString() });
          const completed = tickets.filter(
            (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
          );
          const inProgress = tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS);

          let avgResolutionTime = 0;
          if (completed.length > 0) {
            const resolvedTickets = completed.filter((t) => t.resolvedAt);
            if (resolvedTickets.length > 0) {
              const totalTime = resolvedTickets.reduce((sum, t) => {
                const diff = t.resolvedAt!.getTime() - t.createdAt.getTime();
                return sum + diff;
              }, 0);
              avgResolutionTime = Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60));
            }
          }

          return {
            employeeId: emp._id.toString(),
            employeeName: emp.name,
            totalAssigned: tickets.length,
            completed: completed.length,
            inProgress: inProgress.length,
            avgResolutionTime,
          };
        })
      );

      performance.sort((a, b) => b.completed - a.completed);

      res.json(performance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  //mail service test 


// Test Vertifit email configuration
app.post("/api/admin/test-email", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    console.log('🧪 Testing Vertifit email configuration...');
    
    const result = await vertifitEmailService.sendTestEmail(testEmail);
    
    res.json({
      success: result.success,
      message: result.success 
        ? 'Test email sent successfully! Check support@vertifitsolutions.com inbox.' 
        : `Failed to send test email: ${result.error}`
    });
  } catch (error: any) {
    console.error('❌ Email test error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Send welcome email to new users
app.post("/api/admin/send-welcome-email", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const { userId, temporaryPassword } = req.body;
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">Welcome to Vertifit Service Desk</h1>
        </div>
        <div style="background: white; padding: 30px;">
          <h2>Hello ${user.name},</h2>
          <p>Your ${user.role} account has been created successfully.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0;">Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Password:</strong> ${temporaryPassword}</p>
            <p><strong>Login URL:</strong> <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
          </div>
          
          <p>Please log in and change your password after first login.</p>
        </div>
      </div>
    `;

    const success = await vertifitEmailService.sendEmail({
      to: user.email,
      subject: `Welcome to Vertifit Service Desk - Your ${user.role} Account`,
      html: emailHtml,
      text: `Welcome to Vertifit Service Desk! Your ${user.role} account has been created. Email: ${user.email}, Password: ${temporaryPassword}, Login: ${process.env.APP_URL}`
    });

    res.json({
      success,
      message: success 
        ? `Welcome email sent to ${user.email}` 
        : `Failed to send email to ${user.email}`
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});
  const httpServer = createServer(app);

  return httpServer;
}
