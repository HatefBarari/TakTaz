const express = require("express");
const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, "..", "..", ...paths);

const controller = require(fromRoot("controllers", "v1", "user"));
const isAdminMiddleware = require(fromRoot("middlewares", "isAdmin"));
const authMiddleware = require(fromRoot("middlewares", "auth"));

// const controller = require("./../../controllers/v1/user");
// const authMiddleware = require("./../../middlewares/auth");
// const isAdminMiddleware = require("./../../middlewares/isAdmin");

const router = express.Router();

router.route("/").get(authMiddleware, isAdminMiddleware, controller.getAll);

router
  .route("/:id")
  .delete(authMiddleware, isAdminMiddleware, controller.removeUser)
  .put(authMiddleware, isAdminMiddleware, controller.updateUser);

module.exports = router;
