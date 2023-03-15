const User = require(`../modeles/user`);
const mongoose = require(`mongoose`);
const bcrypt = require(`bcrypt`);
const jwt = require(`jsonwebtoken`);
const ObjectdId = mongoose.Types.ObjectId;
const sendEmail = require(`../utils/send.email`);
const crypto = require(`crypto`);
const validator = require(`validator`);
const async_handler = require(`express-async-handler`);
const setAllMajWords = require(`../utils/set.all.majword`);
const qrCode = require("qrcode");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const path = require("path");
const Fedapay = require("fedapay");

const session = require("express-session");
const moment = require("moment");

const {
  dateForgetPassword,
  dateLoginError,
  payementDate,
} = require("../utils/date");
const transporter = nodemailer.createTransport({
  host: process.env.HOST,
  service: process.env.SERVICE,
  port: Number(process.env.EMAIL_PORT),
  secure: Boolean(process.env.SECURE),
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
});
/* Inscription d'un utiulisateur */
module.exports.register = async_handler(async (req, res) => {
  let user;
  const {
    firstName,
    lastName,
    partition,
    instrument,
    profession,
    password,
    tel,
    email,
    sexe,
  } = req.body;
  /*1 - Verifiez d'abord s'il s'est déja inscrit, il cherchera l'email ou le phone lors de l'insertion dans la bd puisqu'il est unique par utulisateur. L'erreur sera recuperer dans le bloc catch*/

  try {
    user = await User.findOne({ $or: [{ email }, { tel }] });
  } catch (error) {
    res.status(500).json({
      message: `Erreur interne du serveur, veuillez réessayer plus tard ! `,
    });
  }
  if (user)
    return res.status(403).json({
      message: `L'utilisateur avec cet email ou tél existe déjà. Veuillez-vous connectez`,
    });

  /*2 - Vérifiez maintenant si les données saisir respecte notre schéma de validation */
  if (!validator.isLength(firstName, { min: 2, max: 15 }))
    return res.status(401).json({
      message: `Saisissez un nom valide pour vous inscrire.`,
    });
  if (!validator.isLength(lastName, { min: 2, max: 35 }))
    return res.status(401).json({
      message: `Saisissez un prénom valide pour vous inscrire.`,
    });

  if (!validator.isEmail(email))
    return res.status(401).json({
      message: `Saisissez un adress mail valide pour vous inscrire.`,
    });

  if (validator.isEmpty(profession))
    return res.status(401).json({
      message: `Saisissez une profession valide.`,
    });
  if (validator.isEmpty(sexe)) {
    // Si le champ est vide, renvoyer une erreur avec Validator
    return res.status(401).json({
      message: `Cocher la case sexe.`,
    });
  }
  if (!validator.isLength(tel, { min: 8, max: 8 }))
    return res.status(401).json({
      message: `Saisissez un numéro de téléphone du Bénin valide sans espace. Ex : 53000000`,
    });
  if (
    !validator.isLength(password, {
      min: 5,
      max: 15,
    })
  )
    return res.status(401).json({
      message: `Choisissez un mot de passe à 6 caractère minimum`,
    });

  /* 3 - Crypter le mot de passe avec bcrypt avant l'insertion dans la bd , générer un code à 4 chiffre d'identification */

  function generateCode() {
    let code = "";
    for (let i = 0; i < 3; i++) {
      code += Math.floor(Math.random() * 10);
    }
    return code;
  }
  const identification = 0 + generateCode();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const data = `${setAllMajWords(true, firstName)} ${setAllMajWords(
    true,
    lastName
  )} est membre du groupe fanfare la grâce qui parle, il joue au ${instrument}. Son numéro matricule est : GQP${identification}
 `;
  /**Génerer un code qr */
  try {
    qrCode.toDataURL(data, async (err, url) => {
      if (err)
        return res.status(500).json({
          message: "Erreur interne du serveur, veuillez réessayer plus tard",
        });
      function isAdmin() {
        if (email === process.env.USER) return true;
      }
      const user = await new User({
        firstName,
        lastName: setAllMajWords(true, lastName),
        names: `${firstName.toUpperCase()} ${setAllMajWords(true, lastName)}`,
        partition,
        instrument,
        profession: setAllMajWords(true, profession),
        identification: `${identification}`,
        tel,
        sexe,
        email,
        password: hashedPassword,
        qrCode: url,
        isAdmin: isAdmin(),
      });
      user.save();
      /**Template html pour l'envoi du code à l"email de l'user */
      fs.readFile("./template/register.html", "utf-8", async (err, data) => {
        if (err) {
          return res.status(401).json({ message: err });
        } else {
          const html = data
            .replace(/{name}/g, firstName)
            .replace(/{code}/g, identification);

          await sendEmail(user.email, `Code numérique d'identification`, html);
        }
      });
      return res.status(201).json({
        message: `Nous venons d'envoyer un code à 4 chiffre à votre adresse mail que vous devrez mémoriser`,
      });
    });
  } catch (error) {
    res.status(403).json({
      message: `Erreur interne du serveur, veuillez réessayer plus tard ${error}`,
    });
  }
});

/*Connexion d'un utulisateur*/
module.exports.login = async_handler(async (req, res) => {
  const { identifier, password } = req.body;

  /*1 - Vérifiez maintenant si les données saisir respecte notre schéma de validation */
  if (!identifier || !password)
    return res
      .status(401)
      .json({ message: `Veuillez remplir toutes les cases.` });

  /*2- Récuperer l'email ou le numéro de phone */
  let existingUser;
  if (validator.isEmail(identifier)) {
    existingUser = { email: identifier };
  } else if (validator.isMobilePhone(identifier, `any`)) {
    existingUser = { tel: identifier };
  } else
    return res.status(400).json({
      message: `Veuillez saisir une adresse mail ou un numéro de téléphone valide.`,
    });

  User.findOne(existingUser)
    .then((user) => {
      if (!user)
        return res.status(401).json({
          message: `Vous n'avez pas de compte avec ces informations d'identification, veuillez vous inscrire en premier.`,
        });
      /*Vérifiez si quelqu'un à déja initialisé un changement de mot de passe */
      if (user.resetPasswordExpires !== null)
        return res.status(401).json({
          message: `Veuillez changer votre mot de passe pour des raisons de sécurité si vous n'êtes pas l'auteur de la procédure de changement du mot de passe du ${dateLoginError(
            user.resetPasswordExpires
          )}`,
        });

      /* 3 - Décrypter le mot de passe avant de le vérifiez avec celle de la base de donnée qvec bcrypt*/
      const passwordHashed = bcrypt.compareSync(password, user.password);
      if (!passwordHashed) {
        return res
          .status(401)
          .json({ message: `Votre mot de passe est incorrect.` });
      }

      req.session.user = user;

      const token = jwt.sign({ id: user._id }, process.env.TOKEN_SECRETE, {
        expiresIn: `7d`,
      });

      /* 5 - Envoyer la réponse dans le cookie */

      // res.cookie(String(user._id), token, {
      //   path: `/`, // Path cookie
      //   expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      //   httpOnly: true, //Only server
      //   sameSite: `lax`, //cross site
      //   // secure: true, // https
      // });

      return res
        .status(200)
        .json({ message: `Connection réussie`, user, token });
    })
    .catch((err) => {
      return res.status(500).send({
        message: `Erreur interne du serveur, veuillez réessayez plus tard`,
      });
    });
});

/*forget password */
module.exports.forgetPassword = async_handler(async (req, res) => {
  const { email } = req.body;

  let existingUser;
  if (!validator.isEmail(email))
    return res.status(401).json({ message: `Saisissez un adress mail` });
  if (validator.isEmpty(email))
    return res.status(401).json({
      message: `Le champ email est vide`,
    });
  try {
    existingUser = await User.findOne({
      email: email,
    });
  } catch (error) {
    res.status(500).json({
      message: `Erreur interne du serveur,veuillez reprendre l'opération du changement du mot de passe`,
    });
  }
  if (!existingUser)
    return res.status(401).json({
      message: `Vérifiez bien l'émail avec lequel vous vous êtes inscrit`,
    });

  const resetToken = jwt.sign(
    { _id: existingUser._id },
    process.env.FORGET_PASSWORD_KEY,
    {
      expiresIn: 3600,
    }
  );

  await existingUser.updateOne({
    resetPasswordToken: resetToken,
    resetPasswordExpires: Date.now() + 3600000, //expires 1h
  });
  try {
    const url = `${process.env.CLIENT_URL}/reset/${resetToken}`;
    //   await sendEmail(
    //     existingUser.email,
    //     `Changer votre mot de passe`,
    //     `
    //      <div style="background-color: #FFFFFF;margin:auto;font-family:'Montserrat', sans-serif;@import url('https://fonts.cdnfonts.com/css/montserrat');max-height: 400px;width: 100%;text-align: center; " class="container">
    //   <h1>Confirmez votre adresse e-mail pour changer votre mot de passe</h1>
    //   <p>Appuyez sur le bouton ci-dessous pour confirmer votre adresse e-mail. Si vous n'avez pas créé de compte avec , vous pouvez supprimer cet e-mail en toute sécurité.</p>
    //   <p>Ce lien <b> expire dans un délai de 1h</b></p>
    //   <button style="background-color: #1A82E2;border:none;padding:15px;border-radius: 10px;cursor:pointer;">  <a style="color: black;" href=${url}> Cliquez sur ce lien pour changer votre mot de passe</a></button>
    //   <p>Si cela ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur : ${url}</p>

    // </div>
    //     `
    //   );
    fs.readFile("./template/reset_password.html", "utf-8", (err, data) => {
      if (err) {
        console.error(err);
      } else {
        const html = data
          .replace(/{name}/g, existingUser.lastName)
          .replace(/{reset_link}/g, url);

        sendEmail(existingUser.email, `Réinitialisation de mot de passe`, html);
      }
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: `L'envoi d'email à échoué, veuillez recommencer` });
  }
  const threeFirstWord = existingUser.email;
  res.status(200).json({
    message: `Nous venons d'envoyer un lien du changement du mot de passe par e-mail à ${threeFirstWord.substr(
      0,
      8
    )}*****@gmail.com. Vérifiez dans vos Spams si vous ne retrouvez par l'email. Le code expirera ce ${dateForgetPassword(
      new Date(Date.now() + 60 * 60 * 1000)
    )}`,
  });
});

/*Change password */
module.exports.resetPassword = async_handler(async (req, res) => {
  const { newPass } = req.body;
  try {
    const decoded = jwt.verify(
      req.params.token,
      process.env.FORGET_PASSWORD_KEY
    );
    const user = await User.findById(decoded._id);
    if (!user)
      return res.status(403).json({
        message: ` Votre lien de vérification à probablement expirer ou a déjà été cliquer. Veuillez recommencer le processus de changement du mot de passe.
`,
      });
    if (user.resetPasswordExpires < Date.now()) {
      return res
        .status(403)
        .json({ message: "Le jeton de réinitialisation a expiré" });
    }

    if (validator.isEmpty(newPass))
      return res.status(401).json({
        message: `Le champ mot de passe est vide`,
      });
    if (!validator.isLength(newPass, { min: 6 }))
      return res.status(401).json({
        message: `Votre mot de passe doit contenir au moins 6 caractères`,
      });
    const hashedPassword = bcrypt.hashSync(newPass, 10);
    await user.updateOne({
      resetPasswordToken: ``,
      resetPasswordExpires: ``,
      password: hashedPassword,
    });
  } catch (error) {
    return res.status(400).json({
      message: ` Votre lien de vérification à probablement expirer ou a déjà été cliquer. Veuillez recommencer le processus de changement du mot de passe. ${error}
`,
    });
  }
  return res.status(200).json({
    message:
      "Votre mot de passe a été changé avec succès. Veuillez-vous connectez à présent avec le nouveau mot de passe.",
  });
});

/*Recuperer les données avec l'id */
module.exports.userInfo = async_handler(async (req, res) => {
  if (!ObjectdId.isValid(req.params.id)) {
    return res.status(400).json({ message: `L'identifiant n'existe pas` });
  }
  try {
    let user;
    user = await User.findById({ _id: req.params.id });
    if (!user)
      return res.status(403).json({ messsage: `L'identifiant n'existe pas` });

    User.findById(req.params.id, (err, docs) => {
      if (!err) res.status(200).json(docs);
      else
        return res.status(400).json({
          message: `L'identifiant n'existe pas`,
        });
    }).select(`-password`);
  } catch (error) {}
});

/*Recuperer les données d'un utulisateur aprés avoir verifez son token  */
module.exports.getUser = async_handler(async (req, res) => {
  const userId = req.id;
  let user;
  if (!ObjectdId.isValid(userId))
    return res.status(400).json({ message: `Utulisateur inconnu ` });

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
    res.status(404).json({ message: "L'utilisateur n'existe pas" + error });
  }
});

/*Supprimez un utulisateur */
module.exports.deleteUser = async_handler(async (req, res) => {
  if (!ObjectdId.isValid(req.params.id)) {
    return res
      .status(400)
      .json({ message: `Utulisateur inconnu` + req.params.id });
  }

  try {
    let user;
    user = await User.findById({ _id: req.params.id });
    if (!user)
      return res.status(403).json({ messsage: `L'identifiant n'existe pas` });

    await User.findByIdAndRemove(req.params.id, (error, docs) => {
      if (!error)
        res
          .status(200)
          .json({ message: `L'utulisateur supprimez avec succèes` });
      else
        return res.status(500).json({
          message: `Erreur interne du serveur, veuillez vérifiez votre connexion internet`,
        });
    });
  } catch (error) {
    // res.status(500).json({ message: error });
  }
});

/*Recuperer touts les utilisateurs */
module.exports.getAllUsers = async_handler(async (req, res) => {
  User.find((error, docs) => {
    if (!error) res.send(docs);
    else
      return res.status(500).json({
        message: `Vous pouvez pas récuperer les données`,
      });
  }).select(`-password`);
});

/*Mettre a jour son profil */
module.exports.update_profil = async_handler(async (req, res) => {
  const { firstName, lastName, tel, email } = req.body;
  if (!ObjectdId.isValid(req.params.id))
    return res.status(404).send({ messsage: `Utulisateur inconnu` });
  /*2 - Vérifiez maintenant si les données saisir respecte notre schéma de validation */

  if (!validator.isEmail(email))
    return res.status(401).json({ message: `Votre adress email est invalid` });
  if (!validator.isLength(tel, { min: 8, max: 8 }))
    return res.status(401).json({
      message: `Saisissez un numéro de téléphone du Bénin valide sans espace. Ex : 53000000`,
    });
  let user;
  user = await User.findById({ _id: req.params.id });
  if (!user)
    return res.status(403).json({ messsage: `L'identifiant n'existe pas` });

  try {
    User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          firstName: firstName,
          lastName: setAllMajWords(true, lastName),
          tel: tel,
          email: email,
          names: `${firstName.toUpperCase()} ${setAllMajWords(true, lastName)}`,
        },
      },
      {
        new: true,
      },
      (err, docs) => {
        if (!err) return res.status(200).json(docs);
        else res.status(500).json({ message: err });
      }
    ).select(`-password`);
  } catch (error) {
    res.status(500).json({
      message: `Erreur interne du serveur, veuillez réessayer plus tard !'`,
    });
  }
});

/*Changer le profil par défaut */
module.exports.upload_profil = async_handler(async (req, res) => {
  if (req.file?.size > 1000000)
    return res.status(404).json({
      message: `La taille du fichier ne devrait pas dépasser 10 Mo, veuillez en choisir un autre`,
    });

  if (
    req.file?.mimetype != `image/jpeg` &&
    req.file?.mimetype != `image/jpg` &&
    req.file?.mimetype != `image/png`
  )
    return res.status(404).json({
      message: `Veuillez choisir un autre format de fichier(.jpg, .jpeg, .png)`,
    });
  let user;
  if (!ObjectdId.isValid(req.body.userId))
    return res.status(404).json({ messsage: `L'identifiant n'existe pas` });

  try {
    user = await User.findById({ _id: req.body.userId });
    if (!user)
      return res.status(403).json({ messsage: `L'identifiant n'existe pas` });

    await User.findByIdAndUpdate(
      req.body.userId,
      {
        $set: { picture: `../image/user/${req.body.name}.jpg` },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
      (error, docs) => {
        if (!error) return res.status(200).json(docs);
        else return res.status(500).json({ message: error });
      }
    );
  } catch (error) {
    // return res.status(500).json({ message: error });
  }
});
/*Déconnecter du site */
module.exports.logOut = async_handler(async (req, res) => {
  /**Vérifez si la session user existe et le supprimez du navigateur */
  if (req.session.user) {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json(error);
      }
      /**Supprimez la session */
      res.clearCookie("connect.sid");
      // res.redirect("/login");
      return res.status(200).json({ message: "Déconnexion" });
    });
  }
});
/*Déconnecter du site */
module.exports.logOut = async_handler(async (req, res) => {
  // const cookies = req.headers.cookie;
  // const preventToken = cookies?.split(`=`)[1];
  // if (!preventToken) {
  //   return res
  //     .status(404)
  //     .json({ message: `Déconnexion échouée, veuillez réessayer plus tard` });
  // }
  // jwt.verify(String(preventToken), process.env.TOKEN_SECRETE, (err, user) => {
  //   if (err) {
  //     return res.status(400).json({ message: `Authentification échoué` });
  //   }
  //   res.clearCookie(`${user.id}`);
  //   req.cookies[`${user._id}`] = ``;
  //   return res.status(200).json({ message: `Déconnexion` });
  // });

  /**Session */
  if (req.session.user) {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json(error);
      }

      res.clearCookie("connect.sid");
      // res.redirect("/login");
      return res.status(200).json({ message: "Déconnexion" });
    });
  }
});

module.exports.generatePdf = async_handler(async (req, res) => {
  /*Chercher l'utulisateur avec son id */
  if (!ObjectdId.isValid(req.params.id)) {
    return res
      .status(400)
      .json({ message: `L'identifiant n'existe pas ` + req.params.id });
  }
  let user;
  try {
    user = await User.findById({ _id: req.params.id });
    if (!user)
      return res.status(403).json({ messsage: `L'identifiant n'existe pas` });

    //   `./client/public/image/user/file/${user.names}.pdf`,
    //   `
    //   ${user.names}
    //   `,
    //   (err) => {
    //     if (err) throw err;
    //     console.log("Saved");
    //   }
    // );
    // Create PDF file with user details
    // const pdfDoc = new PDFDocument();
    // const fileName = `${user.firstName}-${user.lastName}.pdf`;
    // pdfDoc.pipe(fs.createWriteStream(fileName));
    // // pdfDoc.text("Hello World", { fillColor: [255, 0, 0] });
    // pdfDoc.table(
    //   [
    //     { name: "John Doe", age: 25, city: "New York" },
    //     { name: "Jane Doe", age: 30, city: "London" },
    //   ],
    //   {
    //     layout: "lightHorizontalLines",
    //     margins: { left: 100, top: 150 },
    //     headerRows: 1,
    //     columnStyles: {
    //       age: { fillColor: 200 },
    //     },
    //   }
    // );

    // pdfDoc.image("image.jpg", { fit: [250, 300], align: "center" });
    // pdfDoc.end();
    const doc = new PDFDocument();
    const fileName = `règlement.pdf`;
    doc.pipe(fs.createWriteStream(fileName));

    doc
      .text("Les règlement à suivre", {
        align: "center",
        underline: true,
      })
      .text(
        `Responsabilités de chaque membre : Chaque membre du groupe est responsable de sa participation aux répétitions et aux performances, ainsi que de la préparation et de l'apprentissage des chansons.`
      )
      .text(
        `
        2-Horaires de répétition : Les répétitions auront lieu à un horaire convenu à l'avance et seront obligatoires pour tous les membres. Les absences doivent être signalées à l'avance et justifiées.

`
      )
      .text(
        `
        3-Matériel : Chaque membre est responsable de son propre matériel et doit veiller à ce qu'il soit en bon état de fonctionnement pour les répétitions et les performances.

`
      )
      .text(
        `
        4-Arrangements de performances : Les arrangements pour les performances, y compris les dates, les lieux et les horaires, seront discutés et convenus en groupe. Les membres doivent être disponibles pour toutes les performances prévues.

`
      )
      .text(
        `
        5-Règles de conduite : Tous les membres doivent se comporter de manière professionnelle et respectueuse envers les autres membres du groupe, les fans et les employeurs. Les comportements inappropriés, tels que l'utilisation de drogues ou d'alcool avant ou pendant les performances, ne sont pas tolérés.

`
      )
      .text(
        `
        6-Décisions en groupe : Les décisions importantes concernant le groupe seront prises en considérant les opinions et les idées de tous les membres.

`
      )
      .text(
        `
        7-Modification du règlement intérieur : Ce règlement intérieur peut être modifié à tout moment si cela est nécessaire pour le bon fonctionnement du groupe

`
      );

    doc.end();

    const mailOptions = {
      from: `La grâce qui parle <${process.env.USER}>`,
      to: user.email,
      subject: "Test email with PDF attachment",
      text: "This is a test email with PDF attachment",
      attachments: [
        {
          path: fileName,
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to send email" });
      } else {
        console.log("Email sent: " + info.response);
        return res.status(200).json({ message: "Email sent successfully" });
      }
    });

    // res.status(200).send(user);
  } catch (error) {
    return res.status(500).json({ message: error });
  }
});

module.exports.fedaPay = async_handler(async (req, res) => {
  const user = await User.findById(req.body.userId);

  if (!user) {
    return res.status(400).send({ error: "User not found" });
  }

  const fedapay = new Fedapay({
    publicKey: "pk_live_okifKyWvteorqmW2dHT4ayYV",
    secretKey: "sk_live_edewBnE6ueDGbkstvdTa45MZ",
    environment: "test", // use 'production' in production
  });

  const charge = await fedapay.charges.create({
    amount: req.body.amount,
    email: user.email,
    order_id: `ORDER_ID_${user._id}`,
    currency: "XOF",
  });

  if (charge.status === "success") {
    user.verified = true;
    await user.save();
    return res.send({ message: "Payment successful" });
  } else {
    return res.status(400).send({ error: "Payment failed" });
  }
});

module.exports.verifiedTransaction = async_handler(async (req, res) => {
  const { idVerified } = req.body;
  /*Vérifier si l-id respect les normes de mongoose */
  const id = req.params.id;
  if (!ObjectdId.isValid(id)) {
    return res.status(400).json({ message: `L'identifiant n'existe pas` });
  }
  /*Vérifiez si l'id est de 10 chiffre */
  if (!validator.isLength(idVerified, { min: 10, max: 10 }))
    return res.status(401).json({
      message: `l'id de transaction n'est pas coorrect. Saissisez bien les chiffres`,
    });
  /**Vérifiez si l'identifiant existe */
  let user;
  try {
    user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          idVerified: idVerified,
        },
      },
      {
        new: true,
      },
      (err, docs) => {
        if (!err)
          return res.status(200).json({
            message:
              "Nous vérifions votre id de transaction, vous aurez une suite de réponse dans les 24h maximum",
          });
        else
          res.status(500).json({
            message: "Erreur interne du serveur, veuilllez réessayez plus tard",
          });
      }
    );
  } catch (error) {}
});

module.exports.validateTransaction = async_handler(async (req, res) => {
  const { idUser, idTransaction } = req.body;
  /*Vérifiez si l'id passé est dans notre base de donné */
  let user;
  if (!ObjectdId.isValid(idUser)) {
    return res
      .status(400)
      .json({ message: `L'identifiant n'existe pas ${idUser}` });
  }
  user = await User.findById({ _id: idUser });

  if (!user)
    return res.status(400).json({
      message: "Transaction non éffectué",
    });
  try {
    if (user.idVerified === idTransaction) {
      await user.updateOne({
        idVerified: "1",
      });

      const doc = new PDFDocument();
      const filePath = path.join(
        __dirname,
        "../borderau",
        `${user.names}_carte.pdf`
      );
      const fileName = `${user.names}_carte.pdf`;
      // doc.pipe(fs.createWriteStream(fileName));
      doc.pipe(fs.createWriteStream(filePath));

      // doc.text("Bordereau de paiement", { align: "center" });
      // doc.moveDown();
      // doc.text(`Montant payé : 1500`, { align: "left" });
      // doc.text(
      //   `Date de paiement : ${payementDate(
      //     new Date(Date.now() - 60 * 60 * 1000 * 24)
      //   )}`,
      //   {
      //     align: "left",
      //   }
      // );
      // doc.text(`Numéro de facture : ${Date.now()}`, {
      //   align: "left",
      // });

      // doc.end();
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .text("Bordereau de paiement", { align: "center" });
      doc.moveDown();
      doc.font("Helvetica").fontSize(14);

      // Ajout des informations de l'entreprise
      doc.text(`Nom de l'entreprise : Grâce Qui Parle`, {
        align: "left",
      });
      doc.text(`Adresse : Jéricho voie allant vers Ananas sodji`, {
        align: "left",
      });
      doc.text(`Téléphone : 53037832`, { align: "left" });

      doc.moveDown();

      // Ajout des détails du paiement
      doc.text(`Montant payé : 1500 f`, { align: "left" });
      doc.text(
        `Date de paiement :${payementDate(
          new Date(Date.now() - 60 * 60 * 1000 * 24)
        )}`,
        { align: "left" }
      );
      // doc.text(`Numéro de facture :  ${Date.now()}`, {
      //   align: "left",
      // });
      doc.text(`Numéro de facture : ${idTransaction}`, {
        align: "left",
      });
      doc.text(`Méthode de paiement :Fedapay`, {
        align: "left",
      });

      doc.moveDown();

      // Ajout des informations du client
      doc.text(`Nom du client : ${user.names}`, { align: "left" });
      doc.text(`Instrument : ${user.instrument}`, { align: "left" });
      doc.text(`Téléphone : ${user.tel}`, { align: "left" });

      // Finalisation du document PDF
      doc.end();
      const mailOptions = {
        from: `La grâce qui parle <${process.env.USER}>`,
        to: user.email,
        subject: "Test email with PDF attachment",
        text: "This is a test email with PDF attachment",
        attachments: [
          {
            // path: fileName,
            filename: `${user.names}_carte.pdf`,
            path: path.join(
              __dirname,
              "../borderau",
              `${user.names}_carte.pdf`
            ),
            contentType: "application/pdf",
          },
        ],
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          return res.status(500).json({ message: "Failed to send email" });
        } else {
          console.log("Email sent: " + info.response);
          return res.status(200).json({ message: "Email sent successfully" });
        }
      });
    } else {
      await user.updateOne({
        idVerified: "0",
      });
      return res.status(400).json({ message: "Non vérifiez" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur interne du serveur" + error });
  }
});
module.exports.receiveTransaction = async_handler(async (req, res) => {
  /*Vérifiez si l'id passé est dans notre base de donné */
  let user;
  if (!ObjectdId.isValid(req.params.id)) {
    return res.status(400).json({ message: `L'identifiant n'existe pas ` });
  }
  user = await User.findById({ _id: req.params.id });

  if (!user)
    return res.status(400).json({
      message: "L'identifiant n'existe pas ",
    });
  try {
    const mailOptions = {
      from: `La grâce qui parle <${process.env.USER}>`,
      to: user.email,
      subject: "Test email with PDF attachment",
      text: "This is a test email with PDF attachment",
      attachments: [
        {
          // path: fileName,
          filename: `${user.names}_carte.pdf`,
          path: path.join(__dirname, "../borderau", `${user.names}_carte.pdf`),
          contentType: "application/pdf",
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to send email" });
      } else {
        console.log("Email sent: " + info.response);
        return res.status(200).json({ message: "Email sent successfully" });
      }
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur interne du serveur" + error });
  }
});

let requestMade = false; // indique si une demande a déjà été faite
let forbiddenDay = false; // indique si le jour et l'heure sont interdits

module.exports.listePresence = async_handler(async (req, res) => {
  let user;
  const { identification } = req.body;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 pour dimanche, 1 pour lundi, etc.
  const hour = now.getHours();
  const minute = now.getMinutes();
  // Vérifie si la demande est interdite (tous les lundis de 17h à 20h30)
  if ((dayOfWeek === 3 && hour < 17) || (hour >= 20 && minute >= 31)) {
    forbiddenDay = true;
    return res
      .status(403)
      .json({ message: "Demande interdite pour aujourd'hui" });
  }

  // Vérifie si l'heure actuelle est avant 19h30 et que la demande n'a pas déjà été faite
  if (
    !forbiddenDay &&
    !requestMade &&
    hour >= 17 &&
    (hour <= 19 || (hour === 19 && minute <= 30))
  ) {
    const status = "A l'heure";
    User.findOneAndUpdate(
      { identification: identification },
      { status: status, heure: now },
      { new: true, upsert: true }
    )
      .then((user) => {
        requestMade = true;
        return res.status(200).json({
          user,
          message: "Success",
        });
      })
      .catch((error) => {
        res.status(500).json({ message: "Erreur serveur" + error });
      });
  }

  // Vérifie si l'heure actuelle est après 19h30 et que la demande n'a pas déjà été faite
  else if (!forbiddenDay && !requestMade && hour >= 19 && minute > 30) {
    const status = "Retard";
    User.findOneAndUpdate(
      { identification: identification },
      { status: status, heure: now },
      { new: true, upsert: true }
    )
      .then((user) => {
        requestMade = true;
        return res.status(200).json({
          user,
          message: "success",
        });
      })
      .catch((error) => {
        return res.status(500).json({ message: "Erreur serveur" + error });
      });
  } else {
    // Si la demande est interdite ou a déjà été faite ou est hors des heures autorisées

    return res
      .status(200)
      .json({ message: "Demande interdite ou impossible pour le moment" });
  }
});

// Contrôleur pour mettre à jour l'état de l'utilisateur
module.exports.updateStatus = async (req, res) => {
  const { userId } = req.params;
  /*Vérifiez si l'id passé est dans notre base de donné */
  let user;
  if (!ObjectdId.isValid(userId)) {
    return res.status(400).json({ message: `L'identifiant n'existe pas ` });
  }

  user = await User.findById(userId);

  // Vérifier si l'utilisateur peut faire la demande maintenant
  const now = moment();
  const start = moment().startOf("day").add(17, "hours");
  const end = moment().startOf("day").add(20, "hours").add(30, "minutes");

  // Convertir lastRequest en objet moment
  const lastRequest = user.lastRequest ? moment(user.lastRequest) : null;

  // Vérifier si l'utilisateur peut faire la demande
  const canMakeRequest =
    !(
      lastRequest &&
      lastRequest.isSameOrAfter(start) &&
      lastRequest.isSameOrBefore(end)
    ) && now.isBetween(start, end);

  // Mettre à jour l'état de l'utilisateur
  if (canMakeRequest) {
    user.status = "présent";
  } else if (now.isBetween(end, moment().startOf("day").add(20, "hours"))) {
    user.status = "retard";
  }
  user.lastRequest = now;
  await user.save();

  // Renvoyer les informations de l'utilisateur
  res.json({
    nom: user.firstName,
    prénom: user.lastName,
    heure: now.format("HH:mm"),
  });
};

module.exports.updateUserStatus = async (req, res) => {
  const now = new Date(); // Récupérez la date et l'heure actuelle

  if (
    now.getDay() === 3 &&
    now.getHours() >= 17 &&
    now.getHours() <= 19 &&
    now.getMinutes() <= 30
  ) {
    // Si la date est un mercredi entre 17h et 19h30

    const update = { heure: now, status: "présent" };

    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.params.userId,
        update,
        { new: true }
      );
      res.json(updatedUser);
    } catch (error) {
      res.status(500).send(error);
    }
  } else if (
    now.getDay() === 3 &&
    now.getHours() >= 19 &&
    now.getMinutes() > 31
  ) {
    // Si la date est un mercredi après 19h30

    const update = { heure: now, status: "en retard" };

    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.params.userId,
        update,
        { new: true }
      );
      res.json(updatedUser);
    } catch (error) {
      res.status(500).send(error);
    }
  } else {
    res
      .status(400)
      .send(
        "Vous ne pouvez pas mettre à jour le statut de l'utilisateur pour le moment."
      );
  }
};

module.exports.sendPdfListe = async_handler(async (req, res) => {
  const now = new Date(); // Récupérez la date et l'heure actuelle
  // if (now.getDay() === 3 && now.getHours() >= 20 && now.getMinutes() > 31) {

  try {
    const users = await User.find({}, "firstName lastName heure status"); // Récupérer tous les utilisateurs avec leurs prénoms, noms, heures et statuts

    // Créer un tableau HTML pour afficher tous les utilisateurs avec leurs prénoms, noms, heures et statuts
    let tableHTML = `
      <table style="width: 210mm; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #ECECEC; border-bottom: 1px solid #CCCCCC; text-align: center;">
      <th style="padding: 2px; border: 1px solid #CCCCCC;">Nom</th>
      <th style="padding: 2px; border: 1px solid #CCCCCC;">Prénom</th>
      <th style="padding: 2px; border: 1px solid #CCCCCC;">Heure d'arrivé</th>
      <th style="padding: 2px; border: 1px solid #CCCCCC;">Statut</th>
    </tr>
        </thead>
        <tbody>
    `;

    users.slice(0, 50).forEach((user) => {
      tableHTML += `
       <tbody>
    <tr style="border-bottom: 1px solid #CCCCCC;">
      <td style="padding: 2px; border: 1px solid #CCCCCC;">${
        user.firstName
      }</td>
      <td style="padding: 2px; border: 1px solid #CCCCCC;">${user.lastName}</td>
      <td style="padding: 2px; border: 1px solid #CCCCCC;">${dateLoginError(
        user.heure
      )}</td>
      <td style="padding: 2px; border: 1px solid #CCCCCC;">${user.status}</td>
    </tr>
    </tbody>

      `;
    });
    tableHTML += `
        </tbody>
      </table>
    `;

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });
    const mailOptions = {
      from: process.env.USER,
      to: process.env.USER,
      subject: "Tableau des utilisateurs de l'application",
      html: tableHTML, // Ajouter le tableau HTML contenant tous les utilisateurs avec leurs prénoms, noms, heures et statuts dans le corps du message
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        res.status(500).send(error);
      } else {
        res.json({
          message: "Le tableau des utilisateurs a été envoyé avec succès.",
        });
      }
    });
  } catch (error) {
    res.status(500).send(error);
  }

  // }
});
