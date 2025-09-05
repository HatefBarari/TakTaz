// بارگذاری متغیرها از فایل .env
require("dotenv").config();

// تعیین حالت تولید یا توسعه
const isProduction = process.env.NODE_ENV === "production";

// تنظیمات برنامه بر اساس محیط
const settings = {
  siteUrl: isProduction ? process.env.PROD_SITE_URL : process.env.DEV_SITE_URL,
  mongoURI: isProduction
    ? process.env.PROD_MONGO_URI
    : process.env.DEV_MONGO_URI,
  frontendUrl: isProduction
    ? process.env.PROD_FRONTEND_URL
    : process.env.DEV_FRONTEND_URL,
  errorHandling: {
    showErrors: !isProduction,
  },
  port: Number(isProduction ? process.env.PROD_PORT : process.env.DEV_PORT),
};

// مدیریت خطاها بر اساس محیط
if (isProduction) {
  console.error = () => {};
} else {
  console.error = console._error || console.error;
  console._error = console.error;
}

// صادر کردن تنظیمات برای استفاده در سایر بخش‌های برنامه
module.exports = settings;
