const express = require("express");
const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, "..", "..", ...paths);

const controller = require(fromRoot("controllers", "v1", "auth"));
const isAdminMiddleware = require(fromRoot("middlewares", "isAdmin"));
const authMiddleware = require(fromRoot("middlewares", "auth"));
const loginRateLimiterMiddleware = require(fromRoot(
  "middlewares",
  "loginRateLimiter"
));
// const controller = require("./../../controllers/v1/auth");
// const isAdminMiddleware = require("./../../middlewares/isAdmin");
// const authMiddleware = require("./../../middlewares/auth");
// const loginRateLimiterMiddleware = require("./../../middlewares/loginRateLimiter");
const router = express.Router();

router.post(
  "/register",
  authMiddleware,
  isAdminMiddleware,
  controller.register
);
router.post("/login", loginRateLimiterMiddleware, controller.login);
router.post("/logout" , authMiddleware, controller.logout)
router.get("/me", authMiddleware, controller.getMe);
router.get("/check-user", authMiddleware, controller.authenticateToken);
router.get("/check-user-exist", controller.existUserOne);

module.exports = router;
