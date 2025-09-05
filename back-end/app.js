const express = require("express");
const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, ...paths);

const settings = require(fromRoot("settings"));
const authRoutes = require(fromRoot("routes", "v1", "auth"));
const usersRouter = require(fromRoot("routes", "v1", "user"));
const ordersRouter = require(fromRoot("routes", "v1", "order"));

// const settings = require("./settings");
// const authRoutes = require("./routes/v1/auth");
// const usersRouter = require("./routes/v1/user");
// const ordersRouter = require("./routes/v1/order");

const cors = require("cors");

const bodyParser = require("body-parser");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: settings.frontendUrl, // آدرس دقیق فرانت‌اند
    credentials: true, // اجازه ارسال کوکی‌ها و هدرهای احراز هویت
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRouter);
app.use("/api/orders", ordersRouter);

app.use((req, res) => {
  return res.status(404).json({
    error: {
      type: "Not Found",
      message: "404 API Not Found !!!",
    },
  });
});

app.use((err, req, res, next) => {
  // چاپ استک خطا در کنسول برای هر دو حالت
  console.error(err.stack);

  // نمایش پیام خطا بر اساس محیط
  const response = {
    message: settings.errorHandling.showErrors
      ? err.message
      : "Internal Server Error",
  };

  res.status(err.status || 500).json(response);
});

module.exports = app;
