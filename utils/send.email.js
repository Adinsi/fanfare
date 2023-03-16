const nodemailer = require("nodemailer");
const path = require("path");
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
/**Function principale d'envoi d'email */
module.exports.sendEmail = async (email, subject, text) => {
  try {
    await transporter.sendMail({
      from: `La Grâce Parle <${process.env.USER}>`,
      to: email,
      subject: subject,
      html: text,
    });

    console.log("Email envoyé");
  } catch (error) {
    console.log("Email not sent" + error);
  }
};
module.exports.sendPdf = async (email, fileName) => {
  try {
    const mailOptions = {
      from: `La Grâce Parle <${process.env.USER}>`,
      to: email,
      subject: "Le règlement intérieur du centre LGP",
      text: "Le fichier pdf des bonnes conduites à tenir au sein du groupe",
      attachments: [
        {
          filename: fileName,
          path: path.join(__dirname, "../reglement", fileName),
          contentType: "application/pdf",
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res
          .status(500)
          .json({ message: "L'envoi d'émail a échoué,veuillez réessayer" });
      } else {
        return res.status(200).json({
          message:
            "Email envoyé,veuillez vérifer dans votre boîte d'adress mail",
        });
      }
    });

    console.log("Email envoyé");
  } catch (error) {
    console.log("Email not sent" + error);
  }
};
module.exports.borderauSucees = async (email, fileName) => {
  const mailOptions = {
    from: `La Grâce Parle <${process.env.USER}>`,
    to: email,
    subject: "Borderau de paiement",

    text: "Votre borderau de paiement de votre carte numérique d'identification personnelle",
    attachments: [
      {
        // path: fileName,
        filename: fileName,
        path: path.join(__dirname, "../client/public/borderau", fileName),
        contentType: "application/pdf",
      },
    ],
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: `Envoi d'émail a échoué` });
    } else {
      /**Réponse finale */
      return res.status(200).json({ message: `Envoi d'émail réussie` });
    }
  });
};
module.exports.borderauCancel = async (email, fileName) => {
  const mailOptions = {
    from: `La Grâce Parle <${process.env.USER}>`,
    to: email,
    subject: "Transaction non éffectué",
    text: "L'opération de traitement à échoué",
    attachments: [
      {
        filename: fileName,
        path: path.join(
          __dirname,
          "../client/public/borderau/cancel",
          fileName
        ),
        contentType: "application/pdf",
      },
    ],
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: `Envoi d'émail a échoué` });
    } else {
      /**Réponse finale */
      return res.status(200).json({ message: `Envoi d'émail réussie` });
    }
  });
};
