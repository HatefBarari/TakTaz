const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, "..", "..", ...paths);

const orderModel = require(fromRoot("models", "order"));
const recycleBin = require(fromRoot("models", "recycleBin"));
const orderValidator = require(fromRoot("validators", "order"));
// const orderModel = require("../../models/order");
// const recycleBin = require("../../models/recycleBin");
// const orderValidator = require("../../validators/order");
const cron = require("node-cron");

const { isValidObjectId } = require("mongoose");

const productMap = {
  concrete: "بتن",
  foam: "فوم",
  joist: "تیرچه",
  truss: "خرپا",
};

exports.createOrder = async (req, res, next) => {
  try {
    const validationResult = orderValidator(req.body);
    if (validationResult !== true) {
      return res.status(422).json(validationResult);
    }

    let { name, phone, products, description } = req.body;

    // ✅ تبدیل شماره به فرمت استاندارد: 091XXXXXXXXX
    if (typeof phone === "string") {
      phone = phone.trim();

      if (phone.startsWith("+98")) {
        phone = "0" + phone.slice(3);
      } else if (phone.startsWith("098")) {
        phone = "0" + phone.slice(3);
      } else if (phone.startsWith("98")) {
        phone = "0" + phone.slice(2);
      } else if (phone.startsWith("9")) {
        phone = "0" + phone;
      }

      req.body.phone = phone; // مهم که در req.body هم اصلاح بشه
    }

    // جستجو سفارش فعال با شماره و نام
    const existingOrder = await orderModel.findOne({
      phone,
      deletedBySales: false,
      status: "PENDING",
    });

    // اگر سفارش فعال پیدا شد
    if (existingOrder) {
      if (existingOrder.name === name) {
        // بررسی اینکه محصولات کاملاً برابرند
        const sameProducts =
          products.length === existingOrder.products.length &&
          products.every((p) => existingOrder.products.includes(p));

        if (sameProducts) {
          return res.status(200).json({
            message:
              "شما قبلاً این درخواست را با همین محصولات ثبت کرده‌اید. لطفاً منتظر بمانید تا مدیر فروش مجموعه با شما تماس بگیرد.",
            orderId: existingOrder._id,
          });
        }

        // محصولات جدید را با قبلی ترکیب و یکتا کن
        const combinedProducts = Array.from(
          new Set([...existingOrder.products, ...products])
        );

        existingOrder.products = combinedProducts;
        await existingOrder.save();

        const productsFa = combinedProducts
          .map((p) => productMap[p])
          .join("، ");

        return res.status(200).json({
          message: `شما قبلاً یک درخواست ثبت کرده‌اید. محصولات ${productsFa} به سفارش شما اضافه شد. لطفاً منتظر بمانید تا مدیر فروش مجموعه با شما تماس بگیرد.`,
          orderId: existingOrder._id,
        });
      } else {
        // نام متفاوت اما شماره یکسان و سفارش در انتظار => ثبت نشود
        return res.status(400).json({
          message:
            "یک سفارش در حال انتظار با همین شماره تلفن ثبت شده است. لطفاً منتظر بمانید تا مدیر فروش مجموعه با شما تماس بگیرد.",
        });
      }
    }

    // اگر قبلاً سفارشی بوده که پیگیری شده یا اصلاً سفارشی نبوده، سفارش جدید ثبت شود
    const newOrder = await orderModel.create({
      name,
      phone,
      products,
      description,
      status: "PENDING",
      deletedBySales: false,
    });

    const productsFa = products.map((p) => productMap[p]).join("، ");

    return res.status(201).json({
      message:
        "درخواست شما با موفقیت ثبت شد. منتظر باشید مدیر فروش مجموعه با شما تماس بگیرد.",
      orderId: newOrder._id,
      products: productsFa, // اضافه شده معادل فارسی محصولات ثبت شده
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const filter = { deletedBySales: false };

    // دریافت پارامترهای صفحه و لیمیت
    let { page, limit } = req.query;

    let ordersQuery = orderModel.find(filter).sort({ status: -1, createdAt: -1 });

    let pageUsed = false;

    // اگر page و limit داده شده بودن، از پیجینیشن استفاده کن
    if (page !== undefined && limit !== undefined) {
      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;
      ordersQuery = ordersQuery.skip(skip).limit(limit);
      pageUsed = true;
    }

    // اجرای query سفارش‌ها (با یا بدون skip/limit)
    const orders = await ordersQuery;

    // آمار کلی
    const total = await orderModel.countDocuments(filter);
    const followedCount = await orderModel.countDocuments({
      ...filter,
      status: "FOLLOWED",
    });
    const pendingCount = await orderModel.countDocuments({
      ...filter,
      status: "PENDING",
    });

    // شمارش محصولات
    const productCounts = await orderModel.aggregate([
      { $match: filter },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalProducts = productCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      data: orders,
      total,
      followedCount,
      pendingCount,
      totalProducts,
      ...(pageUsed && {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }),
    });
  } catch (err) {
    res.status(500).json({
      error: "خطا در دریافت سفارش‌ها",
      details: err.message,
    });
    return next(err);
  }
};

exports.getAllDeletedOrders = async (req, res, next) => {
  try {
    // دریافت آیتم‌های سطل زباله مربوط به سفارش‌ها
    const deletedItems = await recycleBin.find({ collectionName: "Order" });

    // ساخت Map برای نگاشت refId (شناسه سفارش) به _id (شناسه سطل زباله)
    const recycleMap = {};
    deletedItems.forEach((item) => {
      recycleMap[item.refId.toString()] = item._id;
    });

    const deletedOrderIds = deletedItems.map((item) => item.refId);

    // دریافت سفارش‌ها
    const orders = await orderModel
      .find({ _id: { $in: deletedOrderIds } })
      .sort({ status: -1, createdAt: -1 });

    // اضافه کردن recycleBinId به هر سفارش
    const ordersWithRecycleId = orders.map((order) => ({
      recycleBinId: recycleMap[order._id.toString()],
      ...order.toObject(),
    }));

    const total = orders.length;
    const followedCount = orders.filter(
      (order) => order.status === "FOLLOWED"
    ).length;
    const pendingCount = orders.filter(
      (order) => order.status === "PENDING"
    ).length;

    // شمارش محصولات داخل سفارش‌های حذف‌شده
    const productCounts = await orderModel.aggregate([
      { $match: { _id: { $in: deletedOrderIds } } },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalProducts = productCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      data: ordersWithRecycleId,
      total,
      followedCount,
      pendingCount,
      totalProducts,
    });
  } catch (err) {
    res.status(500).json({
      error: "خطا در دریافت سفارش‌های حذف‌شده",
      details: err.message,
    });
    return next(err);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(409).json({
        message: "شناسه سفارش معتبر نیست",
      });
    }

    const allowedFields = ["name", "phone", "products", "description"];
    const updates = {};

    for (let key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "هیچ فیلدی برای بروزرسانی ارسال نشده است",
      });
    }

    // اگر شماره تلفن جدید ارسال شده است، بررسی تکراری نبودن آن در سفارش‌های دیگر با وضعیت PENDING
    if (updates.phone) {
      // اصلاح شماره تلفن به فرمت استاندارد (مثل کدی که در createOrder دارید)
      let phone = updates.phone.trim();
      if (phone.startsWith("+98")) {
        phone = "0" + phone.slice(3);
      } else if (phone.startsWith("098")) {
        phone = "0" + phone.slice(3);
      } else if (phone.startsWith("98")) {
        phone = "0" + phone.slice(2);
      } else if (phone.startsWith("9")) {
        phone = "0" + phone;
      }
      updates.phone = phone;

      // جستجو سفارش دیگری با همان شماره و وضعیت PENDING و غیر از این سفارش
      const existingOrder = await orderModel.findOne({
        phone: updates.phone,
        status: "PENDING",
        _id: { $ne: id },
        deletedBySales: false,
      });

      if (existingOrder) {
        return res.status(400).json({
          message:
            "شماره تلفن وارد شده قبلا برای سفارش دیگری با وضعیت در حال انتظار استفاده شده است.",
        });
      }
    }

    const updatedOrder = await orderModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedOrder) {
      return res.status(404).json({ error: "سفارش مورد نظر پیدا نشد" });
    }

    res.status(200).json({
      message: "سفارش با موفقیت بروزرسانی شد",
      data: updatedOrder,
    });
  } catch (err) {
    res.status(500).json({
      error: "خطا در بروزرسانی سفارش",
      details: err.message,
    });
    return next(err);
  }
};

exports.removeOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    // بررسی اعتبار شناسه
    if (!isValidObjectId(id)) {
      return res.status(409).json({ message: "شناسه سفارش معتبر نیست" });
    }

    // بررسی وجود سفارش
    const order = await orderModel.findById(id);
    if (!order) {
      return res.status(404).json({ error: "سفارش پیدا نشد" });
    }

    // بررسی وجود در سطل زباله
    const existingInBin = await recycleBin.findOne({ refId: id });
    if (existingInBin) {
      return res
        .status(409)
        .json({ message: "این سفارش قبلاً به سطل زباله منتقل شده است" });
    }

    // علامت‌گذاری سفارش به عنوان حذف‌شده
    await orderModel.findByIdAndUpdate(
      id,
      { deletedBySales: true },
      { new: true }
    );

    // افزودن به سطل زباله
    await recycleBin.create({
      refId: order._id,
      collectionName: "Order",
      reason: req.body.reason || "",
      deletedAt: new Date(),
    });

    res.status(200).json({
      message: "سفارش به سطل زباله منتقل شد",
    });
  } catch (err) {
    res.status(500).json({
      error: "خطا در حذف سفارش",
      details: err.message,
    });
    return next(err);
  }
};

exports.restoreOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(409).json({
        message: "شناسه سفارش معتبر نیست",
      });
    }

    // حذف از سطل زباله و دریافت داده‌های مربوط به سفارش
    const item = await recycleBin.findOneAndDelete({ _id: id });

    if (!item) {
      return res.status(404).json({ error: "سفارش در سطل زباله پیدا نشد" });
    }

    // بازیابی سفارش
    const restoredOrder = await orderModel.findOneAndUpdate(
      { _id: item.refId },
      { deletedBySales: false },
      { new: true }
    );

    if (!restoredOrder) {
      return res.status(404).json({ error: "سفارش برای بازیابی پیدا نشد" });
    }

    res.status(200).json({
      message: "سفارش با موفقیت بازیابی شد",
      data: restoredOrder,
    });
  } catch (err) {
    res.status(500).json({
      error: "خطا در بازیابی سفارش",
      details: err.message,
    });
    next(err);
  }
};

exports.getFilteredOrders = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let { products } = req.query; // page و limit را از اینجا حذف می‌کنیم تا default نشوند

    const filter = { deletedBySales: false };

    // فیلتر براساس جستجو در نام یا شماره تلفن
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // فیلتر براساس وضعیت سفارش
    if (status) {
      const allowedStatuses = ["PENDING", "FOLLOWED"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "وضعیت نامعتبر است" });
      }
      filter.status = status;
    }

    // فیلتر براساس محصولات
    if (products) {
      if (typeof products === "string") {
        products = [products];
      }
      const allowedProducts = ["concrete", "foam", "joist", "truss"];
      const invalidProducts = products.filter(
        (p) => !allowedProducts.includes(p)
      );
      if (invalidProducts.length > 0) {
        return res
          .status(400)
          .json({ error: "نام محصول یا محصولات معتبر نیست" });
      }
      filter.products = { $in: products };
    }

    // شمارش کل نتایج بدون اعمال limit/skip (این همیشه کل تعداد را برمی‌گرداند)
    const total = await orderModel.countDocuments(filter);
    const followedCount = await orderModel.countDocuments({
      ...filter,
      status: "FOLLOWED",
    });
    const pendingCount = await orderModel.countDocuments({
      ...filter,
      status: "PENDING",
    });

    let ordersQuery = orderModel.find(filter).sort({ status: -1, createdAt: -1 });

    let page = 1; // مقدار پیش‌فرض برای پاسخ
    let limit = total; // مقدار پیش‌فرض برای پاسخ (همه داده‌ها)
    let totalPages = 1; // مقدار پیش‌فرض برای پاسخ (همه در یک صفحه)

    // ********** منطق جدید برای اعمال pagination **********
    if (req.query.page && req.query.limit) {
      page = parseInt(req.query.page);
      limit = parseInt(req.query.limit);

      // اطمینان از اینکه page و limit اعداد معتبر هستند
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1) limit = 10; // می‌توانید یک limit پیش‌فرض مناسب را اینجا بگذارید

      ordersQuery = ordersQuery
        .skip((page - 1) * limit)
        .limit(limit);

      totalPages = Math.ceil(total / limit);
    }
    // اگر req.query.page یا req.query.limit وجود نداشته باشند،
    // ordersQuery بدون .skip() و .limit() اجرا می‌شود،
    // که به معنای بازگرداندن تمام نتایج است.
    // و page=1, limit=total, totalPages=1 که در بالا مقداردهی شد، در پاسخ ارسال می‌شود.
    // ******************************************************

    const orders = await ordersQuery.exec(); // اجرای کوئری

    res.status(200).json({
      data: orders,
      total,
      page, // این page یا صفحه درخواستی خواهد بود یا 1 اگر pagination نبود
      limit, // این limit یا limit درخواستی خواهد بود یا total اگر pagination نبود
      totalPages, // این totalPages یا محاسبه شده خواهد بود یا 1 اگر pagination نبود
      followedCount,
      pendingCount,
    });
  } catch (err) {
    console.error("Error in getFilteredOrders:", err); // برای لاگ بهتر ارور
    res.status(500).json({
      error: "خطا در دریافت سفارش‌ها",
      details: err.message,
    });
    // return next(err); // اگر اینجا پاسخ را ارسال می‌کنید، دیگر نیازی به next(err) نیست
  }
};

exports.toggleOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(409).json({
        message: "شناسه سفارش معتبر نیست",
      });
    }

    const order = await orderModel.findById(id);

    if (!order) {
      return res.status(404).json({
        error: "سفارش مورد نظر پیدا نشد",
      });
    }

    const statuses = ["PENDING", "FOLLOWED"];

    const currentIndex = statuses.indexOf(order.status);
    const nextIndex = (currentIndex + 1) % statuses.length;

    order.status = statuses[nextIndex];

    await order.save();

    res.status(200).json({
      message: "وضعیت سفارش با موفقیت تغییر کرد",
      data: order,
    });
  } catch (err) {
    res.status(500).json({
      error: "خطا در تغییر وضعیت سفارش",
      details: err.message,
    });
    return next(err);
  }
};

// اجرای روزانه در ساعت 12 بامداد
cron.schedule("0 0 * * *", async () => {
  console.log("✅ در حال اجرای پاکسازی سطل زباله...");

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  try {
    const expiredItems = await recycleBin.find({
      deletedAt: { $lte: oneMonthAgo },
    });

    const idsToDelete = expiredItems.map((item) => item.refId);

    // حذف دائمی سفارش‌ها
    await orderModel.deleteMany({ _id: { $in: idsToDelete } });

    // حذف رکوردهای سطل زباله
    await recycleBin.deleteMany({ refId: { $in: idsToDelete } });

    console.log(`🧹 ${idsToDelete.length} سفارش منقضی پاک شدند.`);
  } catch (err) {
    console.error("❌ خطا در پاکسازی سطل زباله:", err.message);
  }
});
