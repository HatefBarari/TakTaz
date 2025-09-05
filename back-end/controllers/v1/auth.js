const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, "..", "..", ...paths);

const userModel = require(fromRoot("models", "user"));
const registerValidator = require(fromRoot("validators", "register"));
// const userModel = require("./../../models/user");
// const registerValidator = require("./../../validators/register");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { error } = require("console");

exports.register = async (req, res, next) => {
  try {
    const validationResult = registerValidator(req.body);
    if (validationResult !== true) {
      return res.status(422).json(validationResult);
    }
    const { name, username, phone, password } = req.body;
    const isUserExist = await userModel.findOne({
      $or: [{ username }, { phone }],
    });
    if (isUserExist) {
      return res.status(409).json({
        message: "username or phone is duplicated",
      });
    }
    const countOfUsers = await userModel.estimatedDocumentCount();

    const hashedPassword = await bcrypt.hash(password, 10);

    await userModel.create({
      name,
      username,
      phone,
      password: hashedPassword,
      role: countOfUsers > 0 ? "USER" : "ADMIN",
    });

    return res.status(201).json({ message: "user created is successfully" });
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    let { username, password } = req.body;

    // حذف فاصله‌ها و تبدیل به حروف کوچک
    username = username.trim().toLowerCase();

    const user = await userModel.findOne({ username });
    if (!user) {
      return res
        .status(401)
        .json({ message: "There is no user with that username." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Password is not valid !!" });
    }

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    await userModel.updateOne({ _id: user._id }, { isActive: true });

    // قرار دادن توکن در کوکی با HttpOnly و Secure فعال
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: true,
      // secure: process.env.NODE_ENV === "production", // فقط در محیط پروداکشن secure فعال باشه
      maxAge: 30 * 24 * 60 * 60 * 1000, // ۷ روز به میلی‌ثانیه
      sameSite: "none", // برای امنیت بهتر
    });

    return res.status(200).json({ message: "Login successful" });
  } catch (error) {
    return next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // غیرفعال کردن کاربر
    await userModel.updateOne({ _id: userId }, { isActive: false });
    // حذف کوکی توکن
    res.cookie("token", "", {
      httpOnly: true,
      secure: true,
      // secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      sameSite: "strict",
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return next(error);
  }
};

exports.authenticateToken = async (req, res, next) => {
  try {
    // بررسی اینکه req.user و req.user._id تعریف شده‌اند یا نه
    if (!req.user || !req.user._id) {
      return res.status(404).json({ exists: false, message: "User not found" });
    }

    const user = await userModel.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ exists: false, message: "User not found" });
    }

    return res.status(200).json({ exists: true });
  } catch (error) {
    return next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await userModel
      .findById(req.user._id)
      .select("-password")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: user });
  } catch (error) {
    return next(error);
  }
};

exports.existUserOne = async (req, res, next) => {
  try {
    const userCount = await userModel.estimatedDocumentCount();

    return res.status(200).json({ isExist: userCount > 0 });
  } catch (error) {
    return next(error);
  }
};
