const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, "..", ...paths);

const userModel = require(fromRoot("models", "user"));

// const userModel = require("./../models/user");
module.exports = async (req, res, next) => {
  const countOfUsers = await userModel.estimatedDocumentCount();
  if (countOfUsers == 0) {
    return next();
  }
  const isAdmin = req.user.role === "ADMIN";
  if (isAdmin) {
    return next();
  }
  return res.status(403).json({
    message: "This route is accessible only for admin !!",
  });
};
