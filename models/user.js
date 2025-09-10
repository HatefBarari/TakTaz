const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 255,
      set: (v) => v?.trim() || "",
    },
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 5,
      maxlength: 50,
      set: (v) => (v ? v.trim().toLowerCase().replace(/\s+/g, "") : ""),
      match: [
        /^(?:[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+|[a-zA-Z0-9._]+)$/,
        "نام کاربری باید یک ایمیل معتبر یا شامل فقط حروف، عدد، نقطه یا آندرلاین باشد.",
      ],
    },
    phone: {
      type: String,
      required: true,
      match: [/^09\d{9}$/, "Please enter a valid phone number"],
      set: (v) => {
      if (typeof v !== "string") return v;

       // حذف تمام کاراکترهای غیرعددی (فاصله، خط تیره، پرانتز، +، ...)
      let phone = v.replace(/[^\d+]/g, "").trim();

       // اگر با +98 شروع شده
      if (phone.startsWith("+98")) {
        phone = "0" + phone.slice(3);
      }

       // اگر با 98 شروع شده
      else if (phone.startsWith("98")) {
        phone = "0" + phone.slice(2);
      }

       // اگر با 098 شروع شده
      else if (phone.startsWith("098")) {
        phone = "0" + phone.slice(3);
      }

       // اگر با 9 شروع شده (بدون صفر)
      else if (phone.startsWith("9")) {
        phone = "0" + phone;
      }

        return phone;
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      set: (v) => (v ? v.trim().replace(/\s+/g, "") : ""),
    },
    role: {
      type: String,
      enum: ["ADMIN", "USER"],
      default: "USER",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// تبدیل username به lowercase و حذف فاصله‌ها در آپدیت‌ها هم
schema.pre("save", function (next) {
  if (this.username) {
    this.username = this.username.toLowerCase().replace(/\s+/g, "");
  }
  next();
});

schema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  const update = this.getUpdate();

  if (update.username) {
    update.username = update.username.trim().toLowerCase().replace(/\s+/g, "");
    this.setUpdate(update);
  } else if (update.$set && update.$set.username) {
    update.$set.username = update.$set.username
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  // اگر خواستی می‌تونیم همین کار رو برای password هم بکنیم (بسته به اینکه در آپدیت‌ها چطوری پاسورد میاد)
  if (update.password) {
    update.password = update.password.trim().replace(/\s+/g, "");
    this.setUpdate(update);
  } else if (update.$set && update.$set.password) {
    update.$set.password = update.$set.password.trim().replace(/\s+/g, "");
  }

  next();
});

const User = mongoose.model("User", schema);

module.exports = User;
