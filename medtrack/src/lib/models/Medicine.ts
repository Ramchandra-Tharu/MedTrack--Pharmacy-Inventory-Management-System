import { Schema, model, models } from "mongoose";

const MedicineSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    genericName: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    manufacturer: {
      type: String,
      trim: true,
    },

    prescriptionRequired: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

export const Medicine =
  models.Medicine || model("Medicine", MedicineSchema);