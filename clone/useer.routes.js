const router = require("express").Router();
const auth_controller = require("../controller/user.controler");
const fedapy_controler = require("../controller/fedpay");
const middleware = require("../middlewre/verify.token");
const qrCode = require("../controller/qrcode.controler");
const multer = require("multer");
/*Multer callback function */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./client/public/image/user");
  },

  filename: (req, file, cb) => {
    cb(null, `${req.body.name}.jpg`);
  },
});
const uploads = multer({ storage: storage });

const storageCompletly = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./client/public/image/user/signature");
  },

  filename: (req, file, cb) => {
    cb(null, `${req.body.name}.pdf`);
  },
});
const uploadsCompletly = multer({ storage: storageCompletly });
router.post("/pay", fedapy_controler.payWithFedapy);
//Auth router
router.post("/register", auth_controller.register); //ok
router.get("/qrcode", qrCode.getAllcodeQr);
router.post("/pdf/get/:id", auth_controller.generatePdf);
router.post("/verified/:id", auth_controller.verifiedTransaction);
router.post(
  "/validate",
  // uploadsCompletly("validate"),
  auth_controller.validateTransaction
);
router.get(
  "/receive/:id",
  // uploadsCompletly("validate"),
  auth_controller.receiveTransaction
);
router.get(
  "/jwt",
  // middleware.verifyToken,
  // auth_controller.getUser,
  middleware.verifySession,
  middleware.getProfil
); //ok
router.post("/liste/:userId", auth_controller.updateUserStatus);
router.get("/liste", auth_controller.sendPdfListe);

//ok
router.put("/users/:userId/status", auth_controller.updateStatus);
router.post("/login", auth_controller.login); //ok
router.post("/qrcode", qrCode.generateCode);
router.post("/forget", auth_controller.forgetPassword); //ok
router.put("/reset/:token", auth_controller.resetPassword); //a faire demain
router.post("/logout", middleware.verifySession, auth_controller.logOut); //ok
router.get("/user_info/:id", auth_controller.userInfo); //ok
// router.post("/pay", auth_controller.fedaPay);
router.put(
  "/update/:id",
  middleware.verifySession,
  auth_controller.update_profil
); // a faire demain
router.delete(
  "/delete/:id",
  middleware.verifySession,
  auth_controller.deleteUser
);
router.post(
  "/upload",
  uploads.single("user"),
  // middleware.verifyToken,
  // middleware.verifySession,
  auth_controller.upload_profil
); //ok

router.get(
  "/",
  // middleware.verifySession,
  auth_controller.getAllUsers
); //a faire demain

module.exports = router;
