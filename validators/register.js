const Validator = require("fastest-validator");

const v = new Validator();

const userSchema = {
  name: {
    type: "string",
    min: 3,
    max: 255,
    empty: false,
  },
  username: {
  type: "string",
  min: 5,
  max: 50,
  empty: false,
  custom: (value, errors) => {
    const regex =
      /^(?:[a-zA-Z0-9._]+|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)$/;

    if (!regex.test(value)) {
      errors.push({
        type: "usernameInvalid",
        actual: value,
        message:
          "نام کاربری باید یک ایمیل معتبر یا ترکیبی از حروف، عدد، نقطه و آندرلاین باشد.",
      });
    }
    return value;
  },
},
  phone: {
    type: "string",
    empty: false,
    pattern: /^(\+98|098|98|0)?9\d{9}$/,
    messages: {
      stringPattern: "Phone number must be a valid Iranian mobile number.",
    },
  },
  password: {
    type: "string",
    min: 6,
    empty: false,
  },
  role: {
    type: "enum",
    values: ["ADMIN", "USER"],
    default: "USER",
  },
  isActive: {
    type: "boolean",
    optional: true,
    default: false,
  },
};

// کامپایلر برای ایجاد یوزر
const checkCreateUser = v.compile(userSchema);

module.exports = checkCreateUser;