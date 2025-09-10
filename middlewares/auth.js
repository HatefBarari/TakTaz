const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, "..", ...paths);

const jwt = require("jsonwebtoken");
const userModel = require(fromRoot("models", "user"));
// const userModel = require("./../models/user");

module.exports = async (req, res, next) => {
  const countOfUsers = await userModel.estimatedDocumentCount();
  if (countOfUsers === 0) {
    return next();
  }

  const token = req.cookies?.token; // ← دریافت توکن از کوکی با نام "token"

  if (!token) {
    return res.status(401).json({
      message: "This route is protected and can't have access to it !!!",
    });
  }

  try {
    const jwtPayload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(jwtPayload.id).lean();

    if (!user) {
      return res.status(401).json({
        message: "User not found. Your credentials are invalid or expired.",
      });
    }

    Reflect.deleteProperty(user, "password");
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
      details: error.message,
    });
  }
};

// module.exports = async (req, res, next) => {
//   const countOfUsers = await userModel.estimatedDocumentCount();
//   if (countOfUsers === 0) {
//     return next();
//   }

//   const authHeader = req.header("Authorization")?.split(" ");
//   if (authHeader?.length !== 2) {
//     return res.status(401).json({
//       message: "This route is protected and can't have access to it !!!",
//     });
//   }

//   const token = authHeader[1];
//   try {
//     const jwtPayload = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await userModel.findById(jwtPayload.id).lean();

//     if (!user) {
//       return res.status(401).json({
//         message: "User not found. Your credentials are invalid or expired.",
//       });
//     }

//     Reflect.deleteProperty(user, "password");
//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(401).json({
//       message: "Invalid or expired token.",
//       details: error.message,
//     });
//   }
// };
