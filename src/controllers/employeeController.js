import { db } from "../config/firebase.js";
import bcrypt from "bcryptjs";
import { recordActivity } from "../utils/logger.js";

// GET /api/employees
export const getEmployees = async (req, res, next) => {
  try {
    const snap = await db.collection("users").where("role", "==", "employee").get();
    let employees = [];

    snap.forEach((doc) => {
      const data = doc.data();
      delete data.password; // Do not return password hash
      employees.push({ _id: doc.id, id: doc.id, ...data });
    });

    employees.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
      success: true,
      employees,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/employees
export const createEmployee = async (req, res, next) => {
  try {
    const { name, username, password, email } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, username, and password are required.",
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if username already exists in Firestore
    const existingSnap = await db
      .collection("users")
      .where("username", "==", cleanUsername)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return res.status(400).json({
        success: false,
        message: `Username "${cleanUsername}" is already taken. Please choose another.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employeeData = {
      name: name.trim(),
      username: cleanUsername,
      email: email ? email.trim().toLowerCase() : "",
      password: hashedPassword,
      role: "employee",
      status: "active",
      handleBy: req.user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("users").add(employeeData);

    await recordActivity(
      req,
      `Created employee account: ${employeeData.name} (@${employeeData.username})`
    );

    res.status(201).json({
      success: true,
      message: `Employee ${employeeData.name} created successfully in Health Gym!`,
      employee: {
        _id: docRef.id,
        id: docRef.id,
        name: employeeData.name,
        username: employeeData.username,
        email: employeeData.email,
        role: employeeData.role,
        status: employeeData.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/employees/:id
export const updateEmployee = async (req, res, next) => {
  try {
    const { name, username, password, status, email } = req.body;
    const ref = db.collection("users").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const current = doc.data();
    const updateData = {
      name: name ? name.trim() : current.name,
      email: email !== undefined ? email.trim().toLowerCase() : current.email,
      status: status || current.status,
      updatedAt: new Date().toISOString(),
      handleBy: req.user.name,
    };

    if (username) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername !== current.username) {
        const existSnap = await db
          .collection("users")
          .where("username", "==", cleanUsername)
          .limit(1)
          .get();
        if (!existSnap.empty) {
          return res.status(400).json({
            success: false,
            message: `Username "${cleanUsername}" is already taken.`,
          });
        }
        updateData.username = cleanUsername;
      }
    }

    if (password && password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    await ref.update(updateData);

    await recordActivity(
      req,
      `Updated employee account: ${updateData.name || current.name}`
    );

    res.json({
      success: true,
      message: "Employee account updated successfully",
      employee: {
        _id: doc.id,
        id: doc.id,
        name: updateData.name || current.name,
        username: updateData.username || current.username,
        email: updateData.email || current.email,
        status: updateData.status || current.status,
        role: "employee",
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/employees/:id
export const deleteEmployee = async (req, res, next) => {
  try {
    const ref = db.collection("users").doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const emp = doc.data();
    await ref.delete();

    await recordActivity(req, `Deleted employee account: ${emp.name} (@${emp.username})`);

    res.json({
      success: true,
      message: `Employee ${emp.name} was removed from Health Gym`,
    });
  } catch (error) {
    next(error);
  }
};
