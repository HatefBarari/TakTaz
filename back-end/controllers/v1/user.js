const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, "..", "..", ...paths);

const userModel = require(fromRoot("models", "user"));
// const userModel = require("./../../models/user");
const bcrypt = require("bcrypt");
const { isValidObjectId } = require("mongoose");

exports.getAll = async (req, res) => {
  try {
    const users = await userModel.find({}).lean();
    const usersWithoutPassword = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    return res.status(200).json(usersWithoutPassword);
  } catch (error) {
    return next(error);
  }
};

exports.removeUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(409).json({
        message: "User ID is not valid",
      });
    }
    const removedUser = await userModel.findByIdAndDelete({ _id: id });
    if (!removedUser) {
      return res.status(404).json({
        message: "There is no user !!",
      });
    }
    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const updaterId = req.user._id; // کسی که درخواست آپدیت را ارسال کرده
    const targetUserId = req.params.id; // کسی که باید آپدیت شود
    if (!isValidObjectId(targetUserId)) {
      return res.status(409).json({
        message: "User ID is not valid",
      });
    }
    // بررسی اینکه کاربر درخواست‌دهنده ادمین است یا نه
    const requester = await userModel.findById(updaterId).lean();
    if (!requester || requester.role !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied. Only admins can update users.",
      });
    }

    // پیدا کردن کاربری که باید آپدیت شود
    const targetUser = await userModel.findById(targetUserId).lean();
    if (!targetUser) {
      return res.status(404).json({
        message: "User to update not found.",
      });
    }

    const { name, username, phone, role, password } = req.body;

    // جلوگیری از حذف آخرین ادمین
    if (role && targetUser.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await userModel.countDocuments({ role: "ADMIN" });
      if (adminCount === 1) {
        return res.status(400).json({
          message:
            "Cannot change role. At least one admin must remain in the system.",
        });
      }
    }

    let hashedPassword = targetUser.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const updatedFields = {
      name: name ?? targetUser.name,
      username: username ?? targetUser.username,
      phone: phone ?? targetUser.phone,
      role: role ?? targetUser.role,
      password: hashedPassword,
    };

    const updatedUser = await userModel
      .findByIdAndUpdate(targetUserId, updatedFields, { new: true })
      .select("-password")
      .lean();

    if (!updatedUser) {
      return res.status(400).json({ message: "User update failed !!" });
    }

    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    return next(error);
  }
};
