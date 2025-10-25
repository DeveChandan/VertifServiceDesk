import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { UserModel } from "./models/user.model";
import { TicketModel } from "./models/ticket.model";
import { CommentModel } from "./models/comment.model";
import { authenticateToken, authorizeRoles, generateToken, AuthRequest } from "./middleware/auth";
import { UserRole, TicketStatus, TicketPriority } from "@shared/schema";
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
  const UPLOADS_FOLDER = path.join(__dirname, "../../uploads");

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
      emergencyContact
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
      isActive: true
    });

    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
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
    });

    const userResponse = getUserResponse(user);

    res.json({ user: userResponse, token });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
    const clients = await UserModel.find({ 
      role: UserRole.CLIENT,
      isActive: true 
    }).select("-password").sort({ createdAt: -1 });
    res.json(clients.map(getUserResponse));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
app.get("/api/users/:id", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(getUserResponse(user));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/users", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = UserRole.EMPLOYEE,
      phone,
      department,
      skills,
      skillsString,
      jobTitle,
      employeeId,
      dateOfBirth,
      address,
      emergencyContact,
      employmentDetails
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

    // Auto-generate employeeId if not provided
    const finalEmployeeId = employeeId || `EMP-${Date.now().toString().slice(-6)}`;

    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      department: department || "General",
      skills: finalSkills,
      jobTitle,
      employeeId: finalEmployeeId,
      dateOfBirth: dob,
      address,
      emergencyContact,
      employmentDetails: normalizedEmploymentDetails,
      isActive: true,
    });

    const userResponse = getUserResponse(user);
    res.json(userResponse);
  } catch (error: any) {
    console.error("Create user error:", error);
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
    updatedAt: user.updatedAt
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
    const { title, description, priority, category, attachments } = req.body;

    const ticketCount = await TicketModel.countDocuments();
    const ticketNumber = `TKT-${String(ticketCount + 1).padStart(5, "0")}`;

    const client = await UserModel.findById(req.user!._id);
    const clientDepartment = client?.department || "General";

    // ✅ Create ticket with client's department
    const ticketData: any = {
      ticketNumber,
      title,
      description,
      priority,
      category,
      department: clientDepartment,
      status: TicketStatus.OPEN,
      clientId: req.user!._id,
      clientName: client?.name,
      attachments,
      assignedEmployees: [], // Will be populated if auto-assigned
    };

    // ✅ Auto-assignment logic for multiple employees
    const availableEmployees = await UserModel.find({ 
      role: UserRole.EMPLOYEE,
      department: clientDepartment
    });

    if (availableEmployees.length > 0) {
      // Check workload for all employees using the new assignedEmployees field
      const employeesWithWorkload = await Promise.all(
        availableEmployees.map(async (employee) => {
          const activeTicketCount = await TicketModel.countDocuments({
            "assignedEmployees.employeeId": employee._id.toString(),
            status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
          });
          return {
            employee,
            activeTicketCount,
            isAvailable: activeTicketCount < 3
          };
        })
      );

      // Get available employees
      const availableEmployeesList = employeesWithWorkload
        .filter(emp => emp.isAvailable)
        .sort((a, b) => a.activeTicketCount - b.activeTicketCount)
        .slice(0, 2); // Take max 2 employees for auto-assignment

      if (availableEmployeesList.length > 0) {
        // Assign multiple employees
        const assignedEmployeesDetails = availableEmployeesList.map((empData, index) => ({
          employeeId: empData.employee._id.toString(),
          employeeName: empData.employee.name,
          assignedAt: new Date(),
          isPrimary: index === 0, // First one is primary
          department: empData.employee.department || clientDepartment
        }));

        // Update ticket data with assignments
        ticketData.assignedEmployees = assignedEmployeesDetails;
        ticketData.status = TicketStatus.IN_PROGRESS;
        
        // For backward compatibility, set the primary assignee
        if (assignedEmployeesDetails.length > 0) {
          ticketData.assignedTo = assignedEmployeesDetails[0].employeeId;
          ticketData.assignedToName = assignedEmployeesDetails[0].employeeName;
        }

        console.log(`✅ Ticket auto-assigned to ${assignedEmployeesDetails.map(emp => emp.employeeName).join(', ')} (Department: ${clientDepartment})`);
      } else {
        console.log(`⚠️ No available employees in ${clientDepartment} department`);
      }
    } else {
      console.log(`⚠️ No employees found in ${clientDepartment} department`);
    }

    const ticket = await TicketModel.create(ticketData);
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
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

app.get("/api/tickets/:id", authenticateToken, async (req, res) => {
  try {
    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

  app.patch("/api/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const { status } = req.body;
      const updates: any = { status };

      if (status === TicketStatus.RESOLVED) {
        updates.resolvedAt = new Date();
      } else if (status === TicketStatus.CLOSED) {
        updates.closedAt = new Date();
      }

      const ticket = await TicketModel.findByIdAndUpdate(req.params.id, updates, { new: true });

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

// Assign multiple employees to a ticket
app.patch("/api/tickets/:id/assign", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
  try {
    const { employeeIds } = req.body; // Now accepts array of employee IDs

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
          isAvailable: activeTicketCount < 5 // Max 5 tickets per employee
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
      assignedAt: new Date(),
      isPrimary: index === 0, // First one is primary
      department: employee.department || ticket.department
    }));

    // Update ticket
    ticket.assignedEmployees = assignedEmployeesDetails;
    ticket.assignedTo = assignedEmployeesDetails[0].employeeId; // Primary for compatibility
    ticket.assignedToName = assignedEmployeesDetails[0].employeeName;
    ticket.status = TicketStatus.IN_PROGRESS;

    await ticket.save();

    res.json({
      message: `Ticket assigned to ${assignedEmployeesDetails.map(emp => emp.employeeName).join(', ')}`,
      ticket,
      assignedEmployees: assignedEmployeesDetails
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Add additional employee to ticket
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

    // Add employee to assignment
    const newAssignment = {
      employeeId: employee._id.toString(),
      employeeName: employee.name,
      assignedAt: new Date(),
      isPrimary: false,
      department: employee.department || ticket.department
    };

    if (!ticket.assignedEmployees) {
      ticket.assignedEmployees = [newAssignment];
      // If this is the first assignment, make it primary
      newAssignment.isPrimary = true;
      ticket.assignedTo = newAssignment.employeeId;
      ticket.assignedToName = newAssignment.employeeName;
      ticket.status = TicketStatus.IN_PROGRESS;
    } else {
      ticket.assignedEmployees.push(newAssignment);
    }

    await ticket.save();

    res.json({
      message: `Employee ${employee.name} added to ticket`,
      ticket,
      newAssignment
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Remove employee from ticket
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
    ticket.assignedEmployees.splice(employeeIndex, 1);

    // Update primary assignment if needed
    if (removedEmployee.isPrimary && ticket.assignedEmployees.length > 0) {
      // Make the first remaining employee primary
      ticket.assignedEmployees[0].isPrimary = true;
      ticket.assignedTo = ticket.assignedEmployees[0].employeeId;
      ticket.assignedToName = ticket.assignedEmployees[0].employeeName;
    } else if (ticket.assignedEmployees.length === 0) {
      // No employees left
      ticket.assignedTo = undefined;
      ticket.assignedToName = undefined;
      ticket.status = TicketStatus.OPEN;
    }

    await ticket.save();

    res.json({
      message: `Employee ${removedEmployee.employeeName} removed from ticket`,
      ticket
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
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

  const httpServer = createServer(app);

  return httpServer;
}
