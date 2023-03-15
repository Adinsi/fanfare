const router = require("express").Router();
const auth_controller = require("../controller/user.controler");
const middleware = require("../middlewre/verify.token");
const multer = require("multer");

/*Multer callback function */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./client/build/image/user");
  },

  filename: (req, file, cb) => {
    cb(null, `${req.body.userId}.jpg`);
  },
});
const uploads = multer({ storage: storage });

//Auth router
/**Inscription de l'utilisateur */
router.post("/register", auth_controller.register);
router.post("/souscription/:id", auth_controller.souscription);

/**Reçevoir le pdf du règlément intérieur du groupe fanfare */
router.post(
  "/pdf/get/:id",
  middleware.verifyToken,
  auth_controller.generatePdf
);

/**Envoyer son id de transaction après le payement via Fedapay */
router.post(
  "/verified/:id",
  middleware.verifyToken,
  auth_controller.sendIdTransaction
);

/**Valider la transaction du payement via Fedapay en lui envoyant son borderau de payement */
router.post(
  "/validate",
  middleware.verifyToken,
  auth_controller.validateTransaction
);

/**Recevoir son borderau directement sur le site */
router.get(
  "/receive/:id",
  middleware.verifyToken,
  auth_controller.receiveTransaction
);

/**Vérifiez si son token est valide en renvoyant ses informations sans son mot de passse*/
router.get("/jwt", middleware.verifyToken, middleware.getUser);

/**Faire la liste de présence toutls les lundis à partir de 17h00 à 19h30 */
router.post("/liste/:userId", auth_controller.updateUserStatus);
router.post("/note/:id", auth_controller.Evaluer);

/**La prémière liste de présence de 50 personne */
router.get("/liste", auth_controller.sendPdfListe);
/**La prémière liste d'évaluation */
router.get("/note", auth_controller.sendPdfListeEvaluation);

/**Connexion */
router.post("/login", auth_controller.login);

/**Procédure de changement du mot de passe */
router.post("/forget", auth_controller.forgetPassword);

/**Mettre un nouveau mot de passe */
router.put("/reset/:token", auth_controller.resetPassword);

/**Déconnexion */

router.post("/logout", auth_controller.logOut);

/**Mettre à jour ses informations de profil */
router.put(
  "/update/:id",
  middleware.verifyToken,
  auth_controller.update_profil
);

/**Suppromer un utilisateur de la base de donnée */
router.delete("/delete/:id", auth_controller.deleteUser);

/**Télécharger un fichier de profil */
router.post("/upload", uploads.single("user"), auth_controller.upload_profil);

/**Récuperer touts les utilisateurs */
router.get("/", auth_controller.getAllUsers);

module.exports = router;
