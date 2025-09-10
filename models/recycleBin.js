const mongoose = require("mongoose");

const recycleBinSchema = new mongoose.Schema(
  {
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    collectionName: {
      type: String,
      required: true,
      enum: ["Order"],
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RecycleBin", recycleBinSchema);
