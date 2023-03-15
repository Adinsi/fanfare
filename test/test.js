const now = new Date();
const dayOfWeek = now.getDay(); // 0 pour dimanche, 1 pour lundi, etc.
const hour = now.getHours();
const minute = now.getMinutes();
const async_handler = require(`express-async-handler`);
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

// console.log(
//   now,
//   dayOfWeek,
//   hour,
//   minute,
//   now + 24 * 60 * 60 * 1000,
//   new Date(Date.now() + 24 * 60 * 60 * 1000 * 7)
// );

function formatDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}
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
/**Valider la transaction */
const validateTransaction = async_handler(async (req, res) => {
  /**Si l'id est vérifez alors on met à jour le champ idVerified en mettant 1 */
  try {
    /**Renvoyer le borderau à notre user avec les informations comme son nom complet, l'id de transaction */
    function getTimestampMinusNumber(num) {
      const currentDate = new Date();
      const timestamp = Math.floor(currentDate.getTime() / 1000); // convertir en secondes
      const result = timestamp - num;

      // formater en nombre à 10 chiffres en ajoutant des zéros en début si nécessaire
      const formattedResult = String(result).padStart(10, "0");

      return Number(formattedResult);
    }

    const doc = new PDFDocument();
    const filePath = path.join(
      __dirname,
      "../client/public/borderau",
      `test_carte.pdf`
    );
    doc.pipe(fs.createWriteStream(filePath));
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("Bordereau de paiement", { align: "left" });
    doc.moveDown();
    doc.font("Helvetica").fontSize(12);

    // Ajout des informations de l'entreprise
    doc.text(`La Grâce Parle`, {
      align: "left",
    });
    doc.text(
      `Reference du compte: #acc_9820942086    N° Recu:nrct${getTimestampMinusNumber(
        9876543211
      )}`
    );
    doc.text(
      `Lot 1515 Maison Jesus est rois                            Reference: tlx_${getTimestampMinusNumber(
        1234567891
      )}`
    );
    doc.text(
      `+229 53 03 78 32                                                Id Transaction: 1234567891`
    );
    doc.text(
      `adinsiabdias@gmail.com                                     Date:19/02/2023`
    );
    doc.text(`Moyen de paiement: MTN-Mobile Money`, {
      align: "right",
    });

    doc.moveDown();

    // Ajout des détails du paiement
    doc.text(`Payé par : `);

    doc.text(`ADINSI Abdias`, {
      align: "left",
    });
    doc.text(`adinsiabdias@gmail.com`, {
      align: "left",
    });

    doc.moveDown();

    // Ajout des informations du client

    doc.text(`1500 payé par Adinsi Abdias`, { align: "center" });

    // Finalisation du document PDF
    doc.end();
    /** */
    const mailOptions = {
      from: `La grâce parle <${process.env.USER}>`,
      to: "adinsichristem@gmail.com",
      subject: "Borderau de paiement",

      text: "Votre borderau de paiement de votre carte numérique d'identification",
      attachments: [
        {
          // path: fileName,
          filename: `test_carte.pdf`,
          path: path.join(
            __dirname,
            "../client/public/borderau",
            `test_carte.pdf`
          ),
          contentType: "application/pdf",
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        // return res.status(500).json({ message: `Envoi d'émail a échoué` });
        console.log("Envoi d'émail a échoué");
      } else {
        /**Réponse finale */
        // return res.status(200).json({ message: `Envoi d'émail réussie` });
        console.log("Envoi d'émail a réussie");
      }
    });
  } catch (error) {
    // return res.status(500).json({ message: "Erreur interne du serveur" });
    console.log("Erreur interne du serveur" + error);
  }
});

// validateTransaction();
