const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 255,
      set: (v) => v.trim(),
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
    products: {
      type: [String],
      enum: ["concrete", "foam", "joist", "truss"],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "حداقل یکی از محصولات باید انتخاب شود",
      },
    },
    description: {
      type: String,
      maxlength: 5000,
      default: "",
      set: (v) => v.trim(),
    },
    status: {
      type: String,
      enum: ["PENDING", "FOLLOWED"],
      default: "PENDING",
    },
    deletedBySales: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
