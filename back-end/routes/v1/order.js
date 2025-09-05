const express = require("express");
const path = require("path");
const fromRoot = (...paths) => path.join(__dirname, "..", "..", ...paths);

const controller = require(fromRoot("controllers", "v1", "order"));
const authMiddleware = require(fromRoot("middlewares", "auth"));

// const controller = require("./../../controllers/v1/order");
// const authMiddleware = require("./../../middlewares/auth");

const router = express.Router();

router
  .route("/")
  .post(controller.createOrder)
  .get(authMiddleware, controller.getAll);
// http://localhost:8001/api/orders
// http://localhost:8001/api/orders?page=2&limit=5

router
  .route("/:id")
  .delete(authMiddleware, controller.removeOrder)
  .put(authMiddleware, controller.updateOrder);

router.route("/status/:id").put(authMiddleware, controller.toggleOrderStatus);

router.route("/restore").get(authMiddleware, controller.getAllDeletedOrders);
router.route("/restore/:id").delete(authMiddleware, controller.restoreOrder);

router.route("/filter").get(authMiddleware, controller.getFilteredOrders);

// http://localhost:8001/api/orders/filter?search=0912&status=FOLLOWED&products=joist&products=truss&page=2&limit=5


module.exports = router;
