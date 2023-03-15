const mongoose = require("mongoose");
const mongoose_sanitize = require("mongoose-sanitize");
const unique_validator = require("mongoose-unique-validator");
const partitionSchema = mongoose.Schema(
  {
    posterId: { type: String, required: true },
    title: { type: String, required: true, trim: true, uppercase: true },
    auteur: { type: String, required: true },
    gamme: { type: String, required: true },
    partition: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);
partitionSchema.plugin(unique_validator);

module.exports = mongoose.model("partition", partitionSchema);
