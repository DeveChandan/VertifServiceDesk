import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { UserModel } from "./models/user.model";
import { TicketModel } from "./models/ticket.model";
import { CommentModel } from "./models/comment.model";
import { authenticateToken, authorizeRoles, generateToken, AuthRequest } from "./middleware/auth";
import { UserRole, TicketStatus, TicketPriority } from "@shared/schema";
import { connectDB } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  await connectDB();

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, role, phone, department, skills } = req.body;

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
        department,
        skills,
      });

      const token = generateToken({
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      const userResponse = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        skills: user.skills,
        createdAt: user.createdAt,
      };

      res.json({ user: userResponse, token });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken({
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      const userResponse = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        skills: user.skills,
        createdAt: user.createdAt,
      };

      res.json({ user: userResponse, token });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/employees", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
      const employees = await UserModel.find({ role: UserRole.EMPLOYEE }).select("-password");
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/clients", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
      const clients = await UserModel.find({ role: UserRole.CLIENT }).select("-password");
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
      const { name, email, password, role, phone, department, skills } = req.body;

      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await UserModel.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        department,
        skills,
      });

      const userResponse = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        skills: user.skills,
        createdAt: user.createdAt,
      };

      res.json(userResponse);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
      await UserModel.findByIdAndDelete(req.params.id);
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

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

  app.get("/api/tickets/assigned", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tickets = await TicketModel.find({ assignedTo: req.user!._id }).sort({ createdAt: -1 });
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

  app.patch("/api/tickets/:id/assign", authenticateToken, authorizeRoles(UserRole.ADMIN), async (req, res) => {
    try {
      const { employeeId } = req.body;

      const employee = await UserModel.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const ticket = await TicketModel.findByIdAndUpdate(
        req.params.id,
        {
          assignedTo: employeeId,
          assignedToName: employee.name,
          status: TicketStatus.IN_PROGRESS,
        },
        { new: true }
      );

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tickets/:id/comments", authenticateToken, async (req, res) => {
    try {
      const comments = await CommentModel.find({ ticketId: req.params.id }).sort({ createdAt: 1 });
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tickets/:id/comments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { content } = req.body;

      const user = await UserModel.findById(req.user!._id);

      const comment = await CommentModel.create({
        ticketId: req.params.id,
        userId: req.user!._id,
        userName: user?.name,
        userRole: user?.role,
        content,
      });

      res.json(comment);
    } catch (error: any) {
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
