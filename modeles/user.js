const mongoose = require("mongoose");
const mongoose_sanitize = require("mongoose-sanitize");
const unique_validator = require("mongoose-unique-validator");
const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    names: {
      type: String,
      required: true,
      trim: true,
    },
    partition: {
      type: String,
      required: true,
      trim: true,
    },
    instrument: {
      type: String,
      required: true,
      trim: true,
    },
    identification: {
      type: String,
      required: true,
      trim: true,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    profession: {
      type: String,
      required: true,
      trim: true,
    },
    qrCode: {
      type: String,
    },

    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      required: () => !this.tel,
    },
    tel: {
      type: String,
      trim: true,
      unique: true,
      lowercase: true,
      required: () => !this.email,
    },
    sexe: {
      type: String,
      required: true,
      trim: true,
    },
    heure: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "",
    },
    average: {
      type: String,
      default: "",
    },
    souscription: {
      type: String,
      default: "",
    },

    idVerified: {
      type: String,
      trim: true,
      default: "",
    },
    dateVerified: {
      type: String,
      trim: true,
      default: "",
    },
    resetPasswordToken: {
      type: String,
      default: "",
    },
    resetPasswordExpires: {
      type: Date,
      default: "",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isAdminPupitre: {
      type: Boolean,
      default: false,
    },
    picture: {
      type: String,
      default: "../image/user/user.png",
    },
    payementId: {
      type: String,
      default: "",
    },
    payementIncrement: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);
userSchema.plugin(unique_validator);

module.exports = mongoose.model("user", userSchema);
