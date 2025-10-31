import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: UserRole;
    companyCode?: string;
  };
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // ✅ Only declare once

  if (!token) {
    console.log('No token provided. Returning 401.');
    return res.status(401).json({ message: "Access token required" });
  }

  console.log('Authenticating token...');
  console.log('Received Authorization header:', authHeader);
  console.log('Token received:', token);
  console.log('Using JWT_SECRET:', JWT_SECRET ? '[SECRET_PRESENT]' : '[SECRET_MISSING]');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      _id: string;
      email: string;
      role: UserRole;
      companyCode?: string;
      iat: number;
      exp: number;
    };
    
    console.log('Token successfully decoded:', decoded);
    
    // Check if token is expired (jwt.verify usually handles this, but good for explicit logging)
    if (decoded.exp * 1000 < Date.now()) {
      console.warn('Token is expired according to decoded.exp');
      return res.status(401).json({ message: "Token expired" });
    }
    
    req.user = decoded;
    next();
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: "Invalid token" });
    } else {
      return res.status(403).json({ message: "Token verification error" });
    }
  }
}

export function authorizeRoles(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

export function generateToken(payload: { _id: string; email: string; role: UserRole; companyCode?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
