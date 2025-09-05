const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, ...paths);

const app = require(fromRoot("app"));
const settings = require(fromRoot("settings"));
// const app = require("./app");
// const settings = require("./settings");
const mongoose = require("mongoose");
require("dotenv").config();

(async () => {
  await mongoose.connect(settings.mongoURI);
  console.log("mongo db connected");
})();

app.listen(settings.port, () => {
  console.log(`server is running on port ${settings.port}`);
});
