const User = require("../modeles/user");
const jwt = require("jsonwebtoken");
const sendEmail = require(`../utils/send.email`);
const crypto = require(`crypto`);
const validator = require(`validator`);
const async_handler = require(`express-async-handler`);

module.exports.verifyToken = async_handler(async (req, res, next) => {
  /**Récuperer le cookie */
  const cookies = req.headers.cookie;
  const token = cookies?.split("=")[1];
  /**Si aucun n'existe, renvoyer une erreur  */
  try {
    if (!token) {
      return res
        .status(404)
        .json({ message: "Vous n'avez pas de token d'authentification" });
    }
  } catch (error) {
    return res.status(500).json({
      message:
        "Erreur interne du serveur, veuillez vérifiez votre connexion internet",
    });
  }
  /**On vérifie si le cookie présent est celle qu'on avait générer lors de l'authentification */

  jwt.verify(String(token), process.env.TOKEN_SECRETE, (err, user) => {
    if (!err) {
      // return res.status(400).json({ message: "Votre Token est invalide." });
      req.id = user?.id;
    }
  });
  next(); /**Passer au controleur suivant */
});

/**Middelware pour vérifez si c'est bien la session */
module.exports.verifySession = async_handler(async (req, res, next) => {
  if (!req.session.user) {
    // Si l'utilisateur n'est pas authentifié, on redirige vers la page de connexion
    res.redirect("/login");
  } else {
    // Si l'utilisateur est authentifié, on continue l'exécution de la requête
    next();
  }
});

/**Middleware pour récuperer les information du client lorsque c'est dans la session on stocke ses informations */
module.exports.getProfil = async_handler(async (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.status(401).send("Unauthorized");
  }

  return res.status(200).json({ user });
});
/**Renvoyer les infos de l'utilisateur après avoir vériifez le token présent dans le cookie */
module.exports.getUser = async_handler(async (req, res) => {
  const userId = req.id;
  let user;
  try {
    user = await User.findById(userId, "-password");
  } catch (error) {
    return new Error(error);
  }
  try {
    if (user) {
      return res.status(200).json({ user });
    }
  } catch (error) {
    res.status(404).json({ message: "L'utilisateur n'existe pas" });
  }
});
