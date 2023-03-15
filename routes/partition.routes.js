const router = require("express").Router();
const partition_controler = require("../controller/partition.controller");
const middleware = require("../middlewre/verify.token");
const multer = require("multer");

const storages = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./client/public/partition");
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  },
});
const uploads = multer({ storage: storages });
router.get("/read", partition_controler.readPartition); /**Lire une partition */
router.post(
  "/create",
  uploads.single("partition"),
  middleware.verifyToken,
  partition_controler.createPartition
); /**Créer une partition */

module.exports = router;
